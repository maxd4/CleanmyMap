type VisionTrainingStatus =
  | "pending_label"
  | "labelled"
  | "needs_review"
  | "no_photo";

export type VisionTrainingExampleRow = {
  created_at: string | null;
  model_version: string | null;
  poids_reel: unknown;
  poids_estime: unknown;
  status: string | null;
};

export type VisionTrainingMetrics = {
  count: number;
  labelledCount: number;
  mae: number | null;
  rmse: number | null;
  latestModelVersion: string | null;
  paused: boolean;
  statusCounts: Record<VisionTrainingStatus, number>;
};

function toFiniteNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function createStatusCounts(): Record<VisionTrainingStatus, number> {
  return {
    pending_label: 0,
    labelled: 0,
    needs_review: 0,
    no_photo: 0,
  };
}

export function computeVisionTrainingMetrics(
  rows: VisionTrainingExampleRow[],
  paused: boolean,
): VisionTrainingMetrics {
  const statusCounts = createStatusCounts();
  const comparableErrors: number[] = [];
  const modelVersions = rows
    .map((row) => ({
      version: row.model_version?.trim() ?? "",
      createdAt: row.created_at ? Date.parse(row.created_at) : Number.NaN,
    }))
    .filter(
      (item): item is { version: string; createdAt: number } =>
        item.version.length > 0 && Number.isFinite(item.createdAt),
    )
    .sort((left, right) => right.createdAt - left.createdAt);

  for (const row of rows) {
    if (row.status && row.status in statusCounts) {
      statusCounts[row.status as VisionTrainingStatus] += 1;
    }

    const actual = toFiniteNumber(row.poids_reel);
    const estimated = toFiniteNumber(row.poids_estime);
    if (actual !== null && estimated !== null) {
      comparableErrors.push(estimated - actual);
    }
  }

  const absoluteErrorTotal = comparableErrors.reduce(
    (total, error) => total + Math.abs(error),
    0,
  );
  const squaredErrorTotal = comparableErrors.reduce(
    (total, error) => total + error ** 2,
    0,
  );
  const pairCount = comparableErrors.length;

  return {
    count: rows.length,
    labelledCount: statusCounts.labelled,
    mae: pairCount > 0 ? absoluteErrorTotal / pairCount : null,
    rmse: pairCount > 0 ? Math.sqrt(squaredErrorTotal / pairCount) : null,
    latestModelVersion: modelVersions[0]?.version ?? null,
    paused,
    statusCounts,
  };
}
