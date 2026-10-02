import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import {
  HEATMAP_WEEKS, READING_LOG_HORIZON_DAYS, buildReadingHeatmap, heatLevel,
  mountReadingHeatmap, pruneReadingLog, shiftDayKey,
} from "../src/reading-heatmap.js";

const GOAL = 15 * 60;

function weekday(dayKey) {
  return new Date(`${dayKey}T12:00:00Z`).getUTCDay();
}

test("heat levels follow the daily goal and ignore every other day", () => {
  assert.equal(HEATMAP_WEEKS, 52);
  assert.equal(READING_LOG_HORIZON_DAYS, 400);
  assert.equal(heatLevel(0, GOAL), 0);
  assert.equal(heatLevel(1, GOAL), 1);
  assert.equal(heatLevel(299, GOAL), 1);
  assert.equal(heatLevel(300, GOAL), 2);
  assert.equal(heatLevel(899, GOAL), 2);
  assert.equal(heatLevel(900, GOAL), 3);
  assert.equal(heatLevel(5000, GOAL), 3);
  const washed = buildReadingHeatmap({
    "2024-01-01": 4 * 60,
    "2024-01-02": 5 * 3600,
    "2024-01-03": 20 * 60,
  }, "2024-01-03", GOAL);
  const week = washed.columns[washed.columns.length - 1].days;
  assert.equal(week[0].level, 1);
  assert.equal(week[1].level, 3);
  assert.equal(week[2].level, 3);
});

test("the grid is Monday weeks, ends on the current week, and hides future days", () => {
  const todayKey = "2024-01-03";
  const model = buildReadingHeatmap({}, todayKey, GOAL);
  assert.equal(model.columns.length, 52);
  assert.equal(model.active, false);
  for (const column of model.columns) {
    assert.equal(weekday(column.days[0].key), 1);
    assert.equal(weekday(column.days[6].key), 0);
  }
  const last = model.columns[51];
  assert.equal(last.days[2].key, todayKey);
  assert.equal(last.days[2].focusable, true);
  assert.equal(last.days[3].focusable, false);
  assert.equal(last.days[3].sec, 0);
  assert.equal(model.today.column, 51);
  assert.equal(model.today.row, 2);
  assert.equal(model.columns[0].days[0].key, shiftDayKey(last.days[0].key, -51 * 7));
  const monday = buildReadingHeatmap({}, "2024-01-01", GOAL);
  assert.equal(monday.today.row, 0);
  assert.equal(monday.columns[51].days[1].focusable, false);
  const sunday = buildReadingHeatmap({}, "2024-01-07", GOAL);
  assert.equal(sunday.today.row, 6);
  assert.equal(sunday.columns[51].days.every((day) => day.focusable), true);
});

test("month labels sit on the first of the month and stay three columns apart", () => {
  const model = buildReadingHeatmap({}, "2024-03-15", GOAL);
  let previous = -999;
  const labels = [];
  model.columns.forEach((column, index) => {
    if (!column.monthKey) return;
    assert.ok(index - previous >= 3);
    assert.equal(column.monthKey.slice(8), "01");
    previous = index;
    labels.push(column.monthKey);
  });
  assert.ok(labels.includes("2024-02-01"));
  assert.ok(labels.includes("2024-03-01"));
});

test("visible weeks stay inside the 400 day horizon", () => {
  for (let delta = 0; delta < 7; delta++) {
    const todayKey = shiftDayKey("2026-09-29", delta);
    const model = buildReadingHeatmap({}, todayKey, GOAL);
    const oldest = model.columns[0].days[0].key;
    const cutoff = shiftDayKey(todayKey, -READING_LOG_HORIZON_DAYS);
    assert.ok(oldest >= cutoff, `${oldest} fell behind ${cutoff} for ${todayKey}`);
  }
});

test("prune keeps 400 days, drops 401 days and keys that are not dates", () => {
  const todayKey = "2026-09-29";
  const within = shiftDayKey(todayKey, -399);
  const edge = shiftDayKey(todayKey, -400);
  const gone = shiftDayKey(todayKey, -401);
  const log = { [within]: 10, [edge]: 8, [gone]: 6, [todayKey]: 0, nope: 5, "2026/09/01": 4 };
  const next = pruneReadingLog(log, todayKey);
  assert.equal(next[within], 10);
  assert.equal(next[edge], 8);
  assert.equal(next[gone], undefined);
  assert.equal(next[todayKey], 0);
  assert.equal("nope" in next, false);
  assert.equal("2026/09/01" in next, false);
  assert.equal(log[gone], 6);
  assert.equal(Object.keys(log).length, 6);
});

test("a reset today is an empty cell and an empty log does not mount", () => {
  const reset = buildReadingHeatmap({ "2024-01-03": 0 }, "2024-01-03", GOAL);
  assert.equal(reset.active, false);
  assert.equal(reset.today.level, 0);
  const { document } = new JSDOM("<!doctype html><body></body>").window;
  const host = document.createElement("div");
  document.body.appendChild(host);
  assert.equal(mountReadingHeatmap(host, reset, {}), null);
  assert.equal(host.childElementCount, 0);
});

test("the detail line uses the time formatter and cells carry no tooltip", () => {
  const model = buildReadingHeatmap({
    "2024-01-02": 4 * 60,
    "2024-01-03": 20 * 60,
  }, "2024-01-03", GOAL);
  const { document } = new JSDOM("<!doctype html><body></body>").window;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const formatTime = (seconds) => seconds > 0 ? `${Math.floor(seconds / 60)} 分钟` : "—";
  const root = mountReadingHeatmap(host, model, {
    caption: "连续 2 天",
    formatTime,
    formatMonth: (dayKey) => dayKey.slice(5, 7),
  });
  const detail = root.querySelector(".qiaomu-reader-heat-detail");
  assert.equal(detail.textContent, "2024-01-03 · 20 分钟");
  assert.equal(detail.getAttribute("aria-live"), "polite");
  assert.equal(root.getAttribute("aria-labelledby"), root.querySelector(".qiaomu-reader-heat-cap").id);
  assert.equal(root.querySelector(".qiaomu-reader-heat-cap").textContent, "连续 2 天");
  assert.equal(root.getAttribute("title"), null);
  assert.equal(root.getAttribute("aria-label"), null);
  assert.equal(root.querySelector("[title], [aria-label]"), null);
  assert.equal(root.getAttribute("tabindex"), "0");
  assert.equal(root.querySelector("[tabindex]"), null);
  assert.ok(root.querySelector(".is-selected").classList.contains("is-3"));
  assert.ok(root.querySelector('[data-day="2024-01-02"]').classList.contains("is-1"));

  root.dispatchEvent(new document.defaultView.KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
  assert.equal(detail.textContent, "2024-01-02 · 4 分钟");
  root.dispatchEvent(new document.defaultView.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  assert.equal(detail.textContent, "2024-01-03 · 20 分钟");
  root.dispatchEvent(new document.defaultView.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  assert.equal(detail.textContent, "2024-01-03 · 20 分钟");

  root.querySelector('[data-day="2024-01-04"]').dispatchEvent(new document.defaultView.MouseEvent("click", { bubbles: true }));
  assert.equal(detail.textContent, "2024-01-03 · 20 分钟");
  root.querySelector('[data-day="2024-01-01"]').dispatchEvent(new document.defaultView.MouseEvent("click", { bubbles: true }));
  assert.equal(detail.textContent, "2024-01-01 · —");
});

test("settings mode labels the grid from the statistics heading", () => {
  const model = buildReadingHeatmap({ "2024-01-03": 60 }, "2024-01-03", GOAL);
  const { document } = new JSDOM("<!doctype html><body></body>").window;
  const host = document.createElement("div");
  const root = mountReadingHeatmap(host, model, { labelledBy: "stats-heading", formatTime: () => "不到一分钟" });
  assert.equal(root.querySelector(".qiaomu-reader-heat-cap"), null);
  assert.equal(root.getAttribute("aria-labelledby"), "stats-heading");
  assert.equal(root.querySelector(".qiaomu-reader-heat-detail").textContent, "2024-01-03 · 不到一分钟");
  assert.equal(root.querySelector("[title], [aria-label]"), null);
});
