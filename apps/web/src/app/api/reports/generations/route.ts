import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import type { ReportGenerationHistoryFilters } from "@/lib/reports/report-generation-history-contract";
import {
  listReportGenerationHistoryPage,
} from "@/lib/reports/report-generation-history-store";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";
import { generateReportGeneration } from "./route.generation";

export const runtime = "nodejs";
const reportThemeSchema = z.enum(["impact", "scientific"]);
const periodIdSchema = z.enum([
  "thirty_days",
  "three_months",
  "six_months",
  "twelve_months",
  "current_year",
  "full_history",
]);
const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().trim().max(120).default(""),
  period: z.union([periodIdSchema, z.literal("all")]).default("all"),
  theme: z.union([reportThemeSchema, z.literal("all")]).default("all"),
  sort: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse({ hint: access.error });
  }

  const url = new URL(request.url);
  const parsed = historyQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètres d’historique invalides." }, { status: 400 });
  }

  const filters: ReportGenerationHistoryFilters = {
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    search: parsed.data.search || undefined,
    periodId: parsed.data.period === "all" ? undefined : parsed.data.period,
    theme: parsed.data.theme === "all" ? undefined : parsed.data.theme,
    sort: parsed.data.sort,
  };

  try {
    return NextResponse.json(await listReportGenerationHistoryPage(access.userId, filters));
  } catch (error) {
    console.error("Report generation history listing failed", {
      userId: access.userId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json({ error: "Historique temporairement indisponible." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse({ hint: access.error });
  }

  const rateLimit = await verifyRateLimit(request, { limit: 5, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  return generateReportGeneration(access.userId, request);
}
