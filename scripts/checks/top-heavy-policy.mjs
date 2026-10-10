function threshold(lines, bytes) {
  return Object.freeze({ lines, bytes });
}

function preventiveThreshold(lines) {
  return Object.freeze({ lines });
}

const RUNTIME_PREVENTIVE = preventiveThreshold(300);
const RUNTIME_REVIEW = threshold(500, 40 * 1024);
const RUNTIME_HARD = threshold(1000, 50 * 1024);
const TEST_PREVENTIVE = preventiveThreshold(600);

export const FILE_KIND_POLICY = Object.freeze({
  runtime: Object.freeze({
    preventive: RUNTIME_PREVENTIVE,
    review: RUNTIME_REVIEW,
    hard: RUNTIME_HARD,
    radarSection: "architectural",
  }),
  test: Object.freeze({
    preventive: TEST_PREVENTIVE,
    review: threshold(1000, 50 * 1024),
    hard: threshold(1500, 80 * 1024),
    radarSection: "tests",
  }),
  "data/config": Object.freeze({
    preventive: null,
    review: threshold(800, 50 * 1024),
    hard: threshold(1500, 80 * 1024),
    radarSection: "architectural",
  }),
  generated: Object.freeze({
    preventive: null,
    review: null,
    hard: null,
    radarSection: "generated",
  }),
});

function getPolicyForRow(row) {
  if (row.kind === "generated" && !isExcludedGeneratedRow(row)) return FILE_KIND_POLICY.runtime;
  return FILE_KIND_POLICY[row.kind] ?? FILE_KIND_POLICY.runtime;
}

export function isExcludedGeneratedRow(row) {
  return row.kind === "generated" && row.generated === true;
}

export function isAboveReview(row) {
  return !isExcludedGeneratedRow(row) && isAboveThreshold(row, getPolicyForRow(row).review);
}

export function isAboveHard(row) {
  return !isExcludedGeneratedRow(row) && isAboveThreshold(row, getPolicyForRow(row).hard);
}

export function isInPreventiveZone(row) {
  if (isExcludedGeneratedRow(row)) return false;
  const policy = getPolicyForRow(row);
  return policy.preventive !== null && row.lines >= policy.preventive.lines && !isAboveReview(row);
}

export function getDistanceToReview(row) {
  if (isExcludedGeneratedRow(row)) return null;
  const review = getPolicyForRow(row).review;
  if (review === null) return null;
  return Object.freeze({
    lines: review.lines - row.lines,
    bytes: review.bytes - row.bytes,
  });
}

function isAboveThreshold(row, threshold) {
  return row.lines > threshold.lines || row.bytes > threshold.bytes;
}
