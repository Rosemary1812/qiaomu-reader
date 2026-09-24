import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { createEnglishGlossLayer, englishSelectionKind, englishWordLevel, shouldGloss, visibleEnglishWords } from "../src/english-reading.js";

const encoded = Buffer.from(readFileSync(new URL("../src/english-cefr.json", import.meta.url))).toString("base64");
globalThis.getComputedStyle = () => ({ getPropertyValue: () => `"${encoded}"` });
globalThis.document = { documentElement: {} };
globalThis.atob = (value) => Buffer.from(value, "base64").toString();

test("offline CEFR lookup distinguishes common and advanced words", () => {
  assert.equal(englishWordLevel("the"), 1);
  assert.equal(englishWordLevel("ameliorate"), 6);
  assert.equal(shouldGloss("ameliorate", "B1"), true);
  assert.equal(shouldGloss("the", "A1"), false);
  assert.equal(shouldGloss("qiaomureader", "A1"), false);
});

test("double-click words and dragged passages take different paths", () => {
  assert.equal(englishSelectionKind("ameliorate", true), "word");
  assert.equal(englishSelectionKind("ameliorate", false), null);
  assert.equal(englishSelectionKind("A difficult sentence in English.", false), "passage");
  assert.equal(englishSelectionKind("中文混合 text", false), null);
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
