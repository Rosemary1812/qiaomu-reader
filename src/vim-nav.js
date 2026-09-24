// Pure Vim-style reading shortcuts (no modes / editing). Unit-testable without Obsidian.

export const VIM_NAV_SETTING = "vimNavKeys";
export const VIM_GG_WINDOW_MS = 800;

export function createVimChordState() {
  return { pendingG: 0 };
}

export function isTypingTarget(el) {
  if (!el) return false;
  if (el.nodeType === 3 && el.parentElement) return isTypingTarget(el.parentElement);
  if (typeof el.tagName !== "string") return false;
  const tag = el.tagName.toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  try {
    return !!el.closest?.("input,textarea,select,[contenteditable=true]");
  } catch {
    return false;
  }
}

export function scrollStepPx(viewportH) {
  const h = Number(viewportH) || 0;
  return Math.max(1, Math.round(h * 0.85));
}

/**
 * Map a keydown to a reader action, or null when the event is not ours.
 * ctx: { enabled, scrollMode, pendingG, now }
 * Returns { type, ... } | null. type "arm-g" means the caller should stamp pendingG.
 */
export function resolveVimNavAction(event, ctx) {
  if (!ctx || !ctx.enabled || !event) return null;
  if (event.isComposing || event.keyCode === 229) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;

  const key = event.key;
  const now = Number.isFinite(ctx.now) ? ctx.now : Date.now();
  const pendingG = Number(ctx.pendingG) || 0;
  const pendingFresh = pendingG > 0 && (now - pendingG) < VIM_GG_WINDOW_MS;
  const scrollMode = !!ctx.scrollMode;
  const shift = !!event.shiftKey;

  if (key === "g" && !shift) {
    if (pendingFresh) return { type: "book-start" };
    return { type: "arm-g", now };
  }

  if (key === "G") return { type: "book-end" };

  if (key === "j" && !shift) return { type: scrollMode ? "scroll-down" : "page-next" };
  if (key === "k" && !shift) return { type: scrollMode ? "scroll-up" : "page-prev" };

  if (key === " ") {
    if (scrollMode) return { type: shift ? "scroll-page-up" : "scroll-page-down" };
    return { type: shift ? "page-prev" : "page-next" };
  }

  if (key === "h" && !shift) return { type: "chapter-prev" };
  if (key === "l" && !shift) return { type: "chapter-next" };

  if (key === "o" && !shift) return { type: "panel-toc" };
  if (key === "n" && !shift) return { type: "panel-highlights" };
  if (key === "/" && !shift) return { type: "panel-find" };
  if (key === "f" && !shift) return { type: "toggle-immersive" };
  if (key === "Escape") return { type: "close-overlay" };

  return null;
}
