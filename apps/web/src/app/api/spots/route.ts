import { unstable_cache } from "next/cache";
import { NextResponse } from"next/server";
import { z } from"zod";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import {
 getCurrentUserIdentity,
 pickTraceableActorName,
 requireAuthenticatedAccess,
} from"@/lib/authz";
import { hasAnalyticsConsentCookie } from "@/lib/analytics-consent";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from"@/lib/http/api-errors";
import { createSignalement } from "@/lib/actions/signalement/create-signalement";

export const runtime ="nodejs";
const SPOTS_CACHE_HEADERS = {
 "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
};
const SPOTS_CACHE_REVALIDATE_SECONDS = 60;

const spotStatuses = ["new","validated","cleaned"] as const;
type SpotStatus = (typeof spotStatuses)[number];

const createSpotSchema = z.object({
  type: z.enum(["clean_place","spot"]).default("spot"),
  label: z.string().trim().min(2).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  notes: z.string().trim().max(2000).optional(),
});

function parseStatusParam(raw: string | null): SpotStatus | null {
 if (!raw) {
 return null;
 }
 return spotStatuses.includes(raw as SpotStatus) ? (raw as SpotStatus) : null;
}

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

function buildSpotsCacheKey(limit: number, status: SpotStatus | null): string {
 return [`limit:${limit}`, `status:${status ?? "all"}`].join("|");
}

async function loadCachedSpots(limit: number, status: SpotStatus | null) {
 const cached = unstable_cache(
  async () => {
   const supabase = getSupabaseServerClient();
   let query = supabase
   .from("trash_spotter_spots")
   .select(
"id, created_at, created_by_clerk_id, label, spot_type, latitude, longitude, status, notes",
   )
   .order("created_at", { ascending: false })
   .limit(limit);

   if (status) {
    query = query.eq("status", status);
   }

   const result = await query;
   if (result.error) {
    throw result.error;
   }

   return result.data ?? [];
  },
  ["spots", buildSpotsCacheKey(limit, status)],
  {
   revalidate: SPOTS_CACHE_REVALIDATE_SECONDS,
   tags: ["spots-map"],
  },
 );

 return cached();
}

export async function GET(request: Request) {
 const access = await requireAuthenticatedAccess();
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
  const status = parseStatusParam(url.searchParams.get("status"));

  try {
 const items = await loadCachedSpots(limit, status);
 return NextResponse.json({
 status:"ok",
 count: items.length,
 items,
 }, { headers: SPOTS_CACHE_HEADERS });
 } catch (error) {
 return handleApiError(error,"api/spots");
 }
}

export async function POST(request: Request) {
 const access = await requireAuthenticatedAccess();
 if (!access.ok) {
 return unauthorizedJsonResponse();
 }
 const { userId } = access;

 let payload: unknown;
 try {
 payload = await request.json();
 } catch {
 return NextResponse.json(
 { error:"Invalid JSON payload" },
 { status: 400 },
 );
 }

 const parsed = createSpotSchema.safeParse(payload);
 if (!parsed.success) {
 return validationErrorResponse(parsed.error.flatten().fieldErrors);
 }

 try {
 const supabase = getSupabaseServerClient();
 const identity = await getCurrentUserIdentity();
 const actorName = pickTraceableActorName(identity, undefined) ?? userId;
 const inserted = await createSignalement(supabase, {
   userId,
   type: parsed.data.type,
   label: parsed.data.label,
   latitude: parsed.data.latitude,
   longitude: parsed.data.longitude,
   notes: parsed.data.notes,
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
