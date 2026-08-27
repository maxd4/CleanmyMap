export const IMPACT_SCOPES = ["territorial", "consumption", "usage-only", "cycle-of-life"] as const;

export type ImpactScope = (typeof IMPACT_SCOPES)[number];

export const IMPACT_VALUE_SCOPES = [...IMPACT_SCOPES, "human-development"] as const;

export type ImpactValueScope = (typeof IMPACT_VALUE_SCOPES)[number];

export const IMPACT_UNCERTAINTIES = ["faible", "moyenne", "élevée", "très élevée"] as const;

export type ImpactUncertainty = (typeof IMPACT_UNCERTAINTIES)[number];

export type ImpactReferenceSource = {
  label: string;
  url: string;
  publicationYear: number;
  dataYear: number;
  note: string;
};

export type ImpactReferenceValue = {
  label: string;
  metric: string;
  value: number;
  unit: string;
  year: number;
  scope?: ImpactValueScope;
  note?: string;
};

export type ImpactReferenceMetadata = {
  referenceId: string;
  title: string;
  yearLabel: string;
  scopeLabel: string;
  orderOfMagnitude: string;
  range: string;
  uncertainty: ImpactUncertainty;
  sources: ImpactReferenceSource[];
  values: ImpactReferenceValue[];
  note?: string;
};
