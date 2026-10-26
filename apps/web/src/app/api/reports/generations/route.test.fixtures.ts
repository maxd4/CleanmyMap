export const validSnapshotPayload = {
  title: "Rapport d'impact - Paris - Par défaut",
  rubrique: "reporting",
  periode: "six_months",
  organizationType: "Global",
  data: { generatedAt: "2026-08-27T10:30:00.000Z", summary: ["Résumé"] },
};

export const multiInput = {
  payload: validSnapshotPayload,
  scopeKind: "global" as const,
  scopeValue: "",
  scopeLabel: "Global",
  detailLevel: "default",
  modules: {
    dataAndCartography: true,
    transparencyAndMethods: true,
    rawData: false,
    detailedFiles: true,
  },
};

export const validPayload = {
  input: {
    type: "multi_action" as const,
    period: { id: "six_months" as const },
    scope: { kind: "global" as const, value: null },
  },
  detailLevel: "default" as const,
  modules: multiInput.modules,
};
