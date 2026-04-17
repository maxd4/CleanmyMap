import type { ActionEntityType } from "../actions/data-contract";
import type { PilotageComparisonResult } from "./metrics";
import type { OperationalPriority, ZoneComparisonRow } from "./prioritization";

export type MethodDefinition = {
  id: string;
  kpi: string;
  formula: string;
  source: string;
  recalc: string;
  limits: string;
};

export type DecisionSummaryKpi = {
  id: "impact" | "mobilization" | "quality";
  label: string;
  value: string;
  previousValue: string;
  deltaAbsolute: string;
  deltaPercent: string;
  interpretation: "positive" | "negative" | "neutral";
};

export type DecisionSummary = {
  kpis: [DecisionSummaryKpi, DecisionSummaryKpi, DecisionSummaryKpi];
  alert: {
    severity: "critical" | "high" | "medium" | "low";
    title: string;
    detail: string;
  };
  recommendedAction: {
    href: string;
    label: string;
    reason: string;
  };
};

export type PilotageOverview = {
  generatedAt: string;
  periodDays: number;
  comparison: PilotageComparisonResult;
  comparisonsByWindow: Record<"30" | "90" | "365", PilotageComparisonResult>;
  priorities: OperationalPriority[];
  methods: MethodDefinition[];
  zones: ZoneComparisonRow[];
  summary: DecisionSummary;
};

export type LoadPilotageOverviewParams = {
  periodDays: number;
  limit?: number;
  types?: ActionEntityType[] | null;
};
