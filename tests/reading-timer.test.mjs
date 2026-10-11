import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { createReadingClock } from "../src/reading-clock.js";
const source = fs.readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const code = source.slice(source.indexOf("const TIMER_TICK_MS"), source.indexOf("function handleAreaNavClick"));

function host() {
  const dom = new JSDOM("<body><main></main><aside></aside></body>", { pretendToBeVisual: true });
  const doc = dom.window.document;
  let focused = true, now = 0, callback;
  doc.hasFocus = () => focused;
  const events = new Map();
  let total = 0;
  const plugin = { settings: {}, app: { workspace: {
    activeLeaf: null, on: (event, fn) => { events.set(event, fn); return event; },
    offref: event => events.delete(event),
  } }, bumpReadingTime: sec => { total += sec; }, flushReadingTime() {}, getTodaySeconds: () => total };
  const runtime = vm.runInNewContext(`${code}\n({startTimerSession,pauseTimerSession,stopReadingTimer})`, {
    performance: { now: () => now }, Date: { now: () => new Date(2026, 9, 11, 12).getTime() + now },
    window: { setInterval: fn => { callback = fn; return 1; }, clearInterval: () => { callback = null; } },
    createReadingClock, docOf: el => el.ownerDocument,
    qiaomuReaderTranslate: s => s, Notice: class {},
  });
  const readers = [...doc.body.children].map(el => ({ plugin, contentEl: el, containerEl: el, bookHtml: "text" }));
  plugin.app.workspace.activeLeaf = { view: readers[0] };
  return { dom, doc, plugin, runtime, readers, total: () => total,
    step(ms = 1000) { now += ms; callback?.(); },
    focus(value) { focused = value; dom.window.dispatchEvent(new dom.window.Event(value ? "focus" : "blur")); },
    switchTo(reader) { plugin.app.workspace.activeLeaf = { view: reader }; events.get("active-leaf-change")(); },
    close() { plugin._readingTracker?.dispose(); dom.window.close(); },
  };
}

test("automatic foreground start, background stop, leaf switches and manual pause", () => {
  const h = host();
  const [a, b] = h.readers;
  h.runtime.startTimerSession(a); h.runtime.startTimerSession(b);
  h.step(); assert.equal(h.total(), 1); assert.equal(a._running, true); assert.equal(b._running, false);
  h.focus(false); h.step(); h.step(); assert.equal(h.total(), 1);
  h.focus(true); h.step(); assert.equal(h.total(), 2);
  h.switchTo(b); h.step(); assert.equal(h.total(), 3); assert.equal(a._running, false); assert.equal(b._running, true);
  h.runtime.pauseTimerSession(b); h.focus(false); h.focus(true); h.step(); assert.equal(h.total(), 3);
  h.runtime.startTimerSession(b); h.step(); assert.equal(h.total(), 4);
  h.runtime.stopReadingTimer(b); h.step(); assert.equal(h.total(), 4);
  assert.equal(b._readingActivityCleanups.size, 0);
  h.close();
});

test("modal owns time over a leaf, closing stop accumulation", () => {
  const h = host(); const [a, b] = h.readers;
  h.runtime.startTimerSession(a); h.runtime.startTimerSession(b);
  h.plugin._openReaderModal = b;
  h.plugin._readingTracker.sync(); h.step();
  assert.equal(b._running, true); assert.equal(a._running, false); assert.equal(h.total(), 1);
  b._closed = true; h.plugin.app.workspace.activeLeaf = null; h.plugin._readingTracker.sync(); h.step();
  assert.equal(h.total(), 1);
  h.close();
});

test("failed saves stay dirty and a successful retry preserves concurrent increments", async () => {
  const a = source.indexOf("  flushReadingTime() {");
  const b = source.indexOf("  _recordBackup", a);
  const methods = vm.runInNewContext(`({${source.slice(a, b)}})`);
  let resolve;
  const plugin = { ...methods, _readingDirty: true, _readingRevision: 1,
    _saveLocalData: () => new Promise(r => { resolve = r; }) };
  const first = plugin.flushReadingTime(); resolve(false); await first;
  assert.equal(plugin._readingDirty, true);
  const second = plugin.flushReadingTime(); plugin._readingRevision++;
  resolve(true); await second;
  assert.equal(plugin._readingDirty, true);
  const final = plugin._readingFlush; resolve(true); await final;
  assert.equal(plugin._readingDirty, false);
});
