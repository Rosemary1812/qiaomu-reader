# Progressive settings and quiet UI — local acceptance

Date: 2026-09-09. Scope: local 4.2.0 working tree; no publication.

## Behavior

- AI setup starts with service, model, required credentials and actual readiness. CLI paths, ACP installation/diagnostics, response preferences and optional connection overrides are collapsed under advanced settings.
- Existing custom models remain selectable. Missing API keys and custom-service endpoints remain visible when needed. A failed connection shows an inline recovery action; configuration changes invalidate verification.
- Note templates, quote formatting, storage/sync internals and cleanup use collapsed groups while primary actions and blocking recovery stay visible.
- Plugin hover triggers are removed while accessible names remain available through `aria-labelledby`. Slider values are visible inline. Obsidian and other plugins are outside the suppression scope; necessary tooltip exceptions can be explicit.
- Observers clean up when plugin windows close or the plugin unloads, including independent settings windows.

## Verification

- 195 tests passed, including seven new disclosure/accessibility tests. Changed runtime and new test files passed ESLint without warnings. Internationalization check passed for 1267 keys. Standard and community builds and asset verification passed; `git diff --check` passed.
- Installed assets were hash-verified in `qbr-showcase.0EQu1N` and `乔木阅读演示`. Both were reloaded after the final cleanup change; runtime confirmed the plugin and window-unload cleanup loaded.
- Real Obsidian 1.13.7 setup initially displayed only service and model rows, with advanced sections closed and no horizontal overflow. Accessible service/model names remained intact. Hovering those controls produced no tooltip; host controls were not altered.
- Actual Codex CLI connection test succeeded through the setup test-and-enable flow: reported model `Codex CLI`, latency 8194 ms. The test used a brief connection message without book content. This verifies the existing local account, not all providers or mobile environments.
- UI capture: （本地验收记录，未随仓库发布）.

## Durable preferences

The user's explicit preference was recorded in project `AGENTS.md`, the Obsidian development skill's `references/product-ux.md`, a Codex memory extension and a private preference record: progressively reveal complexity, and disable unnecessary hover tooltips by default while retaining accessibility and recovery feedback.
