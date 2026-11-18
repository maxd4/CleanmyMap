export type {
  EnvironmentalImpactEstimateModel,
  EnvironmentalImpactCodexUsageMonthlyEstimate,
  EnvironmentalImpactCodexUsageSource,
  EnvironmentalImpactCodexUsageWeeklyInput,
  EnvironmentalImpactCodexUsageWeeklySnapshotRecord,
  EnvironmentalImpactInfrastructureMetricEstimate,
  EnvironmentalImpactInfrastructureMetricKey,
  EnvironmentalImpactInfrastructureServiceEstimate,
  EnvironmentalImpactProjectSignals,
  EnvironmentalImpactPublicSnapshotPoint,
  EnvironmentalImpactSnapshotRecord,
} from "./types";
export {
  computeEnvironmentalImpactEstimate,
} from "./services/core";
export { buildElectricityEstimate, calculateElectricityCo2e } from "./services/electricity";
export { buildWaterEstimate, calculateIndirectElectricityWater } from "./services/water";
export {
  buildCodexMonthlyUsageEstimate,
  buildCodexUsageWeeklySnapshot,
  getCodexUsageWeeklySnapshot,
  listCodexUsageWeeklySnapshots,
  upsertCodexUsageWeeklySnapshot,
} from "./codex-usage-store";
export {
  normalizeEnvironmentalImpactEstimateInput,
} from "./validation";
export {
  SCIENTIFIC_FACTOR_REGISTRY,
  ANTI_DOUBLE_COUNTING_RULES,
  getScientificFactor,
  listScientificFactors,
  assertNoGenericAiCallsToTokensConversion,
  resolveElectricityFactorForRegion,
  evaluateDataQualityDiagnostic,
} from "./scientific-registry";
export type {
  ScientificProofStatus,
  AccountingScopeType,
  ScientificFactorRegion,
  ScientificFactorScope,
  ScientificPhysicalUnit,
  MultimodalCategory,
  EnvironmentalDataQualityDiagnostic,
  ScientificFactorRecord,
} from "./scientific-registry";
export {
  estimatePersonalAiFootprint,
} from "./personal-ai-estimator";
export type {
  PersonalAiFootprintInput,
  PersonalAiFootprintEstimate,
  ModalityEstimate,
} from "./personal-ai-estimator";
export {
  AI_MODEL_CATALOG,
  STANDARD_HOSTERS,
  findAiModel,
  requireAiModel,
  listAiModels,
  resolveHosterForModel,
} from "./model-catalog";
export type {
  AiModelRecord,
  AiModelPublisher,
  WeightsAvailability,
  ExecutionEnvironment,
  ArchitectureType,
  AiModelArchitecture,
  AiModelHoster,
} from "./model-catalog";
export {
  ECOLOGITS_METADATA,
  ECOLOGITS_CONSTANTS,
  evaluateEcologitsMethodology,
  computeEcologitsCompatibleImpacts,
} from "./ecologits-adapter";
export type {
  EcologitsEvaluationReport,
  EcologitsComputationParams,
  EcologitsImpactsResult,
} from "./ecologits-adapter";
