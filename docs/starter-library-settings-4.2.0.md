# Settings alignment and offline starter library — 2026-09-09

## Changes

- Retain six task-oriented settings groups; shorten the first two navigation labels to 阅读外观 and 翻页操作. Keep navigation on one row, with horizontal scrolling for narrow containers.
- Remove the redundant appearance heading. Scope padding overrides to the plugin settings root: Obsidian 1.13 adds horizontal padding to native headings and the outer setting item, which previously shifted headings away from descriptions.
- Include six offline, text-only EPUBs from Project Gutenberg. Preserve the full source text, credits and Gutenberg license; no illustrations, cover images or embedded fonts. Western titles are English editions. 世说新语 is complete.
- Install once when opening an empty library. Existing libraries are left alone; explicit 添加示例书 is available under 存储与同步 and in the empty state. Journal installation, resume partial writes, preserve existing files and respect subsequent deletion.
- Show full book titles on image-free library cards.

See [source and edition details](../assets/starter-books/README.md). Total EPUB payload: 600,166 bytes (586.1 KiB). Books retain their own licensing separately from the plugin.

## Validation

- 182 automated tests passed, including installation concurrency, existing-library skip, deletion/manual restoration, partial-write recovery and journal failure.
- All six EPUBs checked for ZIP/XML structure, manifest/spine references, complete source-text and license preservation, and absence of images/fonts/scripts.
- ESLint, localization check (1,250 keys), standard build, community build/release verification and `git diff --check` passed.
- Standard build installed and hash-verified in both `乔木阅读演示` and `qbr-showcase.0EQu1N`. main.js: 4,944,372 bytes. No publication or release was performed.
- Real Obsidian 1.13.7 desktop: isolated empty-folder library opened with a plugin facade and separate installation journal; all six cards appeared. Recreating the installer from the journal did not rewrite files. This avoided changing the user's configured book folder.
- Final EPUBs opened through the real reader in `首启书库验收/最终版本`: 道德经 has 82 TOC entries, navigated to chapter one and advanced to chapter two with changed CFI and visible text. Alice in Wonderland has 14 TOC entries; navigation and next-page changed CFI and visible text within chapter one.
- Independent settings window checked visually and through DOM geometry: heading, introduction and setting labels share the same left edge. At 611px navigation width, tabs occupy one 39px row. Arrow-key tab activation retains focus.
- Desktop log retains earlier ResizeObserver notifications and a diagnostic-eval error from before the final checks; this record does not assert a globally clean application log. No mobile/device acceptance or full reading of all six books was performed.

Existing reading data was preserved. Tests and live desktop checks establish this local change; they are not evidence of marketplace acceptance or worldwide copyright status.
