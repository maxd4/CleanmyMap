import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";

export type CommunityEventsAvailability = "available" | "unavailable";

export type ReportDataAvailability = {
  isTruncated?: boolean;
  sourceHealth?: UnifiedSourceHealth;
  communityEventsAvailability?: CommunityEventsAvailability;
};

export function buildReportDataAvailabilityNotices(
  availability: ReportDataAvailability = {},
): string[] {
  const notices: string[] = [];

  if (availability.isTruncated) {
    notices.push(
      "Données potentiellement partielles : la limite de chargement a été atteinte.",
    );
  }

  if (
    availability.sourceHealth?.partial ||
    (availability.sourceHealth?.failedSources.length ?? 0) > 0
  ) {
    notices.push(
      "Certaines sources sont indisponibles : les indicateurs ne sont pas exhaustifs.",
    );
  }

  if (availability.communityEventsAvailability === "unavailable") {
    notices.push(
      "Les événements communautaires sont indisponibles ; leur absence ne vaut pas zéro.",
    );
  }

  return notices;
}
