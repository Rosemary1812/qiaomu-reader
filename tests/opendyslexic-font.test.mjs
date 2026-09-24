import assert from "node:assert/strict";
import test from "node:test";
import { BUNDLED_FONT_FAMILIES } from "../src/bundled-fonts.js";
import { OPENDYSLEXIC_READER_FONT } from "../src/opendyslexic-reader-font.js";

test("reader font registry includes bundled OpenDyslexic", () => {
  assert.equal(BUNDLED_FONT_FAMILIES.opendyslexic, "QBR OpenDyslexic");
  assert.equal(OPENDYSLEXIC_READER_FONT.id, "opendyslexic");
  assert.match(OPENDYSLEXIC_READER_FONT.stack, /OpenDyslexic/);
  assert.deepEqual(OPENDYSLEXIC_READER_FONT.labels, {
    ru: "OpenDyslexic",
    en: "OpenDyslexic",
    zh: "OpenDyslexic",
  });
});
