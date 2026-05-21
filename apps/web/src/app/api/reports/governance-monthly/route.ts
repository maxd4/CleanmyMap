import {
  buildGovernanceMonthlyReportDownloadHeaders,
  buildGovernanceMonthlyReportLines,
  listGovernanceMonthlyReports,
  loadGovernanceMonthlyReport,
} from "@/lib/governance/governance-monthly-report";
import { buildSimplePdf } from "@/lib/pdf-export/simple-pdf";

export const runtime = "nodejs";

function parseFormat(raw: string | null): "pdf" | "json" {
  return raw === "json" ? "json" : "pdf";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = parseFormat(url.searchParams.get("format"));
  const month = url.searchParams.get("month");
  const report = await loadGovernanceMonthlyReport(month);

  if (!report) {
    return new Response("Report not found", { status: 404 });
  }

  if (format === "json") {
    return Response.json({
      status: "ok",
      report,
    });
  }

  const recentReports = await listGovernanceMonthlyReports(3);
  const lines = buildGovernanceMonthlyReportLines(report, recentReports);
  const pdfBytes = buildSimplePdf(lines);
  const pdfBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
  const { headers } = buildGovernanceMonthlyReportDownloadHeaders(report);

  return new Response(pdfBuffer, {
    status: 200,
    headers,
  });
}
