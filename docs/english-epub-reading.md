# English EPUB reading assistance

Selecting or double-clicking a word opens an offline English–Chinese dictionary entry, even when AI assistance is disabled. The card shows up to three short senses and, for inflected words, the matched lemma. When AI is ready, a separate **Explain in context** button can request a contextual explanation. Selecting a sentence or passage uses the configured AI provider only when **Translate selected passages with AI** is enabled. The manual translation action remains separate.

The **Chinese glosses above words** option combines an offline CEFR index with the offline dictionary. It shows short glosses for words above the selected level without contacting any service. Unknown proper names and words missing from the dictionary are skipped. Reflowable books draw annotations on foliate-js's overlayer outside the EPUB iframe; fixed-layout books use an iframe overlay. Neither changes EPUB text nodes used for CFIs, highlights, search, and saved locations. Candidate ranges are checked against the actual reading viewport in both axes so words in other pagination columns cannot consume the visible-page limit. A dictionary loading failure gives a recovery notice rather than silently leaving the page blank.

## Data and distribution

The CEFR index is derived from the 45,000 most frequent alphabetic entries in [Words CEFR Dataset](https://github.com/bonkey/words-cefr-dataset), licensed under MIT (`licenses/words-cefr-MIT.txt`). It estimates difficulty, not meaning.

The dictionary is derived from [FreeDict+WikDict English–Chinese 2025.11.23](https://freedict.org/downloads/), which credits Wiktionary via DBnary and licenses the dictionary under CC BY-SA 3.0. The original source archive's SHA-512 is `25aed0f1d7de68919aa9da1ba92d67f566ae4ea81660f42071c81fc21e56d4b210d61df379315678648c45ca7e52c4a0ba2eec009fbaab7c72e7472489e1fc4c`. `scripts/generate-english-dictionary.mjs` extracts English headwords, converts translations to simplified Chinese, and retains up to three short senses, producing `src/english-dictionary.json`. The adapted data remains under CC BY-SA 3.0; its full license is in `licenses/freedict-eng-zho-CC-BY-SA-3.0.txt` and the release CSS. To regenerate after downloading the named archive, run `node scripts/generate-english-dictionary.mjs <archive-path>`.

The release still contains only `main.js`, `styles.css`, and `manifest.json`. The build compresses the dictionary into `styles.css`; the runtime decompresses it once and keeps it in memory. Dictionary lookup and glosses do not send book text to a server. An explicit contextual word explanation and enabled sentence translation do send the selected text and relevant context to the configured AI provider.

## Verification

Run `npm test`, `npm run build`, `npm run verify:release`, and `npm run build:community`. In Obsidian, verify double-click lookup with AI off, optional contextual explanation with AI on, glosses across several pages and B1/C1 levels, and sentence translation with its toggle on/off. Check a narrow view and page-turn/search/highlight restoration. The lexicon is finite and may have incorrect or incomplete senses; short automatic glosses do not resolve context as well as an explicit explanation.
