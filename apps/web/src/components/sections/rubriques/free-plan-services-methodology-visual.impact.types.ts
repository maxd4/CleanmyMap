import type { LucideIcon } from "lucide-react";
import type { EnvironmentalImpactInfrastructureServiceEstimate } from "@/lib/environmental-impact-estimator/types";
import type {
  ImpactDetailBadge,
  ImpactDetailMetric,
  ImpactSelectionKey,
} from "./free-plan-services-methodology-visual.logic";

export type ImpactDetailSelection = {
  key: ImpactSelectionKey;
  title: string;
  subtitle: string;
  badgeLabels: ImpactDetailBadge[];
  contributionPercentLabel: string;
  contributionValueLabel: string;
  serviceRows: ImpactDetailMetric[];
};

export type ImpactTotals = {
  monthlyKgCo2eProxy: number | null;
  annualKgCo2eProxy: number | null;
  totalKgCo2eProxy: number | null;
  generatedAt: string | null;
};

export type ImpactSegment = {
  key: ImpactSelectionKey;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  color: string;
  sharePercent: number | null;
  monthlyKgCo2eProxy: number;
  kind: "production" | "development" | "other";
  services: EnvironmentalImpactInfrastructureServiceEstimate[];
};
