import type {
  EnvironmentalImpactProjectSignals,
  EnvironmentalImpactScopeEstimate,
  EnvironmentalImpactScopeInput,
} from "@/lib/environmental-impact-estimator/types";

export type EnvironmentalImpactCurveDriverRow = {
  key: "page_view" | "community" | "notifications" | "actions" | "PDF" | "IA" | "Codex";
  label: string;
  kg: number;
  sharePercent: number;
};

type RawDriverRow = EnvironmentalImpactCurveDriverRow & { weight: number };
type TrafficSignals = NonNullable<
  NonNullable<EnvironmentalImpactProjectSignals["signalBreakdown"]>["traffic"]
>;
type CommunitySignals = NonNullable<
  NonNullable<EnvironmentalImpactProjectSignals["signalBreakdown"]>["community"]
>;
type CommunicationSignals = NonNullable<
  NonNullable<EnvironmentalImpactProjectSignals["signalBreakdown"]>["communication"]
>;

function buildRawDriverRow(
  key: RawDriverRow["key"],
  weight: number,
): RawDriverRow {
  return { key, label: key, kg: 0, sharePercent: 0, weight };
}

function buildScopeInput(
  scope: EnvironmentalImpactScopeEstimate,
  signals?: EnvironmentalImpactProjectSignals | null,
): EnvironmentalImpactScopeInput | undefined {
  return scope.key === "site" ? signals?.siteInput : signals?.userInput;
}

function buildPageViewWeight(
  traffic: TrafficSignals | undefined,
  scopeInput: EnvironmentalImpactScopeInput | undefined,
) {
  return (
    ((traffic?.pageViewEvents ?? 0) + (traffic?.legacyPageViewEvents ?? 0)) * 0.000015 +
    (scopeInput?.pageViews ?? 0) * 0.00001
  );
}

function buildCommunityWeight(
  community: CommunitySignals | undefined,
  scopeInput: EnvironmentalImpactScopeInput | undefined,
) {
  return (
    ((community?.events ?? 0) + (community?.rsvps ?? 0)) * 0.00002 +
    (scopeInput?.storageGbMonths ?? 0) * 0.000006
  );
}

function buildNotificationsWeight(
  community: CommunitySignals | undefined,
  scopeInput: EnvironmentalImpactScopeInput | undefined,
) {
  return (
    ((community?.notifications ?? 0) + (community?.unreadNotifications ?? 0)) * 0.000012 +
    (scopeInput?.apiRequests ?? 0) * 0.000003
  );
}

function buildActionsWeight(scopeInput: EnvironmentalImpactScopeInput | undefined) {
  return (scopeInput?.maps ?? 0) * 0.00002;
}

function buildPdfWeight(
  communication: CommunicationSignals | undefined,
  scopeInput: EnvironmentalImpactScopeInput | undefined,
) {
  return ((communication?.pdfExports ?? 0) + (scopeInput?.pdfExports ?? 0)) * 0.00003;
}

function buildIaWeight(scopeInput: EnvironmentalImpactScopeInput | undefined) {
  return (scopeInput?.aiCalls ?? 0) * 0.00005;
}

function buildCodexWeight(
  scope: EnvironmentalImpactScopeEstimate,
  signals?: EnvironmentalImpactProjectSignals | null,
) {
  const codexKg = scope.key === "user" ? signals?.codexUsage?.estimatedKgCo2eProxy ?? 0 : 0;
  return codexKg > 0 ? codexKg : 0;
}

function buildRawDriverRows(
  scope: EnvironmentalImpactScopeEstimate,
  signals?: EnvironmentalImpactProjectSignals | null,
): RawDriverRow[] {
  const traffic = signals?.signalBreakdown?.traffic;
  const community = signals?.signalBreakdown?.community;
  const communication = signals?.signalBreakdown?.communication;
  const scopeInput = buildScopeInput(scope, signals);

  return [
    buildRawDriverRow("page_view", buildPageViewWeight(traffic, scopeInput)),
    buildRawDriverRow("community", buildCommunityWeight(community, scopeInput)),
    buildRawDriverRow("notifications", buildNotificationsWeight(community, scopeInput)),
    buildRawDriverRow("actions", buildActionsWeight(scopeInput)),
    buildRawDriverRow("PDF", buildPdfWeight(communication, scopeInput)),
    buildRawDriverRow("IA", buildIaWeight(scopeInput)),
    buildRawDriverRow("Codex", buildCodexWeight(scope, signals)),
  ];
}

export function buildDriverBreakdown(
  params: {
    pointTotal: number;
    scope: EnvironmentalImpactScopeEstimate;
    signals?: EnvironmentalImpactProjectSignals | null;
  },
): EnvironmentalImpactCurveDriverRow[] {
  const rawRows = buildRawDriverRows(params.scope, params.signals);
  const { pointTotal } = params;
  const totalWeight = rawRows.reduce((acc, row) => acc + row.weight, 0);

  if (pointTotal <= 0 || totalWeight <= 0) {
    return rawRows.map((row) => ({
      key: row.key,
      label: row.label,
      kg: 0,
      sharePercent: 0,
    }));
  }

  return rawRows.map((row) => {
    const sharePercent = (row.weight / totalWeight) * 100;
    return {
      key: row.key,
      label: row.label,
      kg: pointTotal * (row.weight / totalWeight),
      sharePercent,
    };
  });
}
