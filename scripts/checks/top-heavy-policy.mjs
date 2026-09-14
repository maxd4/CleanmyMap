export const REVIEW_THRESHOLD = Object.freeze({
  lines: 500,
  bytes: 40 * 1024,
});

export const HARD_THRESHOLD = Object.freeze({
  lines: 1000,
  bytes: 50 * 1024,
});

export function isAboveThreshold(row, threshold) {
  return row.lines > threshold.lines || row.bytes > threshold.bytes;
}
