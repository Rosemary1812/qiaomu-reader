# Library cover update

Six starter EPUBs now include a locally generated SVG cover with distinct muted
palettes, title and author. Their combined compressed size increases from 600,166
to 603,151 bytes. No body illustrations or fonts were added. The reading spine,
chapter content and full source licenses remain unchanged.

For existing coverless books, the library generates the same cover from embedded
metadata and stores it in the thumbnail cache. It does not rewrite book files or
require reimport. Embedded artwork and book-note cover overrides retain priority.
Unparseable files keep a readable title placeholder rather than an empty tile.

Validation on 2026-09-09:

- 206 tests passed; i18n and ESLint passed; standard and community builds passed.
- Release artifact verification passed for the community build.
- Real Obsidian 1.13.7: all six old starter EPUBs displayed generated covers;
  a coverless FB2 displayed its metadata cover, and original MOBI/PDF artwork
  remained visible.
- Reopening the library rendered six cached covers without reparsing any books.
- At a 640-pixel emulated desktop viewport, all six covers rendered with no
  library horizontal overflow. This is not a physical mobile-device test.
- Updated plugin assets installed in the showcase and reading-demo vaults;
  the showcase plugin was disabled/enabled and its library reopened successfully.

This is a local development update after release 4.2.2. No published release
assets were replaced.


## 2026-09-09 — actual cover artwork

The six starter covers now use real published artwork: three historic Chinese cover scans from Wikimedia Commons, and three Standard Ebooks CC0 cover editions. Provenance, image URLs, processing and pinned hashes are in `assets/starter-books/covers/catalog.json`. Source edition differences are explicitly documented; no endorsement is claimed.

- Six JPEG images: 121,452 bytes; complete six-EPUB payload: 726,022 bytes.
- The project asset-size budget increases from 5.0 MB to 5.2 MB to accommodate the requested offline artwork; this is a project performance budget, not a claim about a marketplace limit. Community main.js measures 5,130,998 bytes. No new runtime dependency or network request is introduced.
- 208 tests pass, including one-time generated-cache migration, unrelated same-title identity rejection, embedded/custom cover precedence, failed-artwork fallback, cleanup and complete text/license retention. ESLint, i18n (1,277 keys), standard build, community build and installed-artifact verification pass.
- In `/private/tmp/QBR-4.2.1-Release-QA`, six already-imported coverless starter books display JPEG artwork after plugin reload. All original EPUB SHA-256 values match before/after; source files were not rewritten. Existing MOBI/PDF covers remain in the cache.
- Reopening the library: six covers, zero thumbnail parser calls. At 640 px viewport: six covers, no horizontal overflow. This is desktop narrow-layout verification, not physical mobile testing.
- Screenshot: `/tmp/qbr-real-six-covers.png`.
- Installed community artifacts into both showcase plugin directories. The running root showcase plugin was disabled/enabled through Obsidian settings and its library restored; the nested demo install loads on its next reload.
- Local feature branch only; no new public release or replacement of published release assets.
