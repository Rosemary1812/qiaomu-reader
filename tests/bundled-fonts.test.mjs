import assert from "node:assert/strict";
import test from "node:test";
import { BUNDLED_FONT_FAMILIES, ensureBundledReaderFont } from "../src/bundled-fonts.js";

test("bundled font catalog exposes Zhuque and OpenDyslexic CSS families", () => {
  assert.equal(BUNDLED_FONT_FAMILIES.zhuque, "QBR Zhuque Fangsong");
  assert.equal(BUNDLED_FONT_FAMILIES.opendyslexic, "QBR OpenDyslexic");
  assert.deepEqual(Object.keys(BUNDLED_FONT_FAMILIES).sort(), ["opendyslexic", "zhuque"]);
});

test("ensureBundledReaderFont loads known ids and ignores unknown ones", async () => {
  const loaded = [];
  const doc = {
    fonts: {
      load: async (query) => {
        loaded.push(query);
        return [{}];
      },
    },
  };
  assert.equal(await ensureBundledReaderFont(doc, "opendyslexic"), true);
  assert.equal(await ensureBundledReaderFont(doc, "zhuque"), true);
  assert.equal(await ensureBundledReaderFont(doc, "georgia"), false);
  assert.equal(await ensureBundledReaderFont({}, "opendyslexic"), false);
  assert.deepEqual(loaded, [
    '16px "QBR OpenDyslexic"',
    '16px "QBR Zhuque Fangsong"',
  ]);
});

test("bundled font reaches an EPUB iframe before loading", async () => {
  const appended = [];
  const hostDoc = { styleSheets: [{ cssRules: [{
    type: 5,
    style: { getPropertyValue: () => '"QBR OpenDyslexic"' },
    cssText: '@font-face { font-family: "QBR OpenDyslexic"; src: url(data:font/woff2;base64,test); }',
  }] }] };
  const doc = {
    defaultView: { frameElement: { ownerDocument: hostDoc } },
    querySelector: () => appended[0] || null,
    createElement: () => ({ setAttribute() {}, textContent: "" }),
    head: { append: (style) => appended.push(style) },
    fonts: { load: async () => {
      assert.equal(appended.length, 1, "font face must exist before document.fonts.load");
      return [{}];
    } },
  };
  assert.equal(await ensureBundledReaderFont(doc, "opendyslexic"), true);
  assert.match(appended[0].textContent, /QBR OpenDyslexic/);
  assert.equal(await ensureBundledReaderFont(doc, "opendyslexic"), true);
  assert.equal(appended.length, 1, "repeated loads reuse the same font face");
});
