function threshold(lines, bytes) {
  return Object.freeze({ lines, bytes });
}

const RUNTIME_REVIEW = threshold(500, 40 * 1024);
const RUNTIME_HARD = threshold(1000, 50 * 1024);

export const FILE_KIND_POLICY = Object.freeze({
  runtime: Object.freeze({
    review: RUNTIME_REVIEW,
    hard: RUNTIME_HARD,
    radarSection: "architectural",
  }),
  test: Object.freeze({
    review: threshold(1000, 50 * 1024),
    hard: threshold(1500, 80 * 1024),
    radarSection: "tests",
  }),
  "data/config": Object.freeze({
    review: threshold(800, 50 * 1024),
    hard: threshold(1500, 80 * 1024),
    radarSection: "architectural",
  }),
  generated: Object.freeze({
    review: null,
    hard: null,
    radarSection: "generated",
  }),
});

// Compatibilité de lecture pour les rapports qui n'ont pas encore migré vers
// getPolicyForRow(). Le checker et le radar utilisent toujours la politique
// déterminée par KIND.
const REVIEW_THRESHOLD = RUNTIME_REVIEW;
const HARD_THRESHOLD = RUNTIME_HARD;

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

function isAboveThreshold(row, threshold) {
  return row.lines > threshold.lines || row.bytes > threshold.bytes;
}
