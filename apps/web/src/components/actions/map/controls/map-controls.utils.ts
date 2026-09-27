import {
  buildTerritoryNominatimSearchUrl,
  parseTerritoryCoordinates,
} from "@/lib/geo/territory";

export function buildNominatimSearchUrl(query: string): string | null {
  return buildTerritoryNominatimSearchUrl(query);
}

export { parseTerritoryCoordinates as parseNominatimCoordinates };
