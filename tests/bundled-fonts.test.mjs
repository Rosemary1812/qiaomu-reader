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
