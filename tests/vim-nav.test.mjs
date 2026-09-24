import test from "node:test";
import assert from "node:assert/strict";
import {
  VIM_NAV_SETTING,
  VIM_GG_WINDOW_MS,
  createVimChordState,
  isTypingTarget,
  resolveVimNavAction,
  scrollStepPx,
} from "../src/vim-nav.js";

function key(name, extras = {}) {
  return {
    key: name,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    isComposing: false,
    keyCode: 0,
    ...extras,
  };
}

test("exports setting key and chord window", () => {
  assert.equal(VIM_NAV_SETTING, "vimNavKeys");
  assert.equal(VIM_GG_WINDOW_MS, 800);
  assert.deepEqual(createVimChordState(), { pendingG: 0 });
});

test("scrollStepPx is about 85% of viewport", () => {
  assert.equal(scrollStepPx(1000), 850);
  assert.equal(scrollStepPx(0), 1);
});

test("isTypingTarget detects inputs", () => {
  assert.equal(isTypingTarget(null), false);
  assert.equal(isTypingTarget({ tagName: "DIV", isContentEditable: false }), false);
  assert.equal(isTypingTarget({ tagName: "INPUT", isContentEditable: false }), true);
  assert.equal(isTypingTarget({ tagName: "TEXTAREA", isContentEditable: false }), true);
  assert.equal(isTypingTarget({ tagName: "DIV", isContentEditable: true }), true);
});

test("disabled or composing or modifiers are ignored", () => {
  const base = { enabled: true, scrollMode: false, pendingG: 0, now: 1000 };
  assert.equal(resolveVimNavAction(key("j"), { ...base, enabled: false }), null);
  assert.equal(resolveVimNavAction(key("j", { isComposing: true }), base), null);
  assert.equal(resolveVimNavAction(key("j", { keyCode: 229 }), base), null);
  assert.equal(resolveVimNavAction(key("j", { ctrlKey: true }), base), null);
  assert.equal(resolveVimNavAction(key("j", { metaKey: true }), base), null);
  assert.equal(resolveVimNavAction(key("j", { altKey: true }), base), null);
});

test("j/k scroll in scroll mode, page in pages mode", () => {
  const pages = { enabled: true, scrollMode: false, pendingG: 0, now: 1 };
  const scroll = { enabled: true, scrollMode: true, pendingG: 0, now: 1 };
  assert.deepEqual(resolveVimNavAction(key("j"), pages), { type: "page-next" });
  assert.deepEqual(resolveVimNavAction(key("k"), pages), { type: "page-prev" });
  assert.deepEqual(resolveVimNavAction(key("j"), scroll), { type: "scroll-down" });
  assert.deepEqual(resolveVimNavAction(key("k"), scroll), { type: "scroll-up" });
});

test("Space and Shift+Space", () => {
  const pages = { enabled: true, scrollMode: false, pendingG: 0, now: 1 };
  const scroll = { enabled: true, scrollMode: true, pendingG: 0, now: 1 };
  assert.deepEqual(resolveVimNavAction(key(" "), pages), { type: "page-next" });
  assert.deepEqual(resolveVimNavAction(key(" ", { shiftKey: true }), pages), { type: "page-prev" });
  assert.deepEqual(resolveVimNavAction(key(" "), scroll), { type: "scroll-page-down" });
  assert.deepEqual(resolveVimNavAction(key(" ", { shiftKey: true }), scroll), { type: "scroll-page-up" });
});

test("h/l chapters, o/n/, Esc, f immersive", () => {
  const ctx = { enabled: true, scrollMode: false, pendingG: 0, now: 1 };
  assert.deepEqual(resolveVimNavAction(key("h"), ctx), { type: "chapter-prev" });
  assert.deepEqual(resolveVimNavAction(key("l"), ctx), { type: "chapter-next" });
  assert.deepEqual(resolveVimNavAction(key("o"), ctx), { type: "panel-toc" });
  assert.deepEqual(resolveVimNavAction(key("n"), ctx), { type: "panel-highlights" });
  assert.deepEqual(resolveVimNavAction(key("/"), ctx), { type: "panel-find" });
  assert.deepEqual(resolveVimNavAction(key("Escape"), ctx), { type: "close-overlay" });
  assert.deepEqual(resolveVimNavAction(key("f"), ctx), { type: "toggle-immersive" });
});

test("gg chord and G book end", () => {
  const now = 5000;
  const armed = resolveVimNavAction(key("g"), { enabled: true, scrollMode: false, pendingG: 0, now });
  assert.deepEqual(armed, { type: "arm-g", now });
  assert.deepEqual(
    resolveVimNavAction(key("g"), { enabled: true, scrollMode: false, pendingG: now, now: now + 200 }),
    { type: "book-start" },
  );
  assert.deepEqual(
    resolveVimNavAction(key("g"), { enabled: true, scrollMode: false, pendingG: now, now: now + VIM_GG_WINDOW_MS + 1 }),
    { type: "arm-g", now: now + VIM_GG_WINDOW_MS + 1 },
  );
  assert.deepEqual(
    resolveVimNavAction(key("G"), { enabled: true, scrollMode: false, pendingG: 0, now }),
    { type: "book-end" },
  );
});

test("uppercase J/K are not remapped", () => {
  const ctx = { enabled: true, scrollMode: true, pendingG: 0, now: 1 };
  assert.equal(resolveVimNavAction(key("J"), ctx), null);
  assert.equal(resolveVimNavAction(key("K"), ctx), null);
});
