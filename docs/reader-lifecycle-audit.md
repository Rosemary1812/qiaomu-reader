# Reader lifecycle audit — 2026-09-10

Scope: opening/closing and switching books, navigation, history, bookmarks, highlight restoration, background windows, and PDF rendering. This is the 4.2.9 release candidate, not a published release or an official scan result.

## Architecture boundary

EPUB, MOBI/AZW, FB2 and CBZ use EpubEngine exclusively. Ebook destinations use CFI (or the engine's percentage navigation), never the PDF block/spread model. The remaining paginator is named PdfPaginator, rejects non-PDF markup, and no longer includes the old ebook typography/style generator. Old block-only ebook links are rejected; old ebook bookmark entries are not offered as working destinations. Existing source books and note files are not deleted. PDF original-page rendering, its text interaction layer and page/block destinations remain independent.

## Confirmed defects and changes

- A pending highlight-restoration loop could use a newly selected book's engine. It now captures the original engine/path and stops on a switch or close.
- Closing an unfinished PDF could persist the empty pager's first position. Unfinished loads cannot persist a final position for any format.
- Mobile/modal ebook TOC and desktop/modal history still used the PDF pager. They now use the ebook engine. New history snapshots retain CFI; percentage navigation also uses the engine.
- Ebook named bookmarks required a PDF flow and could not be created. They now store CFI and restore through the engine. The return-to-reading action also captures CFI.
- Foliate can resolve an out-of-range destination without rendering it. Navigation validates the section and confirms a rendered destination; UI failures no longer become an unhandled search/TOC rejection or success notice.
- Reopening one adapter retained its previous parser/observer. Open now disposes its previous view first; cancellation tests check exactly-once parser release.
- Hidden Obsidian windows suspend RAF. Awaiting two frames before reveal could stall opening indefinitely. Frame waits now have a bounded timer fallback with callback cleanup.
- PDF rendering begun in a hidden document could exhaust rendering budgets while RAF was suspended. Rendering waits for document visibility and resumes on visibility/active-leaf events.
- A PDF sweep continued after switching/closing and could attach late images or errors. It now validates the captured renderer and pager before each page and before applying a render result.

The suspected failed-load retry flag was inspected and already cleared by renderReaderLoadError; no speculative change was made for it.

## Verification

- 242 automated tests pass; ESLint zero warnings, internationalization validation, standard build/release verification and community build pass.
- Before fixes, regression tests reproduced PDF position overwrite, cross-book highlight painting, mobile TOC using the PDF pager, and missing parser disposal.
- Isolated Obsidian 1.13.7: ebook fraction navigation, exact CFI history restoration, TOC, next/previous and rejection of an out-of-range CFI pass.
- The modal reader was instantiated in the real desktop host with its mobile route selected: actual TOC-item click, history restoration, bookmark dialog save and bookmark-item click restore the expected CFI. This is simulated mobile routing, not physical mobile verification.
- A hidden document reproduced the stalled RAF. After the fix, PDF loading completes; with foreground state emulated through CDP, both original PDF page images decode at 1210 pixels wide. A screenshot verifies original-page layout and text-layer alignment.
- Repeated and concurrent book switching are exercised in the isolated host; no user vault was modified by this audit.

## Boundaries

No claim of zero bugs, a full heap-leak proof, physical mobile coverage, or testing every publisher's EPUB/MOBI/CBZ file. This audit does not remove PDF support, third-party PDF.js's supported browser build, unrelated settings migrations, or note-preservation safeguards. Public release assets were not replaced by this development build.
