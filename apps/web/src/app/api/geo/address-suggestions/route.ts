import { NextResponse } from "next/server";
import {
  buildGreaterParisNominatimSearchUrlWithLimit,
  formatGreaterParisAddressLabel,
  formatGreaterParisAddressSubtitle,
  isWithinGreaterParisBounds,
  parseNominatimCoordinates,
  searchLocalGreaterParisAddressSuggestions,
  type NominatimSearchResult,
} from "@/lib/geo/greater-paris";

export const runtime = "nodejs";

type AddressSuggestion = {
  label: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  importance: number | null;
};

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 6;
  }
  return Math.min(8, parsed);
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

  const searchUrl = buildGreaterParisNominatimSearchUrlWithLimit(query, limit);
  if (!searchUrl) {
    return NextResponse.json({
      status: "ok",
      query,
      items: [],
    });
  }

  const localSuggestions = searchLocalGreaterParisAddressSuggestions(query, limit);
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
    const response = await fetch(searchUrl, {
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

    const data = (await response.json()) as NominatimSearchResult[];
    const seen = new Set<string>();
    const items: AddressSuggestion[] = [];

    for (const item of data) {
      const coordinates = parseNominatimCoordinates(item);
      if (!coordinates) {
        continue;
      }
      if (
        !isWithinGreaterParisBounds(coordinates.latitude, coordinates.longitude)
      ) {
        continue;
      }

      const label = formatGreaterParisAddressLabel(item);
      if (seen.has(label.toLowerCase())) {
        continue;
      }
      seen.add(label.toLowerCase());

      items.push({
        label,
        subtitle: formatGreaterParisAddressSubtitle(item),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        importance:
          typeof item.importance === "number" && Number.isFinite(item.importance)
            ? item.importance
            : null,
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
