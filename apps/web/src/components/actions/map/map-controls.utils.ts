import {
  buildGreaterParisNominatimSearchUrl,
  parseNominatimCoordinates,
} from "@/lib/geo/greater-paris";

export function buildNominatimSearchUrl(query: string): string | null {
  return buildGreaterParisNominatimSearchUrl(query);
}

export { parseNominatimCoordinates };
