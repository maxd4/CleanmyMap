import { loadGovernanceMonthlyReport } from "@/lib/governance/governance-monthly-report";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const GOVERNANCE_MONTHLY_REPORT_PDF_BUCKET = "reports";
const GOVERNANCE_MONTHLY_REPORT_PDF_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
const GOVERNANCE_MONTHLY_REPORT_REDIRECT_CACHE_CONTROL = "private, max-age=300, stale-while-revalidate=86400";
const GOVERNANCE_MONTHLY_REPORT_JSON_CACHE_CONTROL = "private, max-age=300, stale-while-revalidate=86400";

export async function renderGovernanceReport(url: URL): Promise<Response> {
  const format = url.searchParams.get("format") === "json" ? "json" : "pdf";
  const report = await loadGovernanceMonthlyReport(url.searchParams.get("month"));
  if (!report) return new Response("Report not found", { status: 404 });
  if (format === "json") return Response.json({ status: "ok", report }, { headers: { "Cache-Control": GOVERNANCE_MONTHLY_REPORT_JSON_CACHE_CONTROL } });
  const pdfStoragePath = report.payload.artifacts?.pdfStoragePath ?? null;
  if (!pdfStoragePath) return Response.json({ status: "error", error: "Le PDF de gouvernance n'est pas encore préparé." }, { status: 409 });
  const supabase = getSupabaseServerClient(true);
  const { data, error } = await supabase.storage.from(GOVERNANCE_MONTHLY_REPORT_PDF_BUCKET).createSignedUrl(pdfStoragePath, GOVERNANCE_MONTHLY_REPORT_PDF_SIGNED_URL_TTL_SECONDS, { download: true });
  if (error || !data?.signedUrl) return Response.json({ status: "error", error: "Le PDF de gouvernance est indisponible pour le moment." }, { status: 404 });
  return new Response(null, { status: 302, headers: { Location: data.signedUrl, "Cache-Control": GOVERNANCE_MONTHLY_REPORT_REDIRECT_CACHE_CONTROL } });
}
