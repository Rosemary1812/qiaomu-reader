# Five-page first-run guide

The first-run guide now introduces five tasks: library/import, reading appearance,
highlights/annotations, Markdown notes with source links, and optional AI help.
Each page has one icon and a short paragraph. Skip and Start reading both open the
library. Closing the guide records it as seen; it can be reopened from the command
palette. Text is translated when rendered so it follows the current UI language.

## Validation (2026-09-09)

- Existing automated suite: 195 passed; no failures.
- ESLint: no warnings. Translation check: 1,277 keys across nine languages.
- Standard and community builds passed; installed community asset hashes verified.
- Obsidian 1.13.7, isolated `QBR-4.2.1-Release-QA` vault: all five pages render an
  icon and five navigation controls. Next, previous, direct step navigation, Skip,
  and Start reading exercised through the running desktop DOM.
- Start and Skip close the modal and activate the library; onboarded state is true.
- Six starter books appeared in the clean QA library. Screenshot inspected for
  spacing and step indicator contrast.

This covers desktop onboarding. It does not certify mobile behavior or the entire
release, and no public release was created as part of this change.
