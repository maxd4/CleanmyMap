import type { UnifiedSourceHealth } from "@/lib/actions/unified-source/types";

export type CommunityEventsAvailability = "available" | "partial" | "unavailable";

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

  if (availability.communityEventsAvailability === "partial") {
    notices.push(
      "Les événements communautaires ne peuvent pas être attribués entièrement à ce périmètre ; leurs indicateurs sont indisponibles.",
    );
  }

  return notices;
}

/** Presentation of sums: zero is valid only when at least one observation supports it. */
export function formatCoveredReportValue(formattedValue: string, knownActions: number | undefined, totalActions: number): string {
  return knownActions !== undefined && knownActions > 0 && totalActions > 0 ? formattedValue : "Non renseigné";
}

export function describeReportMeasurementCoverage(knownActions: number | undefined, totalActions: number): string {
  if (totalActions <= 0) return "Aucune action dans la période";
  if (knownActions === undefined) return "Couverture non renseignée";
  return `${knownActions}/${totalActions} actions renseignées`;
}
