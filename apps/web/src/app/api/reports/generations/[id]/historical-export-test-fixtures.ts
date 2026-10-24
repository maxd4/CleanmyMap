export const HISTORICAL_REPORT_ID = "11111111-1111-4111-8111-111111111111";

export const HISTORICAL_REPORT_GENERATION = {
  id: HISTORICAL_REPORT_ID,
  filename: "rapport_reporting_six_months.pdf",
  generatedAt: "2026-08-27T10:30:00.000Z",
  scopeKind: "global",
  scopeValue: "",
  scopeLabel: "Global",
  detailLevel: "default",
  snapshot: {
    title: "Rapport historique",
    rubrique: "reporting",
    periode: "six_months",
    organizationType: "Global",
    data: {
      generatedAt: "2026-08-27T10:30:00.000Z",
      rows: [{ Masse_Kg: 2, Megots: null }],
      columns: [{ key: "Masse_Kg", label: "Masse (kg)" }, { key: "Megots", label: "Mégots" }],
    },
  },
};
