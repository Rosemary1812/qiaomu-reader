// Qiaomu Context Protocol, version 1 (JavaScript port).
//
// The TypeScript original with full type definitions lives in the qiaomu-agent repository:
// src/integrations/qiaomu-context.ts, spec in docs/integrations/qiaomu-context-protocol.md.
// Plugins never import each other; they find each other through `app.plugins` at the moment of use.
//
// - A context source sets `plugin.qiaomuContext = { protocol, version, snapshot(leaf) }`.
// - Qiaomu Agent sets `plugin.api = { protocol: "qiaomu-agent", version, ask({ context, prompt }) }`.
// - A source triggers CONTEXT_CHANGED_EVENT on the workspace when its page or selection changes.
//
// Versioning: version 1 may gain optional fields and optional methods; check for them before use and
// ignore unknown ones. Only a breaking change raises the version, and a mismatch reads as "absent".
//
// A snapshot is { sourceId, sourceName, kind: "article"|"book"|"document"|"page"|"other", title,
// url?, path?, author?, published?, location?, text?, truncated?, selection?: { text, location? } }.

export const CONTEXT_PROTOCOL = "qiaomu-context";
export const AGENT_PROTOCOL = "qiaomu-agent";
export const CONTEXT_VERSION = 1;
export const AGENT_PLUGIN_ID = "qiaomu-agent";
export const CONTEXT_CHANGED_EVENT = "qiaomu-context:changed";
export const MAX_CONTEXT_TEXT = 60_000;
export const MAX_SELECTION_TEXT = 20_000;

/** The installed, enabled and compatible Qiaomu Agent API, or null. Check at the moment of use. */
export function findAgent(app) {
  const api = app?.plugins?.plugins?.[AGENT_PLUGIN_ID]?.api;
  return api?.protocol === AGENT_PROTOCOL && api.version === CONTEXT_VERSION && typeof api.ask === "function" ? api : null;
}

export function contextProvider(snapshot) {
  return { protocol: CONTEXT_PROTOCOL, version: CONTEXT_VERSION, snapshot };
}

export function notifyContextChanged(app, sourceId) {
  app?.workspace?.trigger?.(CONTEXT_CHANGED_EVENT, sourceId);
}

/** Cuts text to `limit` characters on a paragraph or sentence boundary when one is close. */
export function clipText(text, limit) {
  const value = String(text ?? "").trim();
  if (value.length <= limit) return { text: value, truncated: false };
  const cut = value.slice(0, limit);
  const boundary = Math.max(cut.lastIndexOf("\n\n"), cut.lastIndexOf("。"), cut.lastIndexOf(". "));
  return { text: (boundary > limit * 0.8 ? cut.slice(0, boundary + 1) : cut).trimEnd(), truncated: true };
}
