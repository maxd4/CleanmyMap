export type PersonalAttribution = {
  attributionKind: "quote_part";
  confirmedParticipantCount: number;
  wasteKg: number | null;
  cigaretteButts: number | null;
};

function finiteNonNegative(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

/**
 * Derives profile-only attribution from final additive action results.
 * It deliberately excludes duration, route, headcounts and other non-additive data.
 */
export function derivePersonalAttribution(params: {
  participationStatus: "pending" | "confirmed" | "cancelled" | null;
  confirmedParticipantCount: number | null | undefined;
  finalWasteKg: number | null;
  finalCigaretteButts: number | null;
}): PersonalAttribution | null {
  if (params.participationStatus !== "confirmed") {
    return null;
  }

  const confirmedParticipantCountValue = finiteNonNegative(params.confirmedParticipantCount);
  const confirmedParticipantCount =
    confirmedParticipantCountValue === null
      ? null
      : Math.trunc(confirmedParticipantCountValue);
  if (confirmedParticipantCount === null || confirmedParticipantCount < 1) {
    return null;
  }

  const wasteKg = finiteNonNegative(params.finalWasteKg);
  const cigaretteButts = finiteNonNegative(params.finalCigaretteButts);
  if (wasteKg === null && cigaretteButts === null) {
    return null;
  }

  return {
    attributionKind: "quote_part",
    confirmedParticipantCount,
    wasteKg: wasteKg === null ? null : wasteKg / confirmedParticipantCount,
    cigaretteButts:
      cigaretteButts === null ? null : cigaretteButts / confirmedParticipantCount,
  };
}
