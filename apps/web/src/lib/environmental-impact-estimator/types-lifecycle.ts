export type EnvironmentalImpactLifecycleAxisKey =
  | "energy"
  | "carbon"
  | "water"
  | "materials"
  | "ewaste";

export type EnvironmentalImpactLifecycleComponentKey =
  | "servers"
  | "gpus"
  | "userDevices"
  | "networks"
  | "storage"
  | "maintenance"
  | "renewal"
  | "endOfLife";

export type EnvironmentalImpactLifecycleAxisDefinition = {
  key: EnvironmentalImpactLifecycleAxisKey;
  label: string;
  unitLabel: string;
  proxyKgCo2ePerUnit: number;
  referenceWeight: number;
  rationale: string;
};

export type EnvironmentalImpactLifecycleComponentDefinition = {
  key: EnvironmentalImpactLifecycleComponentKey;
  label: string;
  description: string;
  unitLabel: string;
  proxyKgCo2ePerUnit: number;
  referenceWeight: number;
  rationale: string;
};

export type EnvironmentalImpactLifecycleAxisEstimate =
  EnvironmentalImpactLifecycleAxisDefinition & {
    quantity: number | null;
    estimatedKgCo2eProxy: number | null;
    sharePercent: number;
    source: "input" | "derived" | "reference" | "mixed";
  };

export type EnvironmentalImpactLifecycleComponentEstimate =
  EnvironmentalImpactLifecycleComponentDefinition & {
    quantity: number | null;
    estimatedKgCo2eProxy: number | null;
    sharePercent: number;
    source: "input" | "derived" | "reference" | "mixed";
  };

export type EnvironmentalImpactLifecycleEstimate = {
  totalKgCo2eProxy: number | null;
  axisEstimates: EnvironmentalImpactLifecycleAxisEstimate[];
  componentEstimates: EnvironmentalImpactLifecycleComponentEstimate[];
  notes: string[];
  hypotheses: string[];
  source: "inferred" | "mixed" | "reference";
};
