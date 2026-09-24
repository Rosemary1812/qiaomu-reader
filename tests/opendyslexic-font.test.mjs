import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("reader font registry includes bundled OpenDyslexic", () => {
  const source = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  assert.match(source, /BUNDLED_FONT_FAMILIES\.opendyslexic/);
  assert.match(source, /id: "opendyslexic"/);
  assert.match(source, /labels: \{ ru: "OpenDyslexic", en: "OpenDyslexic", zh: "OpenDyslexic" \}/);
});
