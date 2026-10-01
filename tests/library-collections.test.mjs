import assert from "node:assert/strict";
import test from "node:test";
import {
  bookInCollection,
  createCollection,
  deleteCollection,
  forgetCollectionBook,
  libraryEmptyCopyKey,
  libraryLayout,
  normalizeCollections,
  renameCollection,
  retargetCollectionPaths,
  setCollectionMember,
} from "../src/library-collections.js";

test("a collection records book paths and does not invent a location", () => {
  const created = createCollection([], "唐诗", "Books/唐诗三百首.epub");
  assert.equal(created.ok, true);
  assert.equal(created.collection.name, "唐诗");
  assert.deepEqual(created.collection.books, ["Books/唐诗三百首.epub"]);
  assert.equal(created.collections[0].books[0], "Books/唐诗三百首.epub");
  const duplicate = createCollection(created.collections, " 唐诗 ");
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, "exists");
  assert.equal(duplicate.collections.length, 1);
});

test("one book can sit in several collections while remaining one path", () => {
  const first = createCollection([], "在读");
  const second = createCollection(first.collections, "英文");
  const added = setCollectionMember(second.collections, first.collection.id, "Books/a.epub", true);
  const also = setCollectionMember(added.collections, second.collection.id, "Books/a.epub", true);
  assert.equal(bookInCollection(also.collections, first.collection.id, "Books/a.epub"), true);
  assert.equal(bookInCollection(also.collections, second.collection.id, "Books/a.epub"), true);
  const removed = setCollectionMember(also.collections, first.collection.id, "Books/a.epub", false);
  assert.equal(bookInCollection(removed.collections, first.collection.id, "Books/a.epub"), false);
  assert.equal(bookInCollection(removed.collections, second.collection.id, "Books/a.epub"), true);
});

test("renaming and deleting a collection leaves the stored book path alone", () => {
  const created = createCollection([], "旧名", "Books/a.epub");
  const other = createCollection(created.collections, "另一本");
  const clash = renameCollection(other.collections, created.collection.id, "另一本");
  assert.equal(clash.ok, false);
  const renamed = renameCollection(other.collections, created.collection.id, "新名");
  assert.equal(renamed.ok, true);
  assert.equal(renamed.collections[0].name, "新名");
  assert.deepEqual(renamed.collections[0].books, ["Books/a.epub"]);
  const left = deleteCollection(renamed.collections, created.collection.id);
  assert.deepEqual(left.map((collection) => collection.name), ["另一本"]);
});

test("deleting a book or renaming its file only rewrites membership", () => {
  const created = createCollection([], "诗", "Books/唐诗/a.epub");
  const extra = setCollectionMember(created.collections, created.collection.id, "Books/b.epub", true);
  const moved = retargetCollectionPaths(extra.collections, "Books/唐诗", "Books/诗选");
  assert.equal(moved.changed, true);
  assert.deepEqual(moved.collections[0].books, ["Books/诗选/a.epub", "Books/b.epub"]);
  const file = retargetCollectionPaths(moved.collections, "Books/诗选/a.epub", "Books/诗选/甲.epub");
  assert.deepEqual(file.collections[0].books, ["Books/诗选/甲.epub", "Books/b.epub"]);
  const note = retargetCollectionPaths(file.collections, "Notes/a.md", "Notes/b.md");
  assert.equal(note.changed, false);
  const partial = retargetCollectionPaths(file.collections, "Books/诗", "Books/别的");
  assert.equal(partial.changed, false);
  const forgotten = forgetCollectionBook(file.collections, "Books/诗选/甲.epub");
  assert.equal(forgotten.changed, true);
  assert.deepEqual(forgotten.collections[0].books, ["Books/b.epub"]);
  assert.equal(forgetCollectionBook(forgotten.collections, "Books/诗选/甲.epub").changed, false);
});

test("stored collections ignore blank names and repeat paths", () => {
  assert.deepEqual(normalizeCollections([
    { id: "col_ok", name: " 诗 ", books: ["Books/a.epub", "Books/a.epub", "", 3] },
    { id: "bad id", name: "丢弃", books: ["Books/a.epub"] },
    { id: "col_ok", name: "重复", books: ["Books/b.epub"] },
    { id: "col_empty", name: "   ", books: [] },
  ]), [{ id: "col_ok", name: "诗", books: ["Books/a.epub"] }]);
  assert.equal(createCollection([], "   ").ok, false);
  assert.equal(createCollection([], "诗\n选").collection.name, "诗选");
  assert.equal(libraryLayout("list"), "list");
  assert.equal(libraryLayout("cards"), "grid");
  assert.equal(libraryEmptyCopyKey("collection:col_ok", ""), "library-collection-empty");
  assert.equal(libraryEmptyCopyKey("collection:col_ok", "道德"), "nothing-found");
  assert.equal(libraryEmptyCopyKey("all", ""), "nothing-found");
});
