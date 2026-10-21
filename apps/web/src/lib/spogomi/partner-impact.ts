import type { PublishedAnnuaireEntry } from "@/lib/partners/annuaire-types";
import { getCanonicalStaticOrganizerById } from "@/lib/actions/organizer-directory-registry";
import type { SpogomiRecognitionKind } from "./recognition";

export type SpogomiPublicOrganizer = {
  organizerId: string;
  verifiedName: string;
  role: "local_organizer";
  territory: string | null;
  officialSiteUrl: string | null;
  partnerEntryId: string | null;
  partnerProfileHref: string | null;
  officialCleanMyMapPartnership: false;
};

type SpogomiPartnerEnvironmentalResult = {
  status: "available" | "unavailable";
  totalWasteMassGrams: number | null;
  cigaretteButtsMassGrams: number | null;
  cigaretteButtsCount: number | null;
  participantsPresent: number | null;
  projectionVersion: string | null;
  sourceHash: string | null;
};

export type SpogomiPartnerEventInput = {
  eventId: string;
  eventSlug: string | null;
  name: string;
  locationLabel: string;
  mode: "casual" | "world_cup";
  state: string;
  startsAt: string;
  actionId: string;
  organizer: SpogomiPublicOrganizer | null;
  environmental: SpogomiPartnerEnvironmentalResult;
  verifiedParticipantIds: string[];
  participantIdentitiesReliable: boolean;
  certifiedMissions: Array<{ id: string; kind: SpogomiRecognitionKind }>;
};

type SpogomiPartnerEventSummary = Pick<
  SpogomiPartnerEventInput,
  "eventId" | "eventSlug" | "name" | "locationLabel" | "mode" | "state" | "startsAt" | "actionId" | "organizer" | "environmental"
>;

export type SpogomiPartnerImpact = {
  publishedEditionCount: number;
  confirmedTerrainParticipations: number | null;
  identifiedUniqueVolunteers: number | null;
  uniqueVolunteerStatus: "reliable" | "unavailable";
  totalWasteMassKg: number | null;
  cigaretteButtsMassKg: number | null;
  nonCigaretteWasteMassKg: number | null;
  countedCigaretteButts: number | null;
  certifiedVolunteerMissionCount: number;
  certifiedVolunteerMissionsByRole: Partial<Record<SpogomiRecognitionKind, number>>;
  byYear: Record<string, {
    publishedEditionCount: number;
    confirmedTerrainParticipations: number | null;
    totalWasteMassKg: number | null;
    cigaretteButtsMassKg: number | null;
    countedCigaretteButts: number | null;
  }>;
  events: SpogomiPartnerEventSummary[];
  provenance: Array<{
    eventId: string;
    actionId: string;
    projectionVersion: string | null;
    sourceHash: string | null;
  }>;
  notes: string[];
};

export function buildSpogomiPublicOrganizer(params: {
  organizerId: string | null | undefined;
  organizerName: string | null | undefined;
  eventTerritory: string;
  partnerEntry?: Pick<PublishedAnnuaireEntry, "id" | "websiteUrl"> | null;
}): SpogomiPublicOrganizer | null {
  const organizerId = params.organizerId?.trim() ?? "";
  const organizerName = params.organizerName?.trim() ?? "";
  if (!organizerId || !organizerName) return null;

  const catalogEntry = getCanonicalStaticOrganizerById(organizerId);
  if (!catalogEntry && !params.partnerEntry) return null;
  return {
    organizerId,
    verifiedName: organizerIdentity(catalogEntry, organizerName),
    role: "local_organizer",
    territory: organizerTerritory(catalogEntry, params.eventTerritory),
    ...organizerLinks(catalogEntry, params.partnerEntry),
    officialCleanMyMapPartnership: false,
  };
}

function organizerTerritory(catalogEntry: ReturnType<typeof getCanonicalStaticOrganizerById>, eventTerritory: string): string | null {
  if (catalogEntry?.city && catalogEntry.region) return `${catalogEntry.city} · ${catalogEntry.region}`;
  if (catalogEntry?.geographicScope === "national") return "France";
  return eventTerritory.trim() || null;
}

function organizerIdentity(catalogEntry: ReturnType<typeof getCanonicalStaticOrganizerById>, fallback: string): string {
  return catalogEntry?.name ?? fallback;
}

function organizerLinks(catalogEntry: ReturnType<typeof getCanonicalStaticOrganizerById>, partnerEntry?: Pick<PublishedAnnuaireEntry, "id" | "websiteUrl"> | null) {
  return { officialSiteUrl: partnerEntry?.websiteUrl ?? catalogEntry?.websiteUrl ?? null, partnerEntryId: partnerEntry?.id ?? null, partnerProfileHref: partnerEntry ? "/sections/annuaire#annuaire" : null };
}

function parseNonNegative(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value >= 0 ? value : null;
}

function sumNullable(values: number[]): number | null {
  return values.length ? values.reduce((total, value) => total + value, 0) : null;
}

function yearOf(value: string): string {
  const year = new Date(value).getUTCFullYear();
  return Number.isFinite(year) && year > 1970 ? String(year) : "inconnu";
}

function selectPartnerEvents(input: Iterable<SpogomiPartnerEventInput>): SpogomiPartnerEventInput[] {
  const events: SpogomiPartnerEventInput[] = [];
  const seenActionIds = new Set<string>();
  for (const event of input) {
    if (!event.eventId || !event.actionId || seenActionIds.has(event.actionId)) continue;
    seenActionIds.add(event.actionId);
    events.push(event);
  }
  return events;
}

function collectPartnerMetrics(events: SpogomiPartnerEventInput[]) {
  const availableEnvironmental = events.filter((event) => event.environmental.status === "available");
  const values = (field: "totalWasteMassGrams" | "cigaretteButtsMassGrams" | "cigaretteButtsCount" | "participantsPresent") => availableEnvironmental.map((event) => parseNonNegative(event.environmental[field])).filter((value): value is number => value !== null);
  return { availableEnvironmental, totalMasses: values("totalWasteMassGrams"), buttMasses: values("cigaretteButtsMassGrams"), buttCounts: values("cigaretteButtsCount"), participationValues: values("participantsPresent") };
}

function buildPartnerYearlyTotals(events: SpogomiPartnerEventInput[]): SpogomiPartnerImpact["byYear"] {
  const byYear: SpogomiPartnerImpact["byYear"] = {};
  for (const event of events) {
    const year = yearOf(event.startsAt);
    const current = byYear[year] ?? { publishedEditionCount: 0, confirmedTerrainParticipations: null, totalWasteMassKg: null, cigaretteButtsMassKg: null, countedCigaretteButts: null };
    current.publishedEditionCount += 1;
    const participants = parseNonNegative(event.environmental.participantsPresent);
    if (participants !== null) current.confirmedTerrainParticipations = (current.confirmedTerrainParticipations ?? 0) + participants;
    const totalMass = parseNonNegative(event.environmental.totalWasteMassGrams);
    if (totalMass !== null) current.totalWasteMassKg = (current.totalWasteMassKg ?? 0) + totalMass / 1000;
    const buttMass = parseNonNegative(event.environmental.cigaretteButtsMassGrams);
    if (buttMass !== null) current.cigaretteButtsMassKg = (current.cigaretteButtsMassKg ?? 0) + buttMass / 1000;
    const buttCount = parseNonNegative(event.environmental.cigaretteButtsCount);
    if (buttCount !== null) current.countedCigaretteButts = (current.countedCigaretteButts ?? 0) + buttCount;
    byYear[year] = current;
  }
  return byYear;
}

function buildPartnerNotes(events: SpogomiPartnerEventInput[], availableCount: number, identityReliable: boolean): string[] {
  return [
    ...(events.length !== availableCount ? ["Certains résultats environnementaux publiables sont absents ou incomplets."] : []),
    ...(events.some((event) => parseNonNegative(event.environmental.totalWasteMassGrams) === null || parseNonNegative(event.environmental.cigaretteButtsMassGrams) === null || parseNonNegative(event.environmental.cigaretteButtsCount) === null) ? ["Certaines composantes de masse ou de comptage sont absentes ; les totaux non comparables restent signalés."] : []),
    ...(identityReliable ? [] : ["Le nombre de bénévoles uniques n'est pas comparable avec les sources d'identité disponibles."]),
    ...(events.some((event) => event.environmental.cigaretteButtsMassGrams !== null || event.environmental.cigaretteButtsCount !== null) ? ["La masse de mégots et le comptage observé restent séparés ; aucune conversion n'est appliquée."] : []),
  ];
}

export function aggregateSpogomiPartnerImpact(
  input: Iterable<SpogomiPartnerEventInput>,
): SpogomiPartnerImpact {
  const events = selectPartnerEvents(input);
  const { availableEnvironmental, totalMasses, buttMasses, buttCounts, participationValues } = collectPartnerMetrics(events);
  const identityReliable = events.length > 0 && events.every((event) => event.participantIdentitiesReliable);
  const uniqueIds = new Set(events.flatMap((event) => event.verifiedParticipantIds));
  const missionCounts: Partial<Record<SpogomiRecognitionKind, number>> = {};
  for (const mission of events.flatMap((event) => event.certifiedMissions)) {
    missionCounts[mission.kind] = (missionCounts[mission.kind] ?? 0) + 1;
  }

  const byYear = buildPartnerYearlyTotals(events);

  const totalWasteMassKg = totalMasses.length ? sumNullable(totalMasses) as number / 1000 : null;
  const cigaretteButtsMassKg = buttMasses.length ? sumNullable(buttMasses) as number / 1000 : null;
  const completeMassInputs = events.length > 0 && events.every((event) =>
    event.environmental.status === "available" &&
    parseNonNegative(event.environmental.totalWasteMassGrams) !== null &&
    parseNonNegative(event.environmental.cigaretteButtsMassGrams) !== null,
  );
  const nonCigaretteWasteMassKg = completeMassInputs && totalWasteMassKg !== null && cigaretteButtsMassKg !== null && cigaretteButtsMassKg <= totalWasteMassKg
    ? totalWasteMassKg - cigaretteButtsMassKg
    : null;
  const notes = buildPartnerNotes(events, availableEnvironmental.length, identityReliable);

  return {
    publishedEditionCount: events.length,
    confirmedTerrainParticipations: participationValues.length === events.length ? sumNullable(participationValues) : null,
    identifiedUniqueVolunteers: identityReliable ? uniqueIds.size : null,
    uniqueVolunteerStatus: identityReliable ? "reliable" : "unavailable",
    totalWasteMassKg,
    cigaretteButtsMassKg,
    nonCigaretteWasteMassKg,
    countedCigaretteButts: buttCounts.length ? sumNullable(buttCounts) : null,
    certifiedVolunteerMissionCount: Object.values(missionCounts).reduce((total, count) => total + (count ?? 0), 0),
    certifiedVolunteerMissionsByRole: missionCounts,
    byYear,
    events: events.map((event) => ({
      eventId: event.eventId,
      eventSlug: event.eventSlug,
      name: event.name,
      locationLabel: event.locationLabel,
      mode: event.mode,
      state: event.state,
      startsAt: event.startsAt,
      actionId: event.actionId,
      organizer: event.organizer,
      environmental: event.environmental,
    })),
    provenance: events.map((event) => ({ eventId: event.eventId, actionId: event.actionId, projectionVersion: event.environmental.projectionVersion, sourceHash: event.environmental.sourceHash })),
    notes,
  };
}
