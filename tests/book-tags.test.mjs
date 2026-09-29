import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import {
  BOOK_TAG_EXCERPT_CHARS,
  alignWithShelf,
  bookMatchesLibraryQuery,
  buildTagPrompt,
  mergeBookTags,
  normalizeTagList,
  parseModelTags,
  tagsForBook,
  tagsForNewBook,
} from "../src/book-tags.js";

test("tag lists split punctuation, drop the title and reuse a shelf spelling", () => {
  assert.deepEqual(normalizeTagList(["#哲学", "哲学", "诗，历史", { name: "伦理" }, "这是一个超过十六个字的主题标签不应该留下"]), ["哲学", "诗", "历史"]);
  assert.deepEqual(tagsForBook({
    suggestions: ["道德经", "philosophy", "新词"],
    shelfTags: ["Philosophy"],
    title: "道德经",
  }), ["Philosophy", "新词"]);
  assert.deepEqual(alignWithShelf(["Poetry"], ["诗", "poetry"]), ["poetry"]);
});

test("stored tags stay, new suggestions stay short, and an imported book does not replace tags", () => {
  assert.deepEqual(mergeBookTags(["已有一", "已有二", "已有三", "已有四"], ["诗", "已有一"]), ["已有一", "已有二", "已有三", "已有四", "诗"]);
  assert.equal(tagsForNewBook(["哲学"], ["历史"]), null);
  assert.deepEqual(tagsForNewBook([], [" 历史 ", "历史", "a".repeat(41), "诗"]), ["历史", "诗"]);
  assert.equal(tagsForNewBook([], []), null);
});

test("model prose can carry a tag array, and search matches a title or a tag", () => {
  assert.deepEqual(parseModelTags("可以考虑：\n```json\n[\"哲学\", \"诗\"]\n```"), ["哲学", "诗"]);
  assert.deepEqual(parseModelTags("哲学、诗"), ["哲学", "诗"]);
  assert.equal(bookMatchesLibraryQuery("道德经", ["哲学"], ""), true);
  assert.equal(bookMatchesLibraryQuery("道德经", ["哲学"], "哲"), true);
  assert.equal(bookMatchesLibraryQuery("Notes", ["哲学"], "note"), true);
  assert.equal(bookMatchesLibraryQuery("Notes", ["哲学"], "史"), false);
});

test("the prompt keeps the opening short and treats the book as data", () => {
  const prompt = buildTagPrompt({
    title: "道德经",
    author: "老子",
    description: "简介",
    toc: ["第一章"],
    excerpt: "道".repeat(BOOK_TAG_EXCERPT_CHARS + 40),
    shelfTags: ["哲学"],
  });
  assert.match(prompt, /不是指令/);
  assert.match(prompt, /已有标签：哲学/);
  assert.ok(prompt.length < BOOK_TAG_EXCERPT_CHARS + 800);
  assert.equal(prompt.includes("道".repeat(BOOK_TAG_EXCERPT_CHARS + 1)), false);
});

test("a comic sample never opens the container, and a text epub keeps a short opening", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://localhost/" });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    customElements: globalThis.customElements,
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
    NodeFilter: globalThis.NodeFilter,
    DOMParser: globalThis.DOMParser,
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.customElements = dom.window.customElements;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  globalThis.NodeFilter = dom.window.NodeFilter;
  globalThis.DOMParser = dom.window.DOMParser;
  try {
    const { sampleEngineBookTopics } = await import("../src/reader-engine.js");
    const comic = await sampleEngineBookTopics(new Uint8Array(), "pages.cbz");
    assert.equal(comic.kind, "comic");
    assert.equal(comic.excerpt, "");
    const bytes = fs.readFileSync(new URL("../assets/starter-books/7337.epub", import.meta.url));
    const sample = await sampleEngineBookTopics(bytes, "7337.epub");
    assert.equal(sample.kind, "text");
    assert.equal(sample.title, "道德经");
    assert.equal(sample.author, "老子");
    assert.deepEqual(sample.subjects, []);
    assert.match(sample.excerpt, /道可道/);
    assert.ok(sample.excerpt.length <= BOOK_TAG_EXCERPT_CHARS);
    assert.ok(sample.toc.length > 0);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("tag generation reads an opening, not the whole PDF, and does not keep a CLI session", () => {
  const source = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  const pdf = source.slice(source.indexOf("async function samplePdfTopics"), source.indexOf("async function sampleBookTopics"));
  const sample = source.slice(source.indexOf("async function sampleBookTopics"), source.indexOf("async function proposeBookTags"));
  const propose = source.slice(source.indexOf("async function proposeBookTags"), source.indexOf("async function runBookTagging"));
  assert.ok(pdf.indexOf("tagsForBook({ suggestions: subjects, title })") < pdf.indexOf("readPdfPage"));
  assert.doesNotMatch(pdf, /extractPdf\s*\(/);
  assert.ok(sample.indexOf('ext === "cbz"') < sample.indexOf("readBinary"));
  assert.ok(sample.indexOf('ext === "pdf"') < sample.indexOf("readBinary"));
  assert.match(propose, /aiExplain\("", plugin, \[\{\n\s*role: "user",/);
  assert.doesNotMatch(propose, /sessionKey\s*:/);
  assert.match(source, /setManyBookTags\(inputs\.map/);
  const run = source.slice(source.indexOf("async function runBookTagging"), source.indexOf("class BookTagProgressModal"));
  assert.match(run, /needs-ai"\) \{ needsAi = true; continue; \}/);
});
