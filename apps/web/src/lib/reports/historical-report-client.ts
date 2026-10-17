import type { ReportGenerationSnapshotRecord } from "./report-generation-history-store";
import type { ReportGenerationHistoryRow } from "./report-generation-history-contract";
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

export async function deriveHistoricalReportSnapshot(
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ generation: ReportGenerationSnapshotRecord; item: ReportGenerationHistoryRow }> {
  const response = await fetchImpl(`/api/reports/generations/${encodeURIComponent(id)}`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    generation?: ReportGenerationSnapshotRecord;
    item?: ReportGenerationHistoryRow;
  } | null;

  if (!response.ok || !body?.generation || !body.item) {
    throw new Error(body?.error ?? "Impossible de créer une nouvelle version du rapport historique.");
  }

  if (!isReportGenerationPayload(body.generation.snapshot)) {
    throw new Error("Le snapshot dérivé est invalide ou incompatible.");
  }

  return { generation: body.generation, item: body.item };
}
