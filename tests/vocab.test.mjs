import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  VOCAB_ATTRIBUTION, VOCAB_DECK_DEFAULT, VOCAB_FIELDS, VOCAB_MODEL_NAME,
  ankiFields, ankiNote, buildVocabRecord, ensureAnkiVocabModel, markVocabAnkiId,
  parseVocabNote, pushVocabToAnki, upsertVocabRecord, vocabContextGloss, vocabDeckName,
  vocabularyNotePath,
} from "../src/vocab.js";

const entry = { lemma: "ameliorate", senses: [["v", "改善"], ["v", "改良"]] };
const record = buildVocabRecord({
  surface: "ameliorate",
  entry,
  sentence: "The reform will ameliorate <conditions>.",
  contextGloss: "结合语境：使变好",
  bookPath: "Books/Alice.epub",
  bookTitle: "爱丽丝 --> Wonderland",
  location: "epubcfi(/6/4)",
});

test("a word is stored once, under its lemma, without calling out", () => {
  assert.equal(buildVocabRecord({ surface: "went", entry: { lemma: "go", senses: [["v", "去"]] } }).lemma, "go");
  assert.equal(buildVocabRecord({ surface: "QiaomuReader" }).lemma, "qiaomureader");
  assert.equal(buildVocabRecord({ surface: "QiaomuReader" }).dictionaryUsed, false);
  assert.equal(vocabContextGloss("正在生成…"), "");
  assert.equal(vocabContextGloss("解释失败：超时"), "");
  assert.equal(record.dictionaryUsed, true);
  assert.equal(record.gloss.includes("使变好"), true);
  assert.equal(record.gloss.includes("v. 改善"), true);
  assert.equal(vocabDeckName("  "), VOCAB_DECK_DEFAULT);
  assert.equal(vocabDeckName("英语"), "英语");
  assert.equal(vocabularyNotePath("Notes/Reader"), "Notes/Reader/Vocabulary.md");
  assert.equal(vocabularyNotePath(""), "Vocabulary.md");
});

test("the vocabulary note round-trips edits and keeps Anki ids off until sync", () => {
  const first = upsertVocabRecord("", record);
  assert.equal(first.status, "added");
  assert.match(first.markdown, /^# 生词本\n\n## ameliorate\n/);
  assert.match(first.markdown, /> The reform will \*\*ameliorate\*\* <conditions>\./);
  assert.match(first.markdown, /来源：爱丽丝 --> Wonderland/);
  assert.match(first.markdown, /<!-- qiaomu-vocab:[A-Za-z0-9+/=]+ -->/);
  const edited = first.markdown.replace("结合语境：使变好", "手改释义");
  const parsed = parseVocabNote(edited);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].gloss.startsWith("手改释义"), true);
  assert.equal(parsed[0].sentence, "The reform will ameliorate <conditions>.");
  assert.equal(parsed[0].bookTitle, "爱丽丝 --> Wonderland");
  assert.equal(parsed[0].anki, null);
  const again = upsertVocabRecord(edited, { ...record, sentence: "A different sentence." });
  assert.equal(again.status, "exists");
  assert.equal(again.markdown, edited);
  assert.equal(again.record.sentence.includes("reform"), true);
  const marked = markVocabAnkiId(edited, "ameliorate", 42);
  assert.equal(parseVocabNote(marked)[0].anki, 42);
  assert.equal(parseVocabNote(marked)[0].gloss.startsWith("手改释义"), true);
});

test("Anki cards escape text, attribute the dictionary, and collapse duplicate lemmas", async () => {
  const fields = ankiFields(record);
  assert.equal(fields.Word, "ameliorate");
  assert.equal(fields.Sentence.includes("<b>ameliorate</b>"), true);
  assert.equal(fields.Sentence.includes("&lt;conditions&gt;"), true);
  assert.equal(fields.Sentence.includes("<conditions>"), false);
  assert.equal(fields.Attribution, VOCAB_ATTRIBUTION);
  const unknown = ankiFields(buildVocabRecord({ surface: "qiaomureader", sentence: "A qiaomureader." }));
  assert.equal(unknown.Attribution, "");
  const note = ankiNote(record, "");
  assert.equal(note.deckName, "生词本");
  assert.equal(note.modelName, VOCAB_MODEL_NAME);
  assert.equal(note.options.allowDuplicate, false);
  assert.deepEqual(Object.keys(note.fields), [...VOCAB_FIELDS]);

  const calls = [];
  const invoke = async (action, params) => {
    calls.push([action, params]);
    if (action === "modelNames") return [];
    if (action === "createModel") return VOCAB_MODEL_NAME;
    if (action === "addNote") return null;
    if (action === "findNotes") return [99];
    if (action === "updateNoteFields") return null;
    throw new Error(action);
  };
  await ensureAnkiVocabModel(invoke);
  const id = await pushVocabToAnki(invoke, record, "生词本");
  assert.equal(id, 99);
  assert.equal(calls[0][0], "modelNames");
  assert.equal(calls[1][0], "createModel");
  assert.equal(calls[1][1].modelName, VOCAB_MODEL_NAME);
  assert.deepEqual(calls[1][1].inOrderFields, [...VOCAB_FIELDS]);
  assert.equal(calls[2][0], "addNote");
  assert.equal(calls[3][1].query, "tag:qiaomu-vocab tag:lemma-ameliorate");
  const updated = await pushVocabToAnki(invoke, { ...record, anki: 99 }, "生词本");
  assert.equal(updated, 99);
  assert.equal(calls.at(-1)[0], "updateNoteFields");
  await assert.rejects(
    ensureAnkiVocabModel(async (action) => action === "modelNames" ? [VOCAB_MODEL_NAME] : ["Word"]),
    (error) => error.message === "model-mismatch",
  );
});

test("the word card saves locally and syncs through the desktop command", () => {
  const source = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  assert.match(source, /收入生词本/);
  assert.match(source, /同步生词到 Anki/);
  assert.match(source, /vocabAnkiDeck/);
  assert.match(source, /Platform\.isDesktopApp/);
});
