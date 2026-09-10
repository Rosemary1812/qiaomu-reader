# 4.2.7 reading companion and translation saves

## Behavior

- Wide desktop windows introduce AI 伴读 on book open; explicit closing/collapsing is remembered. Mobile and windows below 1000 CSS pixels do not auto-open it. The reader keeps focus and the existing sidebar tabs remain available.
- An unconfigured sidebar provides the same progressively disclosed service/model settings. Connection testing starts only after an explicit action and uses no book content. Selection updates the pending context; opening does not prewarm a model session.
- Translation results save the original, translation and location link to the book note, a captured open Markdown note, a new note or the core Daily Note. The core Daily Notes adapter is optional and guarded; it delegates date, folder and template behavior to Obsidian.
- Current-note writes preserve editor content and reject closed/switched targets. Appends and creation are serialized, existing excerpts are not duplicated, and a saved result remains open.

## Local verification

232 automated tests pass. ESLint (zero warnings), nine-language validation (1292 keys), standard build and asset verification, and community-profile build pass.

Isolated Obsidian 1.13.7 tests:

- First book opens the unconfigured companion, preserves reader focus, and uses one sidebar tab group. Closing it keeps it closed for the next book.
- Inline custom-service setup verifies a local HTTP test endpoint only after Start using is clicked; then the composer becomes usable. This tests the setup/transport flow, not the capabilities of a real model provider.
- Actual Google translation of an English passage returns a Chinese result.
- All four save destinations are written and read back. An open note retains its editor draft; Daily Notes respects a nested YYYY/MM date path and a configured template. Each target contains one translation and its CFI source link.
- The saved Markdown location link returns from a later chapter to the original passage. Because this is an isolated app profile, the clicked URI is dispatched to that profile's registered protocol handler rather than the operating system's default Obsidian profile.

Release evidence (final SHA, official scans, downloaded-asset hashes and installation/upgrade checks) is recorded in the release description after its gates finish. This local record is not proof of publication. No physical mobile-device acceptance is claimed.
