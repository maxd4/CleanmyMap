import type {
  ParisPressureUrbanMorphology,
  ParisPressureUrbanMorphologyFeature,
} from "./paris-pressure-contract";

export const URBAN_MORPHOLOGY_PRIOR_VERSION =
  "urban-morphology-prior-v1" as const;

export type UrbanMorphologyPriorStatus =
  | "applied"
  | "unavailable"
  | "low_confidence";

export type UrbanMorphologyPriorApplication = {
  version: typeof URBAN_MORPHOLOGY_PRIOR_VERSION;
  status: UrbanMorphologyPriorStatus;
  source: ParisPressureUrbanMorphology["source"] | null;
  geographicSource: ParisPressureUrbanMorphology["source"] | null;
  morphologyType: ParisPressureUrbanMorphologyFeature[];
  confidence: number;
  features: ParisPressureUrbanMorphology["features"] | null;
  components: {
    lowTrafficLocalStreet: number;
    deadEnd: number;
    parkInterior: number;
    residentialLowFlow: number;
  };
  baseMalusPoints: number;
  compensationPoints: number;
  appliedMalusPoints: number;
  beforeRisk: number;
  afterRisk: number;
  compensatingSignals: string[];
  explanation: string;
};
