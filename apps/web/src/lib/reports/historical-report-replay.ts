import type { ReportGenerationSnapshotRecord } from "./report-generation-history-store";

export type HistoricalReportAction = "view" | "reexport";

export function replayHistoricalReport(
  action: HistoricalReportAction,
  generation: ReportGenerationSnapshotRecord,
  handlers: {
    view: (payload: ReportGenerationSnapshotRecord["snapshot"]) => void;
    reexport: (
      payload: ReportGenerationSnapshotRecord["snapshot"],
      filename: string,
    ) => void;
  },
): void {
  if (action === "view") {
    handlers.view(generation.snapshot);
    return;
  }

  handlers.reexport(generation.snapshot, generation.filename);
}
