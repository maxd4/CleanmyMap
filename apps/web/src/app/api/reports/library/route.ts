import { NextResponse } from "next/server";
import { enforceServerRateLimit } from "@/lib/rate-limit/server";
import { listPublicReportLibraryPage } from "@/lib/reports/report-publication-store";
import type { ReportPublicLibraryFilters } from "@/lib/reports/report-publication-contract";

export const runtime = "nodejs";

function parse(request: Request): ReportPublicLibraryFilters {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") ?? 1);
  const pageSize = Number(params.get("pageSize") ?? 12);
  const theme = params.get("theme");
  const periodId = params.get("period");
  return {
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 12,
    search: params.get("search") ?? undefined,
    theme: theme === "impact" || theme === "scientific" ? theme : undefined,
    periodId: periodId && periodId !== "all" ? periodId as ReportPublicLibraryFilters["periodId"] : undefined,
    sort: params.get("sort") === "asc" ? "asc" : "desc",
  };
}

export async function GET(request: Request) {
  const rateLimitResponse = await enforceServerRateLimit(request, { limit: 30, window: 60 });
  if (rateLimitResponse) return rateLimitResponse;
  try {
    // Cache justification: the active public library changes with publication/revocation.
    return NextResponse.json(await listPublicReportLibraryPage(parse(request)), { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    console.error("Public report library listing failed", { error });
    return NextResponse.json({ error: "La bibliothèque publique est temporairement indisponible." }, { status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" } });
  }
}
