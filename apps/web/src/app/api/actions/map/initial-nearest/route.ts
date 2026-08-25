import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/http/api-errors";
import { fetchActionPollutionScoreReferences } from "@/lib/actions/pollution-score-references";
import {
  deriveReferenceFromBounds,
  INITIAL_MAP_SEARCH_RADII_KM,
  selectNearestActivePollution,
} from "@/lib/actions/initial-nearest-pollution";
import { loadInitialPollutionItems } from "@/lib/actions/initial-nearest-pollution-source";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Justification Vercel: recherche initiale bornée par rayon, sans snapshot ni cache persistant.
export const dynamic = "force-dynamic";

function parseFiniteParam(url: URL, name: string): number | null {
  const raw = url.searchParams.get(name);
  if (!raw) {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseBounds(url: URL) {
  const south = parseFiniteParam(url, "south");
  const west = parseFiniteParam(url, "west");
  const north = parseFiniteParam(url, "north");
  const east = parseFiniteParam(url, "east");

  if (
    south === null ||
    west === null ||
    north === null ||
    east === null ||
    south >= north ||
    west >= east ||
    south < -90 ||
    north > 90 ||
    west < -180 ||
    east > 180
  ) {
    return null;
  }

  return { south, west, north, east, zoom: null };
}

function parseRadius(url: URL): number | null {
  const value = parseFiniteParam(url, "radiusKm");
  return value !== null && INITIAL_MAP_SEARCH_RADII_KM.includes(value as (typeof INITIAL_MAP_SEARCH_RADII_KM)[number])
    ? value
    : null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const bounds = parseBounds(url);
    const radiusKm = parseRadius(url);

    if (!bounds || radiusKm === null) {
      return NextResponse.json({ error: "Paramètres de recherche invalides." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient(false);
    const [items, pollutionScoreReferences] = await Promise.all([
      loadInitialPollutionItems(supabase, bounds),
      fetchActionPollutionScoreReferences(supabase),
    ]);
    const reference = deriveReferenceFromBounds(bounds);
    const item = selectNearestActivePollution(
      items,
      reference,
      pollutionScoreReferences,
      radiusKm,
    );

    return NextResponse.json({ item });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/map/initial-nearest");
  }
}
