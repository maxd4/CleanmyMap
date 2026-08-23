/**
 * Bornes de lecture propres à la surface /reports.
 *
 * Ces valeurs limitent la charge ; elles ne constituent pas des règles métier.
 * Toute modification doit démontrer une consommation Supabase/Vercel neutre ou
 * inférieure avant d'être acceptée.
 */
export const REPORT_DATA_BUDGET = {
  pilotage: {
    periodDays: 90,
    contractLimit: 2200,
  },
  generation: {
    approvedContractLimit: 1000,
  },
  communityEvents: {
    limit: 120,
  },
  weather: {
    revalidateSeconds: 900,
  },
} as const;
