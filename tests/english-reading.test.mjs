import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { JSDOM } from "jsdom";
import { createEnglishGlossLayer, englishGlossViewport, englishSelectionKind, englishWordLevel, loadEnglishDictionary, lookupEnglishWord, shouldGloss, visibleEnglishWords } from "../src/english-reading.js";

const encoded = Buffer.from(readFileSync(new URL("../src/english-cefr.json", import.meta.url))).toString("base64");
const dictionaryEncoded = gzipSync(readFileSync(new URL("../src/english-dictionary.json", import.meta.url)), { level: 9 }).toString("base64");
globalThis.getComputedStyle = () => ({ getPropertyValue: name => `"${name === "--qiaomu-dictionary-data" ? dictionaryEncoded : encoded}"` });
globalThis.document = { documentElement: {} };
globalThis.atob = (value) => Buffer.from(value, "base64").toString("latin1");

test("offline CEFR lookup distinguishes common and advanced words", () => {
  assert.equal(englishWordLevel("the"), 1);
  assert.equal(englishWordLevel("ameliorate"), 6);
  assert.equal(shouldGloss("ameliorate", "B1"), true);
  assert.equal(shouldGloss("the", "A1"), false);
  assert.equal(shouldGloss("qiaomureader", "A1"), false);
});

test("selected words and passages take different paths", () => {
  assert.equal(englishSelectionKind("ameliorate"), "word");
  assert.equal(englishSelectionKind("A difficult sentence in English.", false), "passage");
  assert.equal(englishSelectionKind("中文混合 text", false), null);
});

test("offline dictionary returns simplified glosses and resolves common inflections", async () => {
  const dictionary = await loadEnglishDictionary();
  assert.equal(lookupEnglishWord(dictionary, "ameliorate")?.gloss, "改善");
  assert.equal(lookupEnglishWord(dictionary, "ubiquitous")?.gloss, "无处不在的");
  assert.equal(lookupEnglishWord(dictionary, "walking")?.lemma, "walk");
  assert.equal(lookupEnglishWord(dictionary, "interesting")?.gloss, "有趣");
  assert.equal(lookupEnglishWord(dictionary, "went")?.lemma, "go");
  assert.equal(lookupEnglishWord(dictionary, "qiaomureader"), null);
});

test("gloss overlay preserves EPUB text nodes used by CFIs", () => {
  const dom = new JSDOM("<html><body><p>The author tries to ameliorate the situation.</p></body></html>");
  const { document: doc } = dom.window;
  globalThis.NodeFilter = dom.window.NodeFilter;
  dom.window.Range.prototype.getBoundingClientRect = () => ({ left: 20, top: 60, bottom: 80, width: 70 });
  const original = doc.querySelector("p").firstChild;
  const entries = visibleEnglishWords(doc, "B1");
  assert.ok(entries.some(item => item.word === "ameliorate"));
  const layer = createEnglishGlossLayer(doc);
  layer.draw(entries.map(item => ({ range: item.range, gloss: "改善" })));
  assert.equal(doc.querySelector("p").firstChild, original);
  assert.equal(doc.querySelector("p").textContent, "The author tries to ameliorate the situation.");
  layer.remove();
});

test("foliate overlayer draws a gloss outside the EPUB text", () => {
  const dom = new JSDOM("<html><body><p>ameliorate</p></body></html>");
  const { document: doc } = dom.window;
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  doc.body.append(svg);
  const original = doc.querySelector("p").firstChild;
  const range = doc.createRange();
  range.selectNodeContents(original);
  dom.window.Range.prototype.getBoundingClientRect = () => ({ left: 20, right: 90, top: 60, bottom: 80, width: 70 });
  const layer = createEnglishGlossLayer(doc, { element: svg });
  layer.draw([{ range, gloss: "改善" }]);
  assert.equal(svg.querySelector("text")?.textContent, "改善");
  assert.equal(doc.querySelector("p").firstChild, original);
  layer.remove();
  assert.equal(svg.querySelector("text"), null);
});

test("gloss candidates skip earlier columns in an expanded iframe", () => {
  const dom = new JSDOM("<html><body><p>ameliorate</p><p>ubiquitous</p></body></html>");
  const { document: doc } = dom.window;
  globalThis.NodeFilter = dom.window.NodeFilter;
  const offscreen = doc.querySelector("p").firstChild;
  dom.window.Range.prototype.getBoundingClientRect = function () {
    return this.startContainer === offscreen
      ? { left: 20, right: 90, top: 60, bottom: 80, width: 70 }
      : { left: 1200, right: 1270, top: 60, bottom: 80, width: 70 };
  };
  const currentPage = { left: 1000, right: 2000, top: 0, bottom: 768 };
  assert.deepEqual(visibleEnglishWords(doc, "B1", 1, currentPage).map(item => item.word), ["ubiquitous"]);
});

test("gloss lookup skips word geometry in offscreen paragraphs", () => {
  const dom = new JSDOM(`<html><body>${"<p>ameliorate ubiquitous</p>".repeat(100)}<p>ameliorate</p></body></html>`);
  const { document: doc } = dom.window;
  globalThis.NodeFilter = dom.window.NodeFilter;
  const paragraphs = [...doc.querySelectorAll("p")];
  for (const paragraph of paragraphs) paragraph.getBoundingClientRect = () =>
    paragraph === paragraphs.at(-1)
      ? { left: 20, right: 200, top: 60, bottom: 80, width: 180, height: 20 }
      : { left: 20, right: 200, top: -200, bottom: -180, width: 180, height: 20 };
  let wordMeasurements = 0;
  dom.window.Range.prototype.getBoundingClientRect = () => {
    wordMeasurements++;
    return { left: 20, right: 90, top: 60, bottom: 80, width: 70 };
  };
  const viewport = { left: 0, right: 300, top: 0, bottom: 100 };
  assert.deepEqual(visibleEnglishWords(doc, "B1", 1, viewport).map(item => item.word), ["ameliorate"]);
  assert.equal(wordMeasurements, 1);
});

test("reader viewport maps into expanded iframe coordinates", () => {
  const dom = new JSDOM("<html><body></body></html>");
  Object.defineProperty(dom.window, "frameElement", { value: { getBoundingClientRect: () => ({ left: -1000, top: 50 }) } });
  const area = { getBoundingClientRect: () => ({ left: 0, right: 1000, top: 100, bottom: 700 }) };
  assert.deepEqual(englishGlossViewport(dom.window.document, area), { left: 1000, right: 2000, top: 50, bottom: 650 });
});

test("gloss refresh tolerates a chapter iframe that was already detached", () => {
  const area = { getBoundingClientRect: () => ({ left: 20, right: 620, top: 30, bottom: 830, width: 600, height: 800 }) };
  assert.deepEqual(englishGlossViewport({ defaultView: null }, area), { left: 0, right: 600, top: 0, bottom: 800 });
});

test("sentence-initial capitals are glossed and mid-sentence capitals stay names", () => {
  const dom = new JSDOM("<html><body><p><span>Ambiguous</span> cases remain. See <span>Ubiquitous</span> later. NASA stays. ameliorate returns.</p></body></html>");
  const { document: doc } = dom.window;
  globalThis.NodeFilter = dom.window.NodeFilter;
  dom.window.Range.prototype.getBoundingClientRect = () => ({ left: 20, right: 90, top: 60, bottom: 80, width: 70 });
  const words = visibleEnglishWords(doc, "B1").map(item => item.word);
  assert.ok(words.includes("Ambiguous"));
  assert.equal(words.includes("Ubiquitous"), false);
  assert.equal(words.includes("NASA"), false);
  assert.ok(words.includes("ameliorate"));
});

test("overlapping glosses do not consume the visible limit", async () => {
  const dom = new JSDOM("<html><body><p>ameliorate ubiquitous ambiguous</p></body></html>");
  const { document: doc } = dom.window;
  globalThis.NodeFilter = dom.window.NodeFilter;
  dom.window.Range.prototype.getBoundingClientRect = function () {
    const word = this.toString();
    if (word === "ubiquitous") return { left: 8, right: 38, top: 40, bottom: 60, width: 30, height: 20 };
    if (word === "ambiguous") return { left: 400, right: 440, top: 40, bottom: 60, width: 40, height: 20 };
    return { left: 0, right: 30, top: 40, bottom: 60, width: 30, height: 20 };
  };
  const dictionary = await loadEnglishDictionary();
  assert.deepEqual(
    visibleEnglishWords(doc, "B1", 2, { left: 0, right: 800, top: 0, bottom: 200 }, dictionary).map(item => item.word),
    ["ameliorate", "ambiguous"],
  );
});

test("clicking a gloss opens that word and overlapping labels are omitted", () => {
  const dom = new JSDOM("<html><body><p>ameliorate</p><p>ubiquitous</p></body></html>");
  const { document: doc } = dom.window;
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  doc.body.append(svg);
  const ranges = [...doc.querySelectorAll("p")].map(paragraph => {
    const range = doc.createRange();
    range.selectNodeContents(paragraph.firstChild);
    return range;
  });
  dom.window.Range.prototype.getBoundingClientRect = function () {
    return this.startContainer === ranges[0].startContainer
      ? { left: 0, right: 30, top: 40, bottom: 60, width: 30, height: 20 }
      : { left: 8, right: 38, top: 40, bottom: 60, width: 30, height: 20 };
  };
  let clicked = null;
  const layer = createEnglishGlossLayer(doc, { element: svg });
  layer.draw([
    { range: ranges[0], word: "ameliorate", gloss: "改善" },
    { range: ranges[1], word: "ubiquitous", gloss: "无处不在的" },
  ], { left: 0, right: 800, top: 0, bottom: 200 }, (word, rect) => { clicked = { word, rect }; });
  const labels = [...svg.querySelectorAll("text")];
  assert.deepEqual(labels.map(label => label.getAttribute("data-word")), ["ameliorate"]);
  assert.equal(labels[0].getAttribute("pointer-events"), "auto");
  labels[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
  assert.equal(clicked.word, "ameliorate");
  assert.equal(typeof clicked.rect.left, "number");
  assert.equal(typeof clicked.rect.bottom, "number");
  layer.remove();
});

test("missing dictionary entries do not consume the visible gloss limit", async () => {
  const dom = new JSDOM("<html><body><p>aberrant ameliorate</p></body></html>");
  const { document: doc } = dom.window;
  globalThis.NodeFilter = dom.window.NodeFilter;
  dom.window.Range.prototype.getBoundingClientRect = () => ({ left: 20, right: 90, top: 60, bottom: 80, width: 70 });
  const dictionary = await loadEnglishDictionary();
  assert.deepEqual(visibleEnglishWords(doc, "B1", 1, undefined, dictionary).map(item => item.word), ["ameliorate"]);
});
