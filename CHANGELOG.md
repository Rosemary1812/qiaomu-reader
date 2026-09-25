# Changelog

This file records user-visible changes in the unofficial enhanced fork maintained at [Rosemary1812/qiaomu-reader](https://github.com/Rosemary1812/qiaomu-reader). The upstream project is [joeseesun/qiaomu-reader](https://github.com/joeseesun/qiaomu-reader).

## 4.2.18 — Unreleased

### Fork enhancements

- Added offline English word lookup and optional page glosses; longer selections can still use AI assistance.
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
