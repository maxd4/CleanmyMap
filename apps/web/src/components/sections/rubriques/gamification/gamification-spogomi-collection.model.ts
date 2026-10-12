import type { SpogomiCollectionAward } from "@/lib/spogomi/collection";

export type SpogomiCollectionKind = "all" | "collector" | "referee" | "organizer" | "podium";

export type SpogomiCollectionFilters = {
  year: "all" | number;
  kind: SpogomiCollectionKind;
  eventId: "all" | string;
};

export function getSpogomiCollectionKind(badgeTypeId: string): Exclude<SpogomiCollectionKind, "all"> {
  if (badgeTypeId === "spogomi_collector") return "collector";
  if (badgeTypeId === "spogomi_referee") return "referee";
  if (badgeTypeId === "spogomi_organizer") return "organizer";
  return "podium";
}

export function filterSpogomiCollection(
  awards: readonly SpogomiCollectionAward[],
  filters: SpogomiCollectionFilters,
): SpogomiCollectionAward[] {
  return awards.filter((award) =>
    (filters.year === "all" || award.eventYear === filters.year) &&
    (filters.eventId === "all" || award.eventId === filters.eventId) &&
    (filters.kind === "all" || getSpogomiCollectionKind(award.badgeTypeId) === filters.kind),
  );
}

export function getSpogomiYears(awards: readonly SpogomiCollectionAward[]): number[] {
  return [...new Set(awards.map((award) => award.eventYear))].sort((left, right) => right - left);
}

export function getSpogomiEvents(awards: readonly SpogomiCollectionAward[]) {
  const events = new Map<string, { id: string; name: string; year: number }>();
  for (const award of awards) {
    if (!events.has(award.eventId)) events.set(award.eventId, { id: award.eventId, name: award.eventName, year: award.eventYear });
  }
  return [...events.values()].sort((left, right) => right.year - left.year || left.name.localeCompare(right.name, "fr"));
}
