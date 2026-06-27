import { NextResponse } from "next/server";
import {
  searchLocalTerritoryAddressSuggestions,
} from "@/lib/geo/territory";

export const runtime = "nodejs";

type AddressSuggestion = {
  label: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  importance: number | null;
};

type GeoplateformeCompletionResult = {
  x?: number;
  y?: number;
  country?: string;
  names?: string[];
  metropole?: boolean;
  poiType?: string[];
  kind?: string;
  fulltext?: string;
  classification?: number;
  zipcode?: string;
  city?: string;
  oldcity?: string;
};

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 6;
  }
  return Math.min(8, parsed);
}

function buildGeoplateformeCompletionUrl(query: string, limit: number): string | null {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return null;
  }

  const params = new URLSearchParams({
    text: normalizedQuery,
    type: "StreetAddress,PositionOfInterest",
    maximumResponses: String(Math.max(1, Math.min(8, Math.trunc(limit) || 1))),
    terr: "METROPOLE",
  });

  return `https://data.geopf.fr/geocodage/completion/?${params.toString()}`;
}

function cleanLabelPart(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function formatGeoplateformeLabel(result: GeoplateformeCompletionResult): string {
  return (
    cleanLabelPart(result.fulltext) ||
    cleanLabelPart(result.names?.[0]) ||
    cleanLabelPart(result.city) ||
    cleanLabelPart(result.kind) ||
    "Lieu sans libellé"
  );
}

function formatGeoplateformeSubtitle(result: GeoplateformeCompletionResult): string {
  const parts: string[] = [];
  const postcode = cleanLabelPart(result.zipcode);
  const city = cleanLabelPart(result.city || result.oldcity);
  const kind = cleanLabelPart(result.kind);
  const poiType = result.poiType?.filter(Boolean).join(" · ");

  if (postcode || city) {
    parts.push([postcode, city].filter(Boolean).join(" "));
  }

  if (kind && kind !== city) {
    parts.push(kind);
  }

  if (poiType && poiType !== kind) {
    parts.push(poiType);
  }

  if (parts.length === 0 && result.country) {
    parts.push(result.country);
  }

  return parts.join(" · ");
}

function formatGeoplateformeImportance(result: GeoplateformeCompletionResult): number | null {
  if (typeof result.classification === "number" && Number.isFinite(result.classification)) {
    return 1 / Math.max(1, result.classification);
  }

  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const limit = parseLimit(url.searchParams.get("limit"));

  if (query.length < 3) {
    return NextResponse.json({
      status: "ok",
      query,
      items: [],
    });
  }

  const localSuggestions = searchLocalTerritoryAddressSuggestions(query, limit);
  if (localSuggestions.length > 0) {
    return NextResponse.json({
      status: "ok",
      query,
      items: localSuggestions.map((item) => ({
        ...item,
        importance: item.importance,
      })),
    });
  }

  try {
    const geoplateformeUrl = buildGeoplateformeCompletionUrl(query, limit);
    if (!geoplateformeUrl) {
      return NextResponse.json({
        status: "ok",
        query,
        items: [],
      });
    }

    const response = await fetch(geoplateformeUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        status: "ok",
        query,
        items: [],
      });
    }

    const data = (await response.json()) as { results?: GeoplateformeCompletionResult[] };
    const seen = new Set<string>();
    const items: AddressSuggestion[] = [];

    for (const item of data.results ?? []) {
      if (typeof item.x !== "number" || typeof item.y !== "number") {
        continue;
      }

      const label = formatGeoplateformeLabel(item);
      const normalizedLabel = label.toLowerCase();
      if (seen.has(normalizedLabel)) {
        continue;
      }
      seen.add(normalizedLabel);

      items.push({
        label,
        subtitle: formatGeoplateformeSubtitle(item),
        latitude: item.y,
        longitude: item.x,
        importance: formatGeoplateformeImportance(item),
      });
    }

    items.sort((left, right) => (right.importance ?? 0) - (left.importance ?? 0));

    return NextResponse.json({
      status: "ok",
      query,
      items,
    });
  } catch {
    return NextResponse.json({
      status: "ok",
      query,
      items: [],
    });
  }
}
