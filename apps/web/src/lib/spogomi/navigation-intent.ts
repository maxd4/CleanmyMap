import type { SpogomiPersonalEvent, SpogomiPersonalRelation } from "./personal-events-service";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";

export const SPOGOMI_CATALOG_JOURNEYS = ["volunteers", "referees", "organizers"] as const;
export type SpogomiCatalogJourney = (typeof SPOGOMI_CATALOG_JOURNEYS)[number];

export const SPOGOMI_CATALOG_FOCUSES = [
  "attendance",
  "operations",
  "results",
  "arbitration",
  "teams",
  "bilan",
  "settings",
] as const;
export type SpogomiCatalogFocus = (typeof SPOGOMI_CATALOG_FOCUSES)[number];

type RawCatalogIntent = {
  parcours?: string | string[];
  section?: string | string[];
};

export type SpogomiCatalogIntent = {
  journey: SpogomiCatalogJourney | null;
  focus: SpogomiCatalogFocus | null;
};

export const SPOGOMI_EVENT_FOCUSES = [
  "quiz",
  "registration",
  "team",
  "identity",
  "assistance",
  "volunteer-help",
  "practical",
  "results",
  "contributions",
  "attestations",
] as const;
export type SpogomiEventFocus = (typeof SPOGOMI_EVENT_FOCUSES)[number];
export type SpogomiEventDivisionType = "casual" | "world_cup";

type RawEventIntent = {
  focus?: string | string[];
  division?: string | string[];
};

export type SpogomiEventIntent = {
  focus: SpogomiEventFocus | null;
  division: SpogomiEventDivisionType | null;
};

const EVENT_FOCUS_ANCHORS: Record<SpogomiEventFocus, string> = {
  quiz: "spogomi-sports-registration",
  registration: "spogomi-sports-registration",
  team: "spogomi-teams",
  identity: "spogomi-identity",
  assistance: "spogomi-identity",
  "volunteer-help": "spogomi-volunteer-help",
  practical: "spogomi-practical-information",
  results: "spogomi-public-results",
  contributions: "spogomi-contributions",
  attestations: "spogomi-contributions",
};

const JOURNEY_FOCUSES: Record<SpogomiCatalogJourney, readonly SpogomiCatalogFocus[]> = {
  volunteers: [],
  referees: ["attendance", "operations", "results", "arbitration"],
  organizers: ["results", "teams", "bilan", "settings"],
};

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? undefined : value;
}

function isJourney(value: string | undefined): value is SpogomiCatalogJourney {
  return value !== undefined && (SPOGOMI_CATALOG_JOURNEYS as readonly string[]).includes(value);
}

function isFocus(value: string | undefined): value is SpogomiCatalogFocus {
  return value !== undefined && (SPOGOMI_CATALOG_FOCUSES as readonly string[]).includes(value);
}

function isEventFocus(value: string | undefined): value is SpogomiEventFocus {
  return value !== undefined && (SPOGOMI_EVENT_FOCUSES as readonly string[]).includes(value);
}

function isEventDivision(value: string | undefined): value is SpogomiEventDivisionType {
  return value === "casual" || value === "world_cup";
}

export function parseSpogomiEventIntent(params: RawEventIntent | undefined): SpogomiEventIntent {
  const focusValue = single(params?.focus);
  const divisionValue = single(params?.division);
  return {
    focus: isEventFocus(focusValue) ? focusValue : null,
    division: isEventDivision(divisionValue) ? divisionValue : null,
  };
}

export function buildSpogomiEventHref(
  slug: string,
  options: { focus?: SpogomiEventFocus; division?: SpogomiEventDivisionType } = {},
): string {
  const params = new URLSearchParams();
  if (options.focus) params.set("focus", options.focus);
  if (options.division) params.set("division", options.division);
  const query = params.toString();
  const hash = options.focus ? `#${EVENT_FOCUS_ANCHORS[options.focus]}` : "";
  return `/spogomi/${encodeURIComponent(slug)}${query ? `?${query}` : ""}${hash}`;
}

export function buildSpogomiEventSignInHref(
  slug: string,
  options: { focus?: SpogomiEventFocus; division?: SpogomiEventDivisionType } = {},
): string {
  return buildSignInRedirectHref(buildSpogomiEventHref(slug, options));
}

export function parseSpogomiCatalogIntent(params: RawCatalogIntent | undefined): SpogomiCatalogIntent {
  const journeyValue = single(params?.parcours);
  const journey = isJourney(journeyValue) ? journeyValue : null;
  const focusValue = single(params?.section);
  const focus = journey && isFocus(focusValue) && JOURNEY_FOCUSES[journey].includes(focusValue) ? focusValue : null;
  return { journey, focus };
}

export function buildSpogomiCatalogHref(journey: SpogomiCatalogJourney, focus?: SpogomiCatalogFocus): string {
  const params = new URLSearchParams({ parcours: journey });
  if (focus && JOURNEY_FOCUSES[journey].includes(focus)) params.set("section", focus);
  return `/spogomi/mes-evenements?${params.toString()}`;
}

export function isSpogomiEventInJourney(event: Pick<SpogomiPersonalEvent, "relations">, journey: SpogomiCatalogJourney): boolean {
  const relations = new Set<SpogomiPersonalRelation>(event.relations);
  if (journey === "volunteers") return relations.has("participant") || relations.has("applicant");
  if (journey === "organizers") return relations.has("organizer");
  return relations.has("referee") || relations.has("checkin") || relations.has("observer") || relations.has("field_operator");
}

function defaultSpaceFocus(event: Pick<SpogomiPersonalEvent, "relations">, journey: SpogomiCatalogJourney): SpogomiCatalogFocus | null {
  const relations = new Set<SpogomiPersonalRelation>(event.relations);
  if (journey === "organizers" && relations.has("organizer")) return "teams";
  if (journey === "referees") {
    if (relations.has("field_operator")) return "operations";
    if (relations.has("referee")) return "arbitration";
    if (relations.has("checkin")) return "attendance";
    if (relations.has("observer")) return "results";
  }
  return null;
}

function canOpenRequestedFocus(
  event: Pick<SpogomiPersonalEvent, "relations">,
  journey: SpogomiCatalogJourney,
  focus: SpogomiCatalogFocus,
): boolean {
  const relations = new Set<SpogomiPersonalRelation>(event.relations);
  if (journey === "organizers") return relations.has("organizer");
  if (journey !== "referees") return false;
  if (focus === "attendance") return relations.has("checkin");
  if (focus === "operations") return relations.has("field_operator");
  if (focus === "arbitration") return relations.has("referee");
  if (focus === "results") return relations.has("referee") || relations.has("observer");
  return false;
}

export function buildSpogomiEventSpaceHref(
  event: Pick<SpogomiPersonalEvent, "relations" | "links">,
  journey: SpogomiCatalogJourney,
  requestedFocus?: SpogomiCatalogFocus | null,
): string | null {
  if (journey === "volunteers") return null;
  if (!event.links.space) return null;
  const focus = requestedFocus && canOpenRequestedFocus(event, journey, requestedFocus)
    ? requestedFocus
    : defaultSpaceFocus(event, journey);
  return focus ? `${event.links.space}#${focus}` : event.links.space;
}
