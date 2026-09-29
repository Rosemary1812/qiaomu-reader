// Shelf collections are a browsing list only. Membership stores the book's
// existing vault path and never creates folders or moves the file.

const COLLECTION_ID = /^[A-Za-z0-9_-]{1,80}$/;
let collectionSeq = 0;

function cleanName(name) {
  let text = "";
  for (const char of String(name ?? "")) {
    if (char.codePointAt(0) >= 32) text += char;
  }
  return text.trim().slice(0, 80);
}

function cleanBooks(books) {
  const seen = new Set();
  const out = [];
  for (const book of Array.isArray(books) ? books : []) {
    if (typeof book !== "string" || !book || seen.has(book)) continue;
    seen.add(book);
    out.push(book);
  }
  return out;
}

function nextCollectionId() {
  collectionSeq += 1;
  const noise = Math.random().toString(36).slice(2, 10);
  return `col_${Date.now().toString(36)}_${noise}_${collectionSeq.toString(36)}`;
}

export function normalizeCollections(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const id = String(item.id || "");
    const name = cleanName(item.name);
    if (!COLLECTION_ID.test(id) || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name, books: cleanBooks(item.books) });
  }
  return out;
}

export function libraryLayout(value) {
  return value === "list" ? "list" : "grid";
}

export function libraryEmptyCopyKey(chipId, query) {
  if (String(query || "").trim()) return "nothing-found";
  if (String(chipId || "").startsWith("collection:")) return "library-collection-empty";
  return "nothing-found";
}

export function bookInCollection(collections, id, bookPath) {
  const found = normalizeCollections(collections).find((collection) => collection.id === id);
  return !!found && found.books.includes(bookPath);
}

export function createCollection(collections, name, bookPath = "") {
  const clean = cleanName(name);
  const current = normalizeCollections(collections);
  if (!clean) return { ok: false, reason: "empty", collections: current };
  if (current.some((collection) => collection.name === clean)) {
    return { ok: false, reason: "exists", collections: current };
  }
  const books = typeof bookPath === "string" && bookPath ? [bookPath] : [];
  const collection = { id: nextCollectionId(), name: clean, books };
  return { ok: true, collection, collections: [...current, collection] };
}

export function renameCollection(collections, id, name) {
  const clean = cleanName(name);
  const current = normalizeCollections(collections);
  if (!clean) return { ok: false, reason: "empty", collections: current };
  if (!current.some((collection) => collection.id === id)) {
    return { ok: false, reason: "missing", collections: current };
  }
  if (current.some((collection) => collection.id !== id && collection.name === clean)) {
    return { ok: false, reason: "exists", collections: current };
  }
  return {
    ok: true,
    collections: current.map((collection) => (collection.id === id ? { ...collection, name: clean } : collection)),
  };
}

export function deleteCollection(collections, id) {
  return normalizeCollections(collections).filter((collection) => collection.id !== id);
}

export function setCollectionMember(collections, id, bookPath, member) {
  const current = normalizeCollections(collections);
  if (typeof bookPath !== "string" || !bookPath || !current.some((collection) => collection.id === id)) {
    return { ok: false, collections: current };
  }
  const next = current.map((collection) => {
    if (collection.id !== id) return collection;
    const books = collection.books.filter((path) => path !== bookPath);
    if (member) books.push(bookPath);
    return { ...collection, books };
  });
  return { ok: true, collections: next };
}

export function forgetCollectionBook(collections, bookPath) {
  const current = normalizeCollections(collections);
  let changed = false;
  const next = current.map((collection) => {
    if (!collection.books.includes(bookPath)) return collection;
    changed = true;
    return { ...collection, books: collection.books.filter((path) => path !== bookPath) };
  });
  return { changed, collections: next };
}

export function retargetCollectionPaths(collections, oldPath, newPath) {
  const from = String(oldPath || "").replace(/\/+$/, "");
  const to = String(newPath || "").replace(/\/+$/, "");
  const current = normalizeCollections(collections);
  if (!from || !to || from === to) return { changed: false, collections: current };
  let changed = false;
  const prefix = `${from}/`;
  const next = current.map((collection) => ({
    ...collection,
    books: cleanBooks(collection.books.map((book) => {
      if (book === from) {
        changed = true;
        return to;
      }
      if (book.startsWith(prefix)) {
        changed = true;
        return to + book.slice(from.length);
      }
      return book;
    })),
  }));
  return { changed, collections: changed ? next : current };
}
