import type { ReportGenerationSnapshotRecord } from "./report-generation-history-store";
import { isReportGenerationPayload } from "./report-generation-payload";

export async function loadHistoricalReportSnapshot(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReportGenerationSnapshotRecord> {
  const response = await fetchImpl(`/api/reports/generations/${encodeURIComponent(id)}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    generation?: ReportGenerationSnapshotRecord;
  } | null;

  if (!response.ok || !body?.generation) {
    throw new Error(body?.error ?? "Impossible de charger le rapport historique.");
  }

  if (!isReportGenerationPayload(body.generation.snapshot)) {
    throw new Error("Le snapshot historique est invalide ou incompatible.");
  }

  return body.generation;
}
