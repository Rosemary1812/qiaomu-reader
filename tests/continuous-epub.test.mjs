import assert from "node:assert/strict";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { foliateElements } from "../scripts/foliate-elements.mjs";

const root = path.resolve(import.meta.dirname, "..");

async function rendererFixture() {
  const dom = new JSDOM("<body><main></main></body>", {
    url: "https://reader.test/", resources: "usable", runScripts: "outside-only",
  });
  const { window } = dom;
  const originalHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, "offsetHeight");
  const originalTop = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, "offsetTop");
  const originalClientHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, "clientHeight");
  const originalScrollHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, "scrollHeight");
  // jsdom does not load iframes inside shadow roots, so give the renderer a
  // real Document and fire the same load event that Chromium/WebKit provide.
  Object.defineProperty(window.HTMLIFrameElement.prototype, "src", { configurable: true,
    set(value) {
      const doc = window.document.implementation.createHTMLDocument();
      const paragraph = doc.createElement("p");
      paragraph.textContent = decodeURIComponent(value.split(",")[1]).match(/<p>([\s\S]*)<\/p>/)?.[1] || "";
      doc.body.append(paragraph);
      Object.defineProperty(doc, "_frame", { value: this });
      Object.defineProperty(this, "contentDocument", { configurable: true, value: doc });
      queueMicrotask(() => this.dispatchEvent(new window.Event("load")));
    },
  });
  Object.defineProperty(window.HTMLElement.prototype, "offsetHeight", { configurable: true, get() {
    if (this.classList?.contains("section")) return parseInt(this.style.height, 10) || 1;
    return originalHeight.get.call(this);
  } });
  Object.defineProperty(window.HTMLElement.prototype, "offsetTop", { configurable: true, get() {
    if (this.classList?.contains("section")) {
      let top = 0;
      for (let el = this.previousElementSibling; el; el = el.previousElementSibling) top += el.offsetHeight;
      return top;
    }
    return originalTop.get.call(this);
  } });
  Object.defineProperty(window.HTMLElement.prototype, "clientHeight", { configurable: true, get() {
    if (this.id === "scroller") return 300;
    return originalClientHeight.get.call(this);
  } });
  Object.defineProperty(window.HTMLElement.prototype, "scrollHeight", { configurable: true, get() {
    if (this.id === "scroller") return [...this.querySelectorAll(".section")]
      .reduce((sum, el) => sum + el.offsetHeight, 0);
    return originalScrollHeight.get.call(this);
  } });
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.classList?.contains("section")) {
      const top = this.offsetTop - this.getRootNode().getElementById("scroller").scrollTop;
      return { top, bottom: top + this.offsetHeight };
    }
    return { top: 0, bottom: this.clientHeight, width: 600, height: this.clientHeight };
  };
  const foliate = foliateElements(root);
  const output = await build({ absWorkingDir: root, stdin: {
    contents: 'export * from "./src/continuous-epub.js"; export { View } from "foliate-js/view.js";', resolveDir: root,
  }, bundle: true, format: "cjs", write: false, plugins: [foliate.plugin], define: foliate.define });
  window.module = { exports: {} };
  vm.runInContext(output.outputFiles[0].text, dom.getInternalVMContext());
  return { dom, ...window.module.exports };
}

async function until(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise(resolve => globalThis.setTimeout(resolve, 10));
  }
  throw new Error("Continuous renderer did not settle");
}

test("continuous EPUB scroll keeps adjacent chapters in one flow and unloads distant ones", async () => {
  const { dom, ContinuousEpubRenderer, adjacentReadableSection } = await rendererFixture();
  const sections = Array.from({ length: 5 }, (_, index) => ({
    linear: index === 3 ? "no" : "yes",
    load: async () => `data:text/html,<html><body><p>Chapter ${index}</p></body></html>`,
    unload() { this.unloads = (this.unloads || 0) + 1; },
  }));
  const renderer = new ContinuousEpubRenderer();
  const locations = [];
  renderer.addEventListener("load", ({ detail: { doc } }) => {
    Object.defineProperty(doc.body, "scrollHeight", { configurable: true, get: () => 184 });
    doc.body.getBoundingClientRect = () => ({ bottom: 212 });
    doc.caretRangeFromPoint = () => {
      const range = doc.createRange();
      range.selectNodeContents(doc.querySelector("p"));
      return range;
    };
  });
  renderer.addEventListener("relocate", ({ detail }) => locations.push(detail.index));
  dom.window.document.querySelector("main").append(renderer);
  renderer.open({ sections });
  try {
    assert.equal(adjacentReadableSection(sections, 2, 1), 4);
    await Promise.race([renderer.goTo({ index: 0, anchor: 0 }), new Promise((_, reject) => globalThis.setTimeout(() => reject(new Error("goTo timed out")), 2000))]);
    await until(() => renderer.getContents().length === 2);
    assert.deepEqual(Array.from(renderer.getContents(), item => item.index), [0, 1]);
    await renderer.scrollBy(0, 300);
    await until(() => renderer.getContents().some(item => item.index === 2));
    assert.ok(locations.includes(1), "progress moves to the next section while scrolling");
    await renderer.scrollBy(0, 300);
    await until(() => renderer.getContents().some(item => item.index === 4));
    assert.deepEqual(Array.from(renderer.getContents(), item => item.index), [1, 2, 4]);
    assert.ok(sections[0].unloads >= 1, "distant sections release their resources");
  } finally { renderer.destroy(); dom.window.close(); }
});

test("dropping a tall chapter above the viewport does not jump backward", async () => {
  const { dom, ContinuousEpubRenderer } = await rendererFixture();
  const sections = Array.from({ length: 5 }, (_, index) => ({
    linear: index === 3 ? "no" : "yes",
    load: async () => `data:text/html,<html><body><p>Chapter ${index}</p></body></html>`,
    unload() {},
  }));
  const renderer = new ContinuousEpubRenderer();
  renderer.addEventListener("load", ({ detail: { doc } }) => {
    Object.defineProperty(doc.body, "scrollHeight", { configurable: true, get: () => 184 });
    doc.body.getBoundingClientRect = () => ({ bottom: 212 });
  });
  dom.window.document.querySelector("main").append(renderer);
  renderer.open({ sections });
  try {
    await renderer.goTo({ index: 0, anchor: 0 });
    await until(() => renderer.getContents().length === 2);
    const scroller = renderer.getContents()[0].doc._frame.parentElement.parentElement.parentElement;
    let requestedTop = 0;
    Object.defineProperty(scroller, "scrollTop", { configurable: true,
      get() { return Math.max(0, Math.min(requestedTop, this.scrollHeight - this.clientHeight)); },
      set(value) { requestedTop = Math.max(0, Math.min(value, this.scrollHeight - this.clientHeight)); },
    });
    await renderer.scrollBy(0, 300);
    await until(() => renderer.getContents().some(item => item.index === 2));
    await renderer.scrollBy(0, 300);
    await until(() => !renderer.getContents().some(item => item.index === 0));
    assert.equal(scroller.scrollTop, 360, "pruning the cover preserves the visible chapter position");
    assert.deepEqual(Array.from(renderer.getContents(), item => item.index), [1, 2, 4]);
  } finally { renderer.destroy(); dom.window.close(); }
});

test("downward wheel movement waits for a loading chapter instead of disappearing", async () => {
  const { dom, ContinuousEpubRenderer } = await rendererFixture();
  let releaseNext;
  const nextSource = new Promise(resolve => { releaseNext = resolve; });
  const sections = [
    { linear: "yes", load: async () => "data:text/html,<p>First</p>", unload() {} },
    { linear: "yes", load: () => nextSource, unload() {} },
  ];
  const renderer = new ContinuousEpubRenderer();
  renderer.addEventListener("load", ({ detail: { doc } }) => {
    Object.defineProperty(doc.body, "scrollHeight", { configurable: true, get: () => 184 });
    doc.body.getBoundingClientRect = () => ({ bottom: 212 });
  });
  dom.window.document.querySelector("main").append(renderer);
  renderer.open({ sections });
  try {
    await renderer.goTo({ index: 0, anchor: 0 });
    const doc = renderer.getContents()[0].doc;
    const scroller = doc._frame.parentElement.parentElement.parentElement;
    let top = 0;
    Object.defineProperty(scroller, "scrollTop", { configurable: true,
      get: () => top,
      set(value) { top = Math.max(0, Math.min(value, this.scrollHeight - this.clientHeight)); },
    });
    doc.body.dispatchEvent(new dom.window.WheelEvent("wheel", { deltaY: 100, bubbles: true, cancelable: true }));
    assert.equal(scroller.scrollTop, 0, "the current loaded content has no room to scroll");
    releaseNext("data:text/html,<p>Second</p>");
    await until(() => scroller.scrollTop === 100);
    assert.equal(renderer.getContents().length, 2);
  } finally { renderer.destroy(); dom.window.close(); }
});

test("upward wheel movement still enters a loading previous chapter", async () => {
  const { dom, ContinuousEpubRenderer } = await rendererFixture();
  let releasePrevious;
  const previousSource = new Promise(resolve => { releasePrevious = resolve; });
  const sections = [
    { linear: "yes", load: () => previousSource, unload() {} },
    { linear: "yes", load: async () => "data:text/html,<p>Second</p>", unload() {} },
  ];
  const renderer = new ContinuousEpubRenderer();
  renderer.addEventListener("load", ({ detail: { doc } }) => {
    Object.defineProperty(doc.body, "scrollHeight", { configurable: true, get: () => 184 });
    doc.body.getBoundingClientRect = () => ({ bottom: 212 });
  });
  dom.window.document.querySelector("main").append(renderer);
  renderer.open({ sections });
  try {
    await renderer.goTo({ index: 1, anchor: 0 });
    const doc = renderer.getContents()[0].doc;
    const scroller = doc._frame.parentElement.parentElement.parentElement;
    let top = 0;
    Object.defineProperty(scroller, "scrollTop", { configurable: true,
      get: () => top,
      set(value) { top = Math.max(0, Math.min(value, this.scrollHeight - this.clientHeight)); },
    });
    doc.body.dispatchEvent(new dom.window.WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true }));
    releasePrevious("data:text/html,<p>First</p>");
    await until(() => renderer.getContents().length === 2);
    assert.ok(scroller.scrollTop < 180, "the gesture moves into the previous chapter");
  } finally { renderer.destroy(); dom.window.close(); }
});

test("continuous scrolling preloads the following chapter before the user pauses", async () => {
  const { dom, ContinuousEpubRenderer } = await rendererFixture();
  const sections = Array.from({ length: 4 }, (_, index) => ({
    linear: "yes", load: async () => `data:text/html,<p>Chapter ${index}</p>`, unload() {},
  }));
  const renderer = new ContinuousEpubRenderer();
  renderer.addEventListener("load", ({ detail: { doc } }) => {
    Object.defineProperty(doc.body, "scrollHeight", { configurable: true, get: () => 184 });
    doc.body.getBoundingClientRect = () => ({ bottom: 212 });
  });
  dom.window.document.querySelector("main").append(renderer);
  renderer.open({ sections });
  let scrollEvents;
  try {
    await renderer.goTo({ index: 0, anchor: 0 });
    await until(() => renderer.getContents().length === 2);
    const scroller = renderer.getContents()[0].doc._frame.parentElement.parentElement.parentElement;
    scroller.scrollTop = 300;
    scrollEvents = globalThis.setInterval(() => scroller.dispatchEvent(new dom.window.Event("scroll")), 15);
    await new Promise(resolve => globalThis.setTimeout(resolve, 160));
    assert.ok(renderer.getContents().some(item => item.index === 2), "the next chapter loads during continuous input");
  } finally {
    globalThis.clearInterval(scrollEvents);
    renderer.destroy(); dom.window.close();
  }
});

test("Foliate View keeps CFI progress while using the continuous renderer", async () => {
  const { dom, View } = await rendererFixture();
  const sections = [0, 1].map(index => ({
    id: `chapter-${index}.xhtml`, size: 1000, linear: "yes",
    load: async () => `data:text/html,<html><body><p>Chapter ${index}</p></body></html>`,
    unload() {},
  }));
  const book = { sections, metadata: { language: "en" }, toc: [], pageList: [],
    splitTOCHref: href => [href, ""], getTOCFragment: () => null,
  };
  const view = new View();
  view.setAttribute("continuous", "");
  dom.window.document.querySelector("main").append(view);
  view.addEventListener("load", ({ detail: { doc } }) => {
    Object.defineProperty(doc.body, "scrollHeight", { configurable: true, get: () => 184 });
    doc.body.getBoundingClientRect = () => ({ bottom: 212 });
    doc.caretRangeFromPoint = () => {
      const range = doc.createRange();
      range.selectNodeContents(doc.querySelector("p"));
      return range;
    };
  });
  try {
    await view.open(book);
    assert.match(view.renderer.localName, /-continuous$/);
    view.renderer.setAttribute("max-inline-size", "600px");
    await view.init({ lastLocation: 0 });
    assert.equal(view.lastLocation.section.current, 0);
    assert.match(view.lastLocation.cfi, /^epubcfi\(/);
    await view.goTo(1);
    assert.equal(view.lastLocation.section.current, 1);
    assert.ok(Number.isFinite(view.lastLocation.fraction));
  } finally { view.close(); dom.window.close(); }
});
