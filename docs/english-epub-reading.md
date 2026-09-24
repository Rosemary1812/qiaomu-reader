# English EPUB reading assistance

The in-reader typography settings provide a CEFR level, an opt-in Chinese gloss overlay, and an on/off switch for automatic AI translation of selected English passages. Double-clicking an English word requests a contextual short definition. The configured AI service is used for both definitions and passage translations; no Google Translate request is made by these actions. The existing manual translation action remains separate.

The offline CEFR index is derived from the 45,000 most frequent alphabetic entries in [Words CEFR Dataset](https://github.com/bonkey/words-cefr-dataset), under its MIT license (see `licenses/words-cefr-MIT.txt`). It estimates word difficulty, not the meaning. Unknown words and capitalized names are skipped. For glosses, up to 20 visible uncached words are sent with local context to the user's configured AI provider in one request, and short results are cached for the current plugin session. The selected text or word and surrounding paragraph are sent for explicit translation or lookup. AI is never contacted for glosses while the setting is off or the service is not ready.

Annotations are painted in a shadow-root overlay over the EPUB iframe. They do not split or replace book text nodes, which foliate-js uses for CFIs, highlights, and search. Enabling glosses raises the paragraph line height to give the small labels room; the engine repaginates when the setting changes.

Manual acceptance checks in Obsidian with an English EPUB:

1. Enable AI assistance, then enable glosses and switch between B1 and C1. Check that annotations thin out and page turns, search, highlights, and position restoration still work.
2. Double-click a word; check the contextual card and that no second translation card appears. Drag-select a sentence; check that the AI translation appears near the selection while selection actions still work.
3. Disable AI or disconnect the provider, then double-click and drag-select. Check the configuration action and ensure automatic gloss requests stop.
4. Repeat selection, page navigation, and settings on a narrow/mobile view and on a non-English or PDF book. The new interactions should be scoped to English EPUB text.

No live Obsidian session is included in automated tests. The CEFR dataset can misclassify inflected or polysemous words; model glosses can also be inaccurate. The existing Google Translate selection action continues to work independently.
