# Changelog

This file records user-visible changes in the unofficial enhanced fork maintained at [Rosemary1812/qiaomu-reader](https://github.com/Rosemary1812/qiaomu-reader). The upstream project is [joeseesun/qiaomu-reader](https://github.com/joeseesun/qiaomu-reader).

## 4.2.18 — Unreleased

### Fork enhancements

- Added a one-year reading heatmap on the library and in reading statistics. Squares follow the daily goal, and reading days are kept for 400 days.
- Added offline English word lookup and optional page glosses; longer selections can still use AI assistance.
- English word cards can save a word to the vault vocabulary note and, when Anki desktop is open, to the deck 生词本. Phone reading keeps the note and syncs cards later from the desktop.
- Shelf collections group books for browsing without moving their files, and the shelf can switch between the cover grid and a list.
- English page glosses now include sentence-initial words, skip labels that would overlap, and open the dictionary card when clicked.
- Added continuous EPUB scrolling across chapter boundaries and stabilized downward scrolling from book covers.
- Highlighted the current chapter in the contents panel.
- Added Vim-style reader navigation, Windows shortcut handling, and the OpenDyslexic reading font.
- Improved library actions, cover display, Calibre imports, and Grok ACP discovery from GUI-launched Obsidian.

### Upstream fixes integrated on 2026-09-26

- Integrated upstream credential-setting and translated provider-summary fixes through 4.2.13.
- Integrated the bounded-memory large-PDF implementation from 4.2.14.
- Integrated the iOS PDF opening fix from 4.2.15.
- Integrated immersive-reading continuity and the DeepSeek thinking-answer budget fix through 4.2.17.

### Compatibility

- This fork currently keeps the upstream plugin ID `qiaomu-reader`, so it cannot be installed alongside the official build.
- Upstream 4.3.0 Qiaomu Agent support is not included yet; it will be evaluated separately against this fork's existing AI companion workflow.
