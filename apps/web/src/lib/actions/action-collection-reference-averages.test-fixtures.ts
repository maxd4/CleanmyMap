export type HistoricalCollectionReferenceFixtureRow = {
  participants: number;
  wasteKg: number | null;
  cigaretteButts: number | null;
};

/**
 * Anonymized observation fixture matching the five exploitable actions checked
 * in Supabase on 2026-11-06. It is test data only, not a production constant.
 */
export const HISTORICAL_COLLECTION_REFERENCE_FIXTURE = [
  { participants: 15, wasteKg: null, cigaretteButts: 3_750 },
  { participants: 10, wasteKg: null, cigaretteButts: 750 },
  { participants: 20, wasteKg: 20, cigaretteButts: 6_250 },
  { participants: 10, wasteKg: null, cigaretteButts: 1_875 },
  { participants: 10, wasteKg: 20, cigaretteButts: 1_250 },
] satisfies readonly HistoricalCollectionReferenceFixtureRow[];
