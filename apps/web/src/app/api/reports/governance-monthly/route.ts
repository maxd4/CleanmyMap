import {
  loadGovernanceMonthlyReport,
} from "@/lib/governance/governance-monthly-report";
import { requireAdminAccess } from "@/lib/authz";
import { adminAccessErrorJsonResponse } from "@/lib/http/auth-responses";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildMonthlyActionDataQualityReview,
} from "@/lib/actions/quality/data-quality";

export const runtime = "nodejs";
const GOVERNANCE_MONTHLY_REPORT_PDF_BUCKET = "reports";
const GOVERNANCE_MONTHLY_REPORT_PDF_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
const GOVERNANCE_MONTHLY_REPORT_REDIRECT_CACHE_CONTROL =
  "private, max-age=300, stale-while-revalidate=86400";
const GOVERNANCE_MONTHLY_REPORT_JSON_CACHE_CONTROL =
  "private, max-age=300, stale-while-revalidate=86400";

function parseFormat(raw: string | null): "pdf" | "json" {
  return raw === "json" ? "json" : "pdf";
}

function getNextMonthStart(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  const nextYear = monthNumber === 12 ? year + 1 : year;
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`;
}

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return adminAccessErrorJsonResponse(access);
  }

  const url = new URL(request.url);
  const qualityReview = url.searchParams.get("quality") === "1";
  if (qualityReview) {
    const month = url.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return Response.json(
        { status: "error", error: "Le mois doit respecter le format YYYY-MM." },
        { status: 400 },
      );
    }
    const supabase = getSupabaseServerClient(true);
    const { fetchUnifiedActionContracts } = await import("@/lib/actions/unified-source");
    let result: Awaited<ReturnType<typeof fetchUnifiedActionContracts>>;
    try {
      result = await fetchUnifiedActionContracts(supabase, {
        limit: 2000,
        status: null,
        floorDate: `${month}-01`,
        ceilingDate: getNextMonthStart(month),
        requireCoordinates: false,
        types: null,
      });
    } catch {
      return Response.json(
        {
          status: "error",
          error: "Les données sources sont indisponibles ; la revue mensuelle n'a pas été générée.",
        },
        {
          status: 503,
          headers: {
            "Cache-Control": GOVERNANCE_MONTHLY_REPORT_JSON_CACHE_CONTROL,
          },
        },
      );
    }
    if (result.isTruncated || result.sourceHealth.partial) {
      return Response.json(
        {
          status: "error",
          error: "Les données sources sont incomplètes ; la revue mensuelle n'a pas été générée.",
        },
        {
          status: 503,
          headers: {
            "Cache-Control": GOVERNANCE_MONTHLY_REPORT_JSON_CACHE_CONTROL,
          },
        },
      );
    }
    return Response.json({
      status: "ok",
      review: buildMonthlyActionDataQualityReview({ contracts: result.items, month }),
      sourceHealth: result.sourceHealth,
    }, {
      headers: {
        "Cache-Control": GOVERNANCE_MONTHLY_REPORT_JSON_CACHE_CONTROL,
      },
    });
  }
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
    }, {
      headers: {
        "Cache-Control": GOVERNANCE_MONTHLY_REPORT_JSON_CACHE_CONTROL,
      },
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

  const supabase = getSupabaseServerClient(true);
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
