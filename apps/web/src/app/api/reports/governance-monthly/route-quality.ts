import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildMonthlyActionDataQualityReview } from "@/lib/actions/quality/data-quality";

const GOVERNANCE_MONTHLY_REPORT_JSON_CACHE_CONTROL = "private, max-age=300, stale-while-revalidate=86400";

export async function renderGovernanceQualityReview(url: URL): Promise<Response> {
  const month = url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return Response.json({ status: "error", error: "Le mois doit respecter le format YYYY-MM." }, { status: 400 });
  }
  const supabase = getSupabaseServerClient(true);
  const { fetchUnifiedActionContracts } = await import("@/lib/actions/unified-source");
  let result: Awaited<ReturnType<typeof fetchUnifiedActionContracts>>;
  try {
    result = await fetchUnifiedActionContracts(supabase, { limit: 2000, status: null, floorDate: `${month}-01`, ceilingDate: getNextMonthStart(month), requireCoordinates: false, types: null });
  } catch {
    return Response.json({ status: "error", error: "Les données sources sont indisponibles ; la revue mensuelle n'a pas été générée." }, { status: 503, headers: { "Cache-Control": GOVERNANCE_MONTHLY_REPORT_JSON_CACHE_CONTROL } });
  }
  if (result.isTruncated || result.sourceHealth.partial) {
    return Response.json({ status: "error", error: "Les données sources sont incomplètes ; la revue mensuelle n'a pas été générée." }, { status: 503, headers: { "Cache-Control": GOVERNANCE_MONTHLY_REPORT_JSON_CACHE_CONTROL } });
  }
  return Response.json({ status: "ok", review: buildMonthlyActionDataQualityReview({ contracts: result.items, month }), sourceHealth: result.sourceHealth }, { headers: { "Cache-Control": GOVERNANCE_MONTHLY_REPORT_JSON_CACHE_CONTROL } });
}

function getNextMonthStart(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  const nextYear = monthNumber === 12 ? year + 1 : year;
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`;
}
