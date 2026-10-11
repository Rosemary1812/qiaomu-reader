import test from "node:test";
import assert from "node:assert/strict";
import { createReadingClock, READING_IDLE_MS } from "../src/reading-clock.js";
import { buildReadingHeatmap } from "../src/reading-heatmap.js";

function harness(wallStart = new Date(2026, 9, 11, 12).getTime()) {
  let time = 0;
  let wall = wallStart;
  const records = [];
  const clock = createReadingClock({ now: () => time, wallNow: () => wall,
    onSeconds: (reader, seconds, day) => records.push({ reader, seconds, day }),
  });
  return { clock, records, advance(ms, wallMs = ms) { time += ms; wall += wallMs; },
    total: () => records.reduce((sum, r) => sum + r.seconds, 0) };
}

test("foreground reading reaches the heatmap from real elapsed seconds", () => {
  const h = harness();
  h.clock.update("book", 0);
  for (let i = 0; i < 20; i++) { h.advance(1000); h.clock.update("book", 0); }
  const log = {};
  for (const r of h.records) log[r.day] = (log[r.day] || 0) + r.seconds;
  assert.equal(h.total(), 20);
  assert.equal(buildReadingHeatmap(log, "2026-10-11").today.sec, 20);
});

test("background and manual pause do not backfill when resumed", () => {
  const h = harness();
  h.clock.update("book", 0);
  h.advance(1500); h.clock.update(null, 0);
  h.advance(3000); h.clock.update(null, 0);
  h.advance(1000); h.clock.update("book", 5500);
  h.advance(1500); h.clock.update("book", 5500);
  assert.equal(h.total(), 3);
});

test("one target accrues once when switching readers", () => {
  const h = harness();
  h.clock.update("a", 0);
  h.advance(1000); h.clock.update("b", 1000);
  h.clock.update("b", 1000);
  h.advance(1000); h.clock.update("b", 1000);
  assert.deepEqual(h.records.map(r => [r.reader, r.seconds]), [["a", 1], ["b", 1]]);
});

test("idle expires at five minutes and activity resumes without backfill", () => {
  const h = harness();
  h.clock.update("book", 0);
  for (let i = 0; i < READING_IDLE_MS / 1000 + 10; i++) {
    h.advance(1000); h.clock.update("book", 0);
  }
  assert.equal(h.total(), 300);
  assert.equal(h.clock.update("book", 310000), true);
  h.advance(1000); h.clock.update("book", 310000);
  assert.equal(h.total(), 301);
});

test("sleep, delayed ticks and clock jumps never become reading time", () => {
  const h = harness();
  h.clock.update("book", 0);
  h.advance(60000); h.clock.update("book", 60000);
  h.advance(1000, 3600000); h.clock.update("book", 61000);
  assert.equal(h.total(), 0);
  h.advance(1000); h.clock.update("book", 61000);
  assert.equal(h.total(), 1);
});

test("local midnight divides time between the correct days", () => {
  const h = harness(new Date(2026, 9, 11, 23, 59, 59).getTime());
  h.clock.update("book", 0);
  h.advance(2000); h.clock.update("book", 0);
  assert.deepEqual(h.records.map(r => [r.day, r.seconds]), [["2026-10-11", 1], ["2026-10-12", 1]]);
});

test("fractional intervals accumulate without rounding every tick", () => {
  const h = harness();
  h.clock.update("book", 0);
  for (let i = 0; i < 10; i++) { h.advance(250); h.clock.update("book", 0); }
  assert.equal(h.total(), 2);
});
