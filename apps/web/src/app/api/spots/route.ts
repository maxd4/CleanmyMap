import { NextResponse } from"next/server";
import { z } from"zod";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import {
 getCurrentUserIdentity,
 pickTraceableActorName,
} from"@/lib/authz";
import { hasAnalyticsConsentCookie } from "@/lib/analytics-consent";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import {
 handleApiError,
 parseJsonBodyWithValidation,
 validationErrorResponse,
} from"@/lib/http/api-errors";
import { createSignalement } from "@/lib/actions/signalement/create-signalement";
import { parsePositiveInteger } from "@/lib/http/query-params";
import { enforceServerRateLimit } from "@/lib/rate-limit/server";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { wasteCategorySlugSchema } from "@/lib/validation/action-measurements";

export const runtime ="nodejs";
const PUBLIC_SPOT_STATUSES = ["validated", "cleaned"] as const;
type PublicSpotStatus = (typeof PUBLIC_SPOT_STATUSES)[number];

type PublicSpotRow = {
 created_at: string;
 label: string;
 spot_type: string | null;
 latitude: number | null;
 longitude: number | null;
 status: string | null;
};

const createSpotSchema = z.object({
  type: z.enum(["clean_place","spot"]).default("spot"),
  label: z.string().trim().min(2).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  notes: z.string().trim().max(2000).optional(),
 wasteCategories: z.array(wasteCategorySlugSchema).max(20).optional(),
});

function parseStatusParam(rawValues: string[]):
 | { status: PublicSpotStatus | null }
 | { error: string } {
 if (rawValues.length === 0) {
  return { status: null };
 }
 if (rawValues.length !== 1) {
  return { error: "Un seul statut de signalement peut être demandé." };
 }

 const raw = rawValues[0];
 if (PUBLIC_SPOT_STATUSES.includes(raw as PublicSpotStatus)) {
  return { status: raw as PublicSpotStatus };
 }
 if (raw === "new") {
  return { error: "Le statut new est réservé au suivi propriétaire." };
 }
 return { error: "Le statut de signalement demandé est invalide." };
}

function isPublicSpotRow(
 row: PublicSpotRow,
): row is PublicSpotRow & { status: PublicSpotStatus } {
 return typeof row.status === "string" && PUBLIC_SPOT_STATUSES.includes(row.status as PublicSpotStatus);
}

function toPublicSpotDto(row: PublicSpotRow & { status: PublicSpotStatus }) {
 return {
  created_at: row.created_at,
  label: row.label,
  spot_type: row.spot_type,
  latitude: row.latitude,
  longitude: row.longitude,
  status: row.status,
 };
}

async function loadPublicSpots(limit: number, status: PublicSpotStatus | null) {
 const supabase = getSupabaseServerClient(true);
 let query = supabase
  .from("trash_spotter_spots")
  .select("created_at, label, spot_type, latitude, longitude, status")
  .order("created_at", { ascending: false })
  .limit(limit);

 if (status) {
  query = query.eq("status", status);
 } else {
  query = query.in("status", [...PUBLIC_SPOT_STATUSES]);
 }

 const result = await query;
 if (result.error) {
  throw result.error;
 }

 return ((result.data ?? []) as PublicSpotRow[])
  .filter(isPublicSpotRow)
  .filter((row) => status === null || row.status === status)
  .map(toPublicSpotDto);
}

export async function GET(request: Request) {
 const access = await requireActionRequestAccess(request);
 if (!access.ok) {
 return unauthorizedJsonResponse();
 }

 const url = new URL(request.url);
 const limit = parsePositiveInteger(
 url.searchParams.get("limit"),
 1,
 300,
 120,
 );
  const parsedStatus = parseStatusParam(url.searchParams.getAll("status"));
  if ("error" in parsedStatus) {
   return validationErrorResponse({ status: [parsedStatus.error] });
  }

  try {
 const items = await loadPublicSpots(limit, parsedStatus.status);
 return NextResponse.json({
 status:"ok",
 count: items.length,
 items,
 }, { headers: { "Cache-Control": "private, no-store" } });
 } catch (error) {
 return handleApiError(error,"api/spots");
 }
}

export async function POST(request: Request) {
 const rateLimitResponse = await enforceServerRateLimit(request, { limit: 10, window: 300 });
 if (rateLimitResponse) {
  return rateLimitResponse;
 }

 const access = await requireActionRequestAccess(request);
 if (!access.ok) {
 return unauthorizedJsonResponse();
 }
 const { userId } = access;

 const parsed = await parseJsonBodyWithValidation(request, createSpotSchema);
 if (!parsed.ok) return parsed.response;

 try {
 const supabase = getSupabaseServerClient(true);
 const identity = await getCurrentUserIdentity({ userId });
 const actorName = pickTraceableActorName(identity, undefined) ?? userId;
 const inserted = await createSignalement(supabase, {
   userId,
   type: parsed.data.type,
   label: parsed.data.label,
   latitude: parsed.data.latitude,
   longitude: parsed.data.longitude,
   notes: parsed.data.notes,
   wasteCategories: parsed.data.wasteCategories,
   actorName,
   consentGranted: hasAnalyticsConsentCookie(request.headers.get("cookie")),
 });

return NextResponse.json(
 { status:"created", source:"trash_spotter_spots", item: inserted },
 { status: 201 },
);
 } catch (error) {
 return handleApiError(error,"POST /api/spots");
 }
}
