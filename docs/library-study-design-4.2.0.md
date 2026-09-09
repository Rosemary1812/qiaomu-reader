# Library study workflow — 2026-09-09

The library now prioritizes resuming reading and retrieving highlights/notes, while keeping recognizable book covers.

- Remove cover-size plus/minus controls and obsolete sizing code. CSS owns responsive grid and cover proportions, without repeated resize writes.
- Compact header, smaller covers, restrained shadows and neutral progress strips. Narrow panes use two columns when space permits.
- Show a compact continuation card for the most recently read unfinished book, with a real saved excerpt when available.
- Add the 有划线 filter and direct per-book highlight-count and reading-note actions. Note links open existing notes or use the existing note creation flow.
- Preserve nested-control keyboard behavior: activating a note or menu does not also open the book. Opening an already visible highlights panel does not close it.
- Prevent overlapping asynchronous library refreshes from duplicating grids.
- Repair stale cover caches: old object URLs are regenerated; new embedded covers are persisted as data URLs. Only hide the text fallback after successful image decode.

## Design references

- [Readwise: organizing content](https://docs.readwise.io/reader/docs/organizing-content): filters can reflect highlights and reading workflow.
- [Apple Books: collections](https://support.apple.com/en-ie/guide/books/ibks33867842/mac): distinguish reading collections and completion states.
- [Goodreads: default reading shelves](https://www.goodreads.com/blog/show/3115-new-top-requested-reader-feature-did-not-finish-shelf): clear reading-state organization.

## Verification

- 188 tests passed, including six new library interaction/cache/refresh tests.
- ESLint passed without warnings for changed runtime files and the new tests. Node-only test lint settings are scoped to tests.
- Localization check passed (1,256 keys); standard build, community build/verification, installed-asset hash verification and diff whitespace checks passed.
- Installed locally in `qbr-showcase.0EQu1N` and `乔木阅读演示`; no push or publication.
- Real Obsidian 1.13.7 desktop: five books render once; 有划线 shows the four books with saved highlights. Clicking 三国演义's highlight count opens its actual highlights panel. Its note action opens the existing `划线回跳验收` note.
- Search with no matching title produces the empty-result message; clearing restores the cards. Existing book/highlight/note data was retained.
- Real separate library window checked at 1,024px and 430px; the narrow view has two columns and no horizontal overflow. This is desktop narrow-window coverage, not a mobile-device test.
- Reloaded runtime caches contain durable data URLs; the previously blank 三国演义 cover now appears. Desktop screenshots: （本地验收记录，未随仓库发布）, （本地验收记录，未随仓库发布）.

Broader reader, AI-provider and mobile-device acceptance is outside this library-focused validation.
