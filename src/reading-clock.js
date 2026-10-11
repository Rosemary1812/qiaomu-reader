export const READING_IDLE_MS = 5 * 60 * 1000;
export const MAX_READING_GAP_MS = 5000;

export function localReadingDay(time) {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// The host supplies one eligible reader. A delayed tick never backfills sleep.
export function createReadingClock({ now, wallNow, onSeconds }) {
  let previous = now();
  let previousWall = wallNow();
  let target = null;
  let expires = 0;
  const fractions = new Map();
  return {
    update(next, lastActivity) {
      const current = now();
      const wall = wallNow();
      const elapsed = current - previous;
      const duration = Math.max(0, Math.min(current, expires) - previous);
      if (target && elapsed > 0 && elapsed <= MAX_READING_GAP_MS && Math.abs(wall - previousWall - elapsed) < 1000) {
        let cursor = previousWall;
        const end = cursor + duration;
        while (cursor < end) {
          const date = new Date(cursor);
          const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
          const until = Math.min(end, midnight);
          const day = localReadingDay(cursor);
          const total = (fractions.get(day) || 0) + (until - cursor) / 1000;
          const seconds = Math.floor(total);
          fractions.set(day, total - seconds);
          if (seconds) onSeconds(target, seconds, day);
          cursor = until;
        }
      }
      previous = current;
      previousWall = wall;
      target = next;
      expires = lastActivity + READING_IDLE_MS;
      return Boolean(target && current < expires);
    },
  };
}
