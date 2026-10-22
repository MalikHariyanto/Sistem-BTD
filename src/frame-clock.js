// RAF timestamps can land just below an exact frame boundary (33.333... ms).
// Snap to the scheduled boundary, including a small sub-millisecond tolerance,
// instead of skipping a display refresh and immediately catching it back up.
export function advanceFrameClock(now, previous, interval) {
  const elapsed = now - previous;
  if (elapsed < interval - .5) return null;
  return previous + Math.max(1, Math.floor((elapsed + .5) / interval)) * interval;
}
