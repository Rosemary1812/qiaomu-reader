import assert from "node:assert/strict";
import test from "node:test";
import {
  isCalibreSyntaxQuery,
  parseSimpleCalibreQuery,
  pickPreferredFormat,
  formatBytes,
} from "../src/calibre-library.js";

test("simple field filters are not treated as calibredb syntax", () => {
  assert.equal(isCalibreSyntaxQuery("金字塔"), false);
  assert.equal(isCalibreSyntaxQuery("author:福勒"), false);
  assert.equal(isCalibreSyntaxQuery("title:重构"), false);
  assert.equal(isCalibreSyntaxQuery("author:福勒 and format:epub"), true);
  assert.equal(isCalibreSyntaxQuery('title:"The Ring"'), false);
  assert.equal(isCalibreSyntaxQuery("(epub or pdf)"), true);
});

test("parseSimpleCalibreQuery extracts one field", () => {
  assert.deepEqual(parseSimpleCalibreQuery("金字塔原理"), { field: "", q: "金字塔原理" });
  assert.deepEqual(parseSimpleCalibreQuery("author: Martin Fowler"), { field: "author", q: "Martin Fowler" });
  assert.deepEqual(parseSimpleCalibreQuery("format:epub"), { field: "format", q: "epub" });
});

test("pickPreferredFormat prefers EPUB then PDF", () => {
  const allowed = new Set(["epub", "pdf", "mobi", "azw3"]);
  assert.equal(pickPreferredFormat(["MOBI", "EPUB"], allowed), "epub");
  assert.equal(pickPreferredFormat(["PDF", "AZW3"], allowed), "pdf");
  assert.equal(pickPreferredFormat(["MOBI"], allowed), "mobi");
  assert.equal(pickPreferredFormat(["TXT"], allowed), "");
});

test("formatBytes uses MB for large books", () => {
  assert.match(formatBytes(4500 * 1024), /MB|KB/);
  assert.equal(formatBytes(50 * 1024 * 1024), "50 MB");
});
