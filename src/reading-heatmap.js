// One year of reading-timer days. The library and the statistics card both
// draw this model; neither one stores a second copy of the log.
export const HEATMAP_WEEKS = 52;
export const READING_LOG_HORIZON_DAYS = 400;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
let heatSeq = 0;

export function shiftDayKey(dayKey, dayDelta) {
  const anchor = new Date(`${dayKey}T12:00:00Z`);
  if (Number.isNaN(anchor.getTime())) return dayKey;
  anchor.setUTCDate(anchor.getUTCDate() + dayDelta);
  return anchor.toISOString().slice(0, 10);
}

function mondayOnOrBefore(dayKey) {
  const anchor = new Date(`${dayKey}T12:00:00Z`);
  if (Number.isNaN(anchor.getTime())) return dayKey;
  const iso = anchor.getUTCDay() || 7;
  return shiftDayKey(dayKey, 1 - iso);
}

// 0 empty, 1 under a third of the goal, 2 under the goal, 3 at or past it.
// A longer day stays at 3, so one long sitting cannot wash the other days out.
export function heatLevel(seconds, goalSeconds) {
  const sec = Math.max(0, Math.floor(Number(seconds) || 0));
  const goal = Math.max(1, Math.floor(Number(goalSeconds) || 0));
  if (sec <= 0) return 0;
  if (sec * 3 < goal) return 1;
  if (sec < goal) return 2;
  return 3;
}

export function pruneReadingLog(log, todayKey, horizonDays = READING_LOG_HORIZON_DAYS) {
  const source = log && typeof log === "object" ? log : {};
  const cutoff = shiftDayKey(todayKey, -horizonDays);
  const next = {};
  for (const key of Object.keys(source)) {
    if (!DATE_KEY.test(key) || key < cutoff) continue;
    next[key] = source[key];
  }
  return next;
}

export function buildReadingHeatmap(log, todayKey, goalSeconds, weeks = HEATMAP_WEEKS) {
  const source = log && typeof log === "object" ? log : {};
  const count = Math.max(1, weeks);
  const start = shiftDayKey(mondayOnOrBefore(todayKey), -(count - 1) * 7);
  const columns = [];
  let active = false;
  let today = { key: todayKey, sec: 0, level: 0, focusable: true, column: count - 1, row: 0 };
  let lastLabel = -999;
  for (let week = 0; week < count; week++) {
    const days = [];
    for (let row = 0; row < 7; row++) {
      const key = shiftDayKey(start, week * 7 + row);
      const future = key > todayKey;
      const raw = Number(source[key]);
      const sec = future || !Number.isFinite(raw) ? 0 : Math.max(0, Math.floor(raw));
      const level = future ? 0 : heatLevel(sec, goalSeconds);
      const focusable = !future;
      if (focusable && sec > 0) active = true;
      const day = { key, sec, level, focusable };
      days.push(day);
      if (key === todayKey) today = { ...day, column: week, row };
    }
    let monthKey = null;
    const firstOfMonth = days.find((day) => day.key.slice(8, 10) === "01");
    if (firstOfMonth && week - lastLabel >= 3) {
      monthKey = firstOfMonth.key;
      lastLabel = week;
    }
    columns.push({ monthKey, days });
  }
  today.level = heatLevel(today.sec, goalSeconds);
  return { todayKey, active, columns, today };
}

function revealCell(cell) {
  if (typeof cell.scrollIntoView !== "function") return;
  try { cell.scrollIntoView({ block: "nearest", inline: "nearest" }); }
  catch { /* the current week stays wherever the scroller already is */ }
}

function focusHeatmap(root) {
  try { root.focus({ preventScroll: true }); }
  catch { root.focus(); }
}

export function mountReadingHeatmap(parent, model, options = {}) {
  if (!parent || !model?.active) return null;
  const formatTime = options.formatTime || ((seconds) => String(Math.max(0, Math.floor(Number(seconds) || 0))));
  const formatMonth = options.formatMonth || ((dayKey) => String(Number(dayKey.slice(5, 7))));
  const doc = parent.ownerDocument;
  const root = doc.createElement("div");
  root.className = "qiaomu-reader-heat";
  root.setAttribute("tabindex", "0");
  root.setAttribute("role", "group");
  const seq = ++heatSeq;
  if (options.caption) {
    const cap = doc.createElement("div");
    cap.className = "qiaomu-reader-heat-cap";
    cap.id = `qbr-heat-${seq}-cap`;
    cap.textContent = options.caption;
    root.appendChild(cap);
    root.setAttribute("aria-labelledby", cap.id);
  }
  const scroller = doc.createElement("div");
  scroller.className = "qiaomu-reader-heat-scroll";
  const plot = doc.createElement("div");
  plot.className = "qiaomu-reader-heat-plot";
  const cellColumns = model.columns.map((column) => {
    const col = doc.createElement("div");
    col.className = "qiaomu-reader-heat-col";
    const month = doc.createElement("div");
    month.className = "qiaomu-reader-heat-month";
    month.textContent = column.monthKey ? formatMonth(column.monthKey) : "";
    col.appendChild(month);
    const cells = column.days.map((day) => {
      const cell = doc.createElement("div");
      cell.className = `qiaomu-reader-heat-cell is-${day.level}`;
      if (!day.focusable) cell.classList.add("is-future");
      cell.dataset.day = day.key;
      col.appendChild(cell);
      return cell;
    });
    plot.appendChild(col);
    return cells;
  });
  scroller.appendChild(plot);
  root.appendChild(scroller);
  const detail = doc.createElement("div");
  detail.className = "qiaomu-reader-heat-detail";
  detail.id = `qbr-heat-${seq}-detail`;
  detail.setAttribute("aria-live", "polite");
  root.appendChild(detail);
  if (!options.caption) root.setAttribute("aria-labelledby", options.labelledBy || detail.id);

  let columnIndex = model.today.column;
  let rowIndex = model.today.row;
  const paint = () => {
    for (const cells of cellColumns) for (const cell of cells) cell.classList.remove("is-selected");
    const cell = cellColumns[columnIndex][rowIndex];
    cell.classList.add("is-selected");
    const day = model.columns[columnIndex].days[rowIndex];
    detail.textContent = `${day.key} · ${formatTime(day.sec)}`;
    return cell;
  };
  const move = (columnDelta, rowDelta) => {
    const nextColumn = Math.max(0, Math.min(model.columns.length - 1, columnIndex + columnDelta));
    const nextRow = Math.max(0, Math.min(6, rowIndex + rowDelta));
    if (!model.columns[nextColumn].days[nextRow].focusable) return;
    columnIndex = nextColumn;
    rowIndex = nextRow;
    revealCell(paint());
  };
  cellColumns.forEach((cells, col) => {
    cells.forEach((cell, row) => {
      if (!model.columns[col].days[row].focusable) return;
      cell.addEventListener("click", () => {
        columnIndex = col;
        rowIndex = row;
        revealCell(paint());
        focusHeatmap(root);
      });
    });
  });
  root.addEventListener("keydown", (event) => {
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!delta) return;
    event.preventDefault();
    move(delta[0], delta[1]);
  });
  parent.appendChild(root);
  const selected = paint();
  const view = doc.defaultView;
  if (view?.requestAnimationFrame) view.requestAnimationFrame(() => revealCell(selected));
  else revealCell(selected);
  return root;
}
