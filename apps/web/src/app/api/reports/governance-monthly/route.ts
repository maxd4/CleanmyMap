import {
  loadGovernanceMonthlyReport,
} from "@/lib/governance/governance-monthly-report";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const GOVERNANCE_MONTHLY_REPORT_PDF_BUCKET = "reports";
const GOVERNANCE_MONTHLY_REPORT_PDF_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
const GOVERNANCE_MONTHLY_REPORT_REDIRECT_CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600";

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

  const pdfStoragePath = report.payload.artifacts?.pdfStoragePath ?? null;
  if (!pdfStoragePath) {
    return Response.json(
      {
        status: "error",
        error: "Le PDF de gouvernance n'est pas encore préparé.",
      },
      { status: 409 },
    );
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(GOVERNANCE_MONTHLY_REPORT_PDF_BUCKET)
    .createSignedUrl(pdfStoragePath, GOVERNANCE_MONTHLY_REPORT_PDF_SIGNED_URL_TTL_SECONDS, {
      download: true,
    });

  if (error || !data?.signedUrl) {
    return Response.json(
      {
        status: "error",
        error: "Le PDF de gouvernance est indisponible pour le moment.",
      },
      { status: 404 },
    );
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: data.signedUrl,
      "Cache-Control": GOVERNANCE_MONTHLY_REPORT_REDIRECT_CACHE_CONTROL,
    },
  });
}
