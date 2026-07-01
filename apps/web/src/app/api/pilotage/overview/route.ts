import { auth } from"@clerk/nextjs/server";
import { NextResponse } from"next/server";
import { parseEntityTypesParam } from"@/lib/actions/unified-source";
import { loadPilotageOverview } from"@/lib/pilotage/overview";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import { handleApiError } from"@/lib/http/api-errors";

export const runtime ="nodejs";

function parsePositiveInteger(
 raw: string | null,
 min: number,
 max: number,
 fallback: number,
): number {
 if (raw === null || raw.trim() ==="") {
 return fallback;
 }
 const parsed = Number(raw);
 if (!Number.isFinite(parsed)) {
 return fallback;
 }
 return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export async function GET(request: Request) {
 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
 }

 const url = new URL(request.url);
 const periodDays = parsePositiveInteger(
 url.searchParams.get("days"),
 7,
 365,
 30,
 );
 const limit = parsePositiveInteger(
 url.searchParams.get("limit"),
 100,
 3000,
 1500,
 );
 const types = parseEntityTypesParam(url.searchParams.get("types"));

 try {
 const overview = await loadPilotageOverview({
 periodDays,
 limit,
 types,
 });

 return NextResponse.json({
 status:"ok",
 source:"pilotage_overview",
 ...overview,
 });
 } catch (error) {
 return handleApiError(error, "GET /api/pilotage/overview");
 }
}
