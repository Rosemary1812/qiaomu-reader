# Library blank-page regression (4.2.8)

## Cause and change

A saved CFI can refer to a section which no longer exists in the current book. Foliate's `init()` can resolve successfully without loading any section; other invalid anchors throw. The adapter previously treated either outcome as a successful open and swallowed initialization exceptions, leaving a blank reader. Selecting a TOC entry bypasses the stale location and loads the book normally.

Opening now requires both a loaded document and a reported location. Failed CFI restoration attempts the stored reading fraction, then the book's text start. If neither loads, the existing book-load error/retry surface appears. Cancellation stops recovery, and a valid CFI remains untouched. Desktop and modal readers pass the saved fraction to the same engine.

## Evidence

- Reproduced in isolated Obsidian 1.13.7 with the bundled Jekyll and Hyde EPUB and a saved out-of-range CFI: library double-click opened an empty reader with no contents/location; selecting the first TOC entry immediately displayed text.
- The patched build opens the same fixture with readable text in section 4, approximately the prior 40% progress, without needing the TOC.
- Regression coverage checks valid CFIs, rejected and silently ignored locations, percentage fallback, missing percentages/hidden initial navigation, complete failure and cancellation. Existing lifecycle, layout, highlight and persistence coverage remains enabled.
- No claim that every blank-page report has the same cause; the user's specific book was not supplied. Physical mobile devices are not covered by this desktop test.
