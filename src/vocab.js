// Vocabulary notes stay in the vault. Anki is a desktop-only downstream copy.
export const VOCAB_FILE_NAME = "Vocabulary.md";
export const VOCAB_DECK_DEFAULT = "生词本";
export const VOCAB_MODEL_NAME = "英文生词";
export const VOCAB_ATTRIBUTION = "FreeDict eng-zho, CC BY-SA 3.0. https://freedict.org/downloads/";
export const ANKI_CONNECT_URL = "http://127.0.0.1:8765";
export const VOCAB_FIELDS = Object.freeze(["Word", "Gloss", "Sentence", "Source", "Attribution"]);

function commentPattern() {
  return /<!--\s*qiaomu-vocab:([A-Za-z0-9+/=]+)\s*-->/g;
}

export function vocabularyNotePath(folder) {
  const clean = String(folder || "").replace(/\\/g, "/").replace(/\/+$/g, "");
  return clean ? `${clean}/${VOCAB_FILE_NAME}` : VOCAB_FILE_NAME;
}

export function vocabDeckName(value) {
  const name = String(value || "").replace(/[\r\n]/g, " ").trim();
  return name || VOCAB_DECK_DEFAULT;
}

export function vocabLemmaKey(surface, entry) {
  const lemma = entry?.lemma || String(surface || "").trim().toLowerCase().replace(/[’]/g, "'");
  return String(lemma || "").trim().toLowerCase();
}

export function vocabLemmaTag(lemma) {
  const clean = String(lemma || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `lemma-${clean || "word"}`;
}

export function vocabContextGloss(text) {
  const value = String(text || "").trim();
  if (!value || value === "正在生成…" || value === "Generating…") return "";
  if (value.startsWith("解释失败") || value.startsWith("Explanation failed")) return "";
  return value.replace(/<!--/g, "");
}

function oneLine(value, max = 450) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length <= max ? text : text.slice(0, max).trim();
}

export function buildVocabRecord(input) {
  const surface = oneLine(input?.surface, 80);
  const lemma = vocabLemmaKey(surface, input?.entry);
  if (!lemma) return null;
  const senses = Array.isArray(input?.entry?.senses) ? input.entry.senses.slice(0, 3) : [];
  const dictionaryGloss = senses
    .map(([pos, meaning]) => `${pos ? `${pos}. ` : ""}${meaning || ""}`.trim())
    .filter(Boolean)
    .join("\n");
  const context = vocabContextGloss(input?.contextGloss);
  const gloss = [context, dictionaryGloss].filter(Boolean).join("\n\n").replace(/<!--/g, "");
  return {
    lemma,
    surface,
    gloss,
    sentence: oneLine(input?.sentence),
    bookPath: oneLine(input?.bookPath, 500),
    bookTitle: oneLine(input?.bookTitle, 200),
    location: oneLine(input?.location, 800),
    dictionaryUsed: Boolean(dictionaryGloss),
    anki: null,
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeMarkdown(value) {
  return String(value || "").replace(/[\\*[\]_`]/g, "\\$&");
}

function emphasize(text, surface) {
  const escaped = escapeMarkdown(text);
  const needle = escapeMarkdown(surface);
  if (!needle) return escaped;
  const index = escaped.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return escaped;
  return `${escaped.slice(0, index)}**${escaped.slice(index, index + needle.length)}**${escaped.slice(index + needle.length)}`;
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function utf8Bytes(text) {
  const bytes = [];
  for (const char of String(text || "")) {
    const code = char.codePointAt(0);
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
  }
  return bytes;
}

function utf8Text(bytes) {
  let text = "";
  for (let i = 0; i < bytes.length;) {
    const a = bytes[i++];
    if (a < 0x80) { text += String.fromCharCode(a); continue; }
    const b = bytes[i++] & 0x3f;
    if (a < 0xe0) { text += String.fromCharCode(((a & 0x1f) << 6) | b); continue; }
    const c = bytes[i++] & 0x3f;
    if (a < 0xf0) { text += String.fromCharCode(((a & 0x0f) << 12) | (b << 6) | c); continue; }
    const d = bytes[i++] & 0x3f;
    text += String.fromCodePoint(((a & 0x07) << 18) | (b << 12) | (c << 6) | d);
  }
  return text;
}

function encodeBase64(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += BASE64[(triple >> 18) & 63] + BASE64[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64[(triple >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? BASE64[triple & 63] : "=";
  }
  return out;
}

function decodeBase64(value) {
  const bytes = [];
  for (let i = 0; i < value.length; i += 4) {
    const a = BASE64.indexOf(value[i]);
    const b = BASE64.indexOf(value[i + 1]);
    const c = value[i + 2] === "=" ? -1 : BASE64.indexOf(value[i + 2]);
    const d = value[i + 3] === "=" ? -1 : BASE64.indexOf(value[i + 3]);
    if (a < 0 || b < 0 || c === -2 || (c < 0 && value[i + 2] !== "=") || (d < 0 && value[i + 3] !== "=")) throw new Error("bad vocab record");
    const triple = (a << 18) | (b << 12) | ((c < 0 ? 0 : c) << 6) | (d < 0 ? 0 : d);
    bytes.push((triple >> 16) & 255);
    if (c >= 0) bytes.push((triple >> 8) & 255);
    if (d >= 0) bytes.push(triple & 255);
  }
  return bytes;
}

function encodeJson(value) {
  return encodeBase64(utf8Bytes(JSON.stringify(value)));
}

function decodeJson(value) {
  return JSON.parse(utf8Text(decodeBase64(value)));
}

function commentFor(record) {
  return `<!-- qiaomu-vocab:${encodeJson({
    lemma: record.lemma,
    surface: record.surface,
    bookPath: record.bookPath,
    bookTitle: record.bookTitle,
    location: record.location,
    dictionaryUsed: record.dictionaryUsed === true,
    anki: record.anki ?? null,
  })} -->`;
}

export function renderVocabEntry(record) {
  const lines = [`## ${record.lemma}`, ""];
  if (record.gloss) lines.push(record.gloss, "");
  if (record.sentence) lines.push(`> ${emphasize(record.sentence, record.surface || record.lemma)}`, "");
  if (record.bookTitle) lines.push(`来源：${record.bookTitle}`, "");
  lines.push(commentFor(record));
  return lines.join("\n");
}

function ankiId(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

function sectionAround(text, index) {
  const startAt = text.lastIndexOf("\n## ", index);
  const start = startAt === -1 ? 0 : startAt + 1;
  const next = text.indexOf("\n## ", index);
  return text.slice(start, next === -1 ? text.length : next);
}

function glossFromSection(section) {
  const lines = section.split("\n").slice(1);
  const body = [];
  for (const line of lines) {
    if (line.startsWith("> ") || line.startsWith("来源：") || line.startsWith("<!--")) break;
    body.push(line);
  }
  return body.join("\n").trim();
}

function sentenceFromSection(section) {
  const line = section.split("\n").find((item) => item.startsWith("> "));
  if (!line) return "";
  return line.slice(2).replace(/\*\*(.+?)\*\*/g, "$1").replace(/\\([\\*[\]_`])/g, "$1").trim();
}

export function parseVocabNote(markdown) {
  const text = String(markdown || "");
  const records = [];
  const seen = new Set();
  for (const match of text.matchAll(commentPattern())) {
    let data;
    try { data = decodeJson(match[1]); }
    catch { continue; }
    if (!data || typeof data.lemma !== "string" || !data.lemma || seen.has(data.lemma)) continue;
    seen.add(data.lemma);
    const section = sectionAround(text, match.index);
    records.push({
      lemma: data.lemma,
      surface: data.surface || data.lemma,
      gloss: glossFromSection(section),
      sentence: sentenceFromSection(section),
      bookPath: data.bookPath || "",
      bookTitle: data.bookTitle || "",
      location: data.location || "",
      dictionaryUsed: data.dictionaryUsed === true,
      anki: ankiId(data.anki),
    });
  }
  return records;
}

export function upsertVocabRecord(markdown, record) {
  const text = String(markdown || "");
  const existing = parseVocabNote(text).find((item) => item.lemma === record.lemma);
  if (existing) return { markdown: text, status: "exists", record: existing };
  const body = text.trim() ? `${text.replace(/\s*$/, "")}\n\n` : "# 生词本\n\n";
  return { markdown: `${body}${renderVocabEntry(record)}\n`, status: "added", record: { ...record, anki: null } };
}

export function markVocabAnkiId(markdown, lemma, id) {
  const noteId = ankiId(id);
  if (!lemma || !noteId) return String(markdown || "");
  return String(markdown || "").replace(commentPattern(), (full, encoded) => {
    let data;
    try { data = decodeJson(encoded); }
    catch { return full; }
    if (data.lemma !== lemma) return full;
    data.anki = noteId;
    return `<!-- qiaomu-vocab:${encodeJson(data)} -->`;
  });
}

export function ankiFields(record) {
  const surface = record.surface || record.lemma;
  const sentence = escapeHtml(record.sentence);
  const needle = escapeHtml(surface);
  const index = needle ? sentence.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  const marked = index < 0 ? sentence : `${sentence.slice(0, index)}<b>${sentence.slice(index, index + needle.length)}</b>${sentence.slice(index + needle.length)}`;
  return {
    Word: escapeHtml(record.lemma),
    Gloss: escapeHtml(record.gloss).replace(/\n/g, "<br>"),
    Sentence: marked,
    Source: escapeHtml(record.bookTitle),
    Attribution: record.dictionaryUsed ? VOCAB_ATTRIBUTION : "",
  };
}

export function ankiNote(record, deckName) {
  return {
    deckName: vocabDeckName(deckName),
    modelName: VOCAB_MODEL_NAME,
    fields: ankiFields(record),
    tags: ["qiaomu-vocab", vocabLemmaTag(record.lemma)],
    options: { allowDuplicate: false, duplicateScope: "deck" },
  };
}

export function ankiModelParams() {
  return {
    modelName: VOCAB_MODEL_NAME,
    inOrderFields: [...VOCAB_FIELDS],
    isCloze: false,
    css: ".card { font-family: sans-serif; font-size: 20px; text-align: left; color: black; background: white; } .word { font-size: 28px; } .source, .attr { color: #666; font-size: 14px; margin-top: 12px; }",
    cardTemplates: [{
      Name: "释义",
      Front: '<div class="word">{{Word}}</div>',
      Back: '<div class="word">{{FrontSide}}</div><hr><div class="gloss">{{Gloss}}</div><div class="sentence">{{Sentence}}</div><div class="source">{{Source}}</div><div class="attr">{{Attribution}}</div>',
    }],
  };
}

export async function ankiInvoke(post, action, params) {
  const response = await post({
    url: ANKI_CONNECT_URL,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, version: 6, params: params ?? {} }),
  });
  const data = response?.json ?? JSON.parse(String(response?.text || ""));
  if (!data || typeof data !== "object" || !("result" in data) || data.error) {
    throw Object.assign(new Error(data?.error || "AnkiConnect unavailable"), { anki: true });
  }
  return data.result;
}

export async function ensureAnkiVocabModel(invoke) {
  const names = await invoke("modelNames");
  if (!Array.isArray(names)) throw Object.assign(new Error("AnkiConnect unavailable"), { anki: true });
  if (!names.includes(VOCAB_MODEL_NAME)) {
    await invoke("createModel", ankiModelParams());
    return;
  }
  const fields = await invoke("modelFieldNames", { modelName: VOCAB_MODEL_NAME });
  const same = Array.isArray(fields) && fields.length === VOCAB_FIELDS.length && VOCAB_FIELDS.every((field, index) => fields[index] === field);
  if (!same) throw Object.assign(new Error("model-mismatch"), { anki: true });
}

export async function pushVocabToAnki(invoke, record, deckName) {
  if (record.anki) {
    await invoke("updateNoteFields", { note: { id: record.anki, fields: ankiFields(record) } });
    return record.anki;
  }
  const added = await invoke("addNote", { note: ankiNote(record, deckName) });
  if (added) return added;
  const found = await invoke("findNotes", { query: `tag:qiaomu-vocab tag:${vocabLemmaTag(record.lemma)}` });
  if (Array.isArray(found) && found[0]) {
    await invoke("updateNoteFields", { note: { id: found[0], fields: ankiFields(record) } });
    return found[0];
  }
  throw Object.assign(new Error("anki-rejected"), { anki: true });
}
