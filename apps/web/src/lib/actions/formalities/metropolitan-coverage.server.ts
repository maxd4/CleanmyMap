import { type FetchLike, resolveActionDepartmentAnchor } from "@/lib/geo/action-department-resolver";
import type { ActionRow } from "@/types/database";
import { isMetropolitanCommune, type CommuneCoverage, type MetropolitanContacts, type DirectoryContact } from "./metropolitan-contacts-contract";
import {
  createDilaRequestBudget,
  lookupMetropolitanContacts,
  MAX_DILA_REQUESTS_PER_ACTION,
} from "./metropolitan-directory.server";
import type { SupportNeed } from "./accompaniment";

type Location = Pick<ActionRow, "latitude" | "longitude" | "department_code" | "department_name" | "derived_geometry_kind" | "derived_geometry_geojson">;
const ENDPOINT = "https://apicarto.ign.fr/api/limites-administratives/commune";
const MAX_GEOMETRY_BYTES = 80_000;
const MAX_COMMUNES = 12;
const TIMEOUT = 5000;
function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function unknown(reason: string): CommuneCoverage { return { status: "unknown", communeCodes: [], reason }; }
function point(value: unknown): boolean {
  return Array.isArray(value) && value.length === 2 &&
    typeof value[0] === "number" && Number.isFinite(value[0]) && Math.abs(value[0]) <= 180 &&
    typeof value[1] === "number" && Number.isFinite(value[1]) && Math.abs(value[1]) <= 90;
}
function line(value: unknown, minimum: number): boolean {
  return Array.isArray(value) && value.length >= minimum && value.every(point);
}
function closedRing(value: unknown): boolean {
  return line(value, 4) && Array.isArray(value) && JSON.stringify(value[0]) === JSON.stringify(value[value.length - 1]);
}
function canonicalGeometry(location: Location): Record<string, unknown> | null {
  if (location.derived_geometry_kind === "point") {
    const anchor = resolveActionDepartmentAnchor({latitude:location.latitude,longitude:location.longitude,
      geometry:{kind:location.derived_geometry_kind,geojson:location.derived_geometry_geojson}});
    return anchor ? {type:"Point",coordinates:[anchor[1],anchor[0]]} : null;
  }
  if (!location.derived_geometry_geojson || location.derived_geometry_geojson.length > MAX_GEOMETRY_BYTES) return null;
  try {
    const g = object(JSON.parse(location.derived_geometry_geojson));
    if (!g) return null;
    if (location.derived_geometry_kind === "polyline" && g.type === "LineString" && line(g.coordinates, 2)) return {type:g.type,coordinates:g.coordinates};
    if (location.derived_geometry_kind === "polygon" && g.type === "Polygon" && Array.isArray(g.coordinates) &&
      g.coordinates.length > 0 && g.coordinates.every(closedRing)) return {type:g.type,coordinates:g.coordinates};
  } catch { return null; }
  return null;
}

/** IGN intersects the actual geometry, not the statistical anchor for routes/areas.
 * POST JSON geom is a JSON string, matching API Carto's public controller.
 * The provider's intersection result is not proof that the entire route is in France.
 */
export async function resolveMetropolitanCoverage(location: Location, fetchImpl: FetchLike = fetch): Promise<CommuneCoverage> {
  const geometry = canonicalGeometry(location);
  if (!geometry) return unknown("Géométrie non exploitable ou trop volumineuse ; identifier les communes manuellement.");
  const geom = JSON.stringify(geometry);
  if (new TextEncoder().encode(geom).length > MAX_GEOMETRY_BYTES) return unknown("Géométrie trop volumineuse.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetchImpl(ENDPOINT, {method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
      body:JSON.stringify({geom,_limit:MAX_COMMUNES+1}),signal:controller.signal,cache:"no-store"});
    if (!response.ok) return unknown("Service cartographique indisponible.");
    const data = object(await response.json());
    if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) return unknown("Réponse cartographique non exploitable.");
    const codes = new Set<string>();
    let invalid = false;
    for (const feature of data.features) {
      const props = object(object(feature)?.properties);
      if (!isMetropolitanCommune(props?.insee_com)) { invalid = true; continue; }
      codes.add(props.insee_com);
    }
    const all = [...codes].sort();
    const total = data.totalFeatures ?? data.numberMatched;
    const truncated = data.features.length > MAX_COMMUNES || (typeof total === "number" && total > data.features.length);
    if (!all.length) return unknown("Aucune commune métropolitaine identifiée.");
    if (geometry.type === "Point" && all.length === 1 && !invalid && !truncated) return {status:"resolved_point",communeCodes:all};
    return {status:invalid || truncated || geometry.type === "Point" ? "partial" : "intersections",
      communeCodes:all.slice(0,MAX_COMMUNES),
      reason:"Communes intersectées par la géométrie ; vérifier les limites, gestionnaires et éventuels territoires non couverts."};
  } catch { return unknown("Service cartographique indisponible."); }
  finally { clearTimeout(timeout); }
}

export async function loadMetropolitanContacts(location: Location, needs: readonly SupportNeed[] = []): Promise<MetropolitanContacts> {
  const requestBudget = createDilaRequestBudget(MAX_DILA_REQUESTS_PER_ACTION);
  const coverage = await resolveMetropolitanCoverage(location);
  if (!coverage.communeCodes.length) return {coverage,contacts:[],unresolvedCommuneCodes:[],status:"not_applicable",lookupBudget:{requestsUsed:0,requestsAllowed:MAX_DILA_REQUESTS_PER_ACTION}};
  const contacts = new Map<string,DirectoryContact>();
  const unresolved: string[] = [];
  // Four commune lookups at a time share one deterministic 48-request ceiling for this action.
  for (let i=0;i<coverage.communeCodes.length;i+=4) {
    await Promise.all(coverage.communeCodes.slice(i,i+4).map(async code => {
      try {
        const result = await lookupMetropolitanContacts(code, undefined, needs, requestBudget);
        if (!result.complete) unresolved.push(code);
        for (const contact of result.contacts) {
          const previous = contacts.get(contact.id);
          contacts.set(contact.id,previous ? {...previous,
            communeCodes:[...new Set([...previous.communeCodes,...contact.communeCodes])].sort(),
            types:[...new Set([...previous.types,...contact.types])].sort()} : contact);
        }
      } catch { unresolved.push(code); }
    }));
  }
  return {coverage,contacts:[...contacts.values()].sort((a,b)=>a.name.localeCompare(b.name,"fr") || a.id.localeCompare(b.id)),
    unresolvedCommuneCodes:unresolved.sort(),
    status:unresolved.length===coverage.communeCodes.length && contacts.size===0 ? "unavailable" :
      unresolved.length || coverage.status==="partial" ? "partial" : "complete",
    lookupBudget:{requestsUsed:requestBudget.used,requestsAllowed:MAX_DILA_REQUESTS_PER_ACTION}};
}
