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

test("reader viewport maps into expanded iframe coordinates", () => {
  const dom = new JSDOM("<html><body></body></html>");
  Object.defineProperty(dom.window, "frameElement", { value: { getBoundingClientRect: () => ({ left: -1000, top: 50 }) } });
  const area = { getBoundingClientRect: () => ({ left: 0, right: 1000, top: 100, bottom: 700 }) };
  assert.deepEqual(englishGlossViewport(dom.window.document, area), { left: 1000, right: 2000, top: 50, bottom: 650 });
});

test("missing dictionary entries do not consume the visible gloss limit", async () => {
  const dom = new JSDOM("<html><body><p>aberrant ameliorate</p></body></html>");
  const { document: doc } = dom.window;
  globalThis.NodeFilter = dom.window.NodeFilter;
  dom.window.Range.prototype.getBoundingClientRect = () => ({ left: 20, right: 90, top: 60, bottom: 80, width: 70 });
  const dictionary = await loadEnglishDictionary();
  assert.deepEqual(visibleEnglishWords(doc, "B1", 1, undefined, dictionary).map(item => item.word), ["ameliorate"]);
});
