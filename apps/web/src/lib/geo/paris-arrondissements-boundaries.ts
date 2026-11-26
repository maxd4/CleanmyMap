import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import type { ParisArrondissement } from "@/lib/geo/paris-arrondissements";
import rawBoundaries from "./paris-arrondissements-boundaries.json";

export interface ParisArrondissementProperties {
  c_ar: number;
  c_arinsee: number;
  l_ar: string;
  l_aroff: string;
}

export const PARIS_ARRONDISSEMENTS_PROVENANCE = {
  datasetUrl: "https://opendata.paris.fr/explore/dataset/arrondissements/",
  exportUrl:
    "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/arrondissements/exports/geojson",
  license: "ODbL",
  attribution: "Ville de Paris — Paris Data (arrondissements, ODbL)",
  verifiedAt: "2026-11-26",
} as const;

export const PARIS_ARRONDISSEMENTS_GEOJSON =
  rawBoundaries as FeatureCollection<Geometry, ParisArrondissementProperties>;

function pointInRing(lng: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygonCoords(lng: number, lat: number, rings: Position[][]): boolean {
  if (rings.length === 0 || !pointInRing(lng, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i += 1) {
    if (pointInRing(lng, lat, rings[i])) return false;
  }
  return true;
}

function pointInFeature(
  lng: number,
  lat: number,
  feature: Feature<Geometry, ParisArrondissementProperties>,
): boolean {
  const { geometry } = feature;
  if (geometry.type === "Polygon") {
    return pointInPolygonCoords(lng, lat, geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((poly) => pointInPolygonCoords(lng, lat, poly));
  }
  return false;
}

/**
 * Détermine l'arrondissement parisien officiel contenant un point géographique vérifié.
 * Utilise exclusivement les 20 polygones Paris Data (sans inférer la couverture opérationnelle).
 */
export function findParisArrondissementForPoint(
  lat: number,
  lng: number,
): ParisArrondissement | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  for (const feature of PARIS_ARRONDISSEMENTS_GEOJSON.features) {
    if (pointInFeature(lng, lat, feature)) {
      const num = feature.properties.c_ar;
      if (Number.isInteger(num) && num >= 1 && num <= 20) {
        return num as ParisArrondissement;
      }
    }
  }
  return null;
}

export function isPointInParisIntramuros(lat: number, lng: number): boolean {
  return findParisArrondissementForPoint(lat, lng) !== null;
}
