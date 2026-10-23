import type { ReportGenerationHistoryRow } from "@/lib/reports/report-generation-history-contract";
import type { ReportPdfTheme } from "./reports-web-document.shared";

export type ReportsWebDocumentDeliveryHistoryProps = {
  recentRows: ReportGenerationHistoryRow[];
  theme?: ReportPdfTheme;
  historyAvailability?: "available" | "unavailable";
  actionStateById?: Record<string, ReportGenerationHistoryActionState>;
  onView: (id: string) => void;
  onReexport: (id: string) => void;
  onPrint?: (id: string) => void;
  onDerive?: (id: string) => void;
  onCopyReference?: (id: string) => void;
  onExportJson?: (id: string) => void;
  onExportCsv?: (id: string) => void;
  onResume?: (id: string) => void;
  publicationPreviewById?: Record<
    string,
    {
      title: string;
      period: string;
      scope: string;
      theme: ReportPdfTheme;
      artifactReady: boolean;
      documentUrl: string;
      communicatedContent: string;
    }
  >;
  onPublish?: (id: string) => void;
  onConfirmPublication?: (id: string) => void;
  onCancelPublication?: (id: string) => void;
  onRevokePublication?: (id: string) => void;
};

export type ReportGenerationHistoryActionState = {
  action:
    | "view"
    | "reexport"
    | "print"
    | "derive"
    | "reference"
    | "json"
    | "csv";
  state: "pending" | "success" | "error";
  message: string;
};
