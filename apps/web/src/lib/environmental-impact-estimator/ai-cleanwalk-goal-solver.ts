import { getScientificFactor } from "./scientific-registry";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/progression/impact-proxy-config";

export type AiCollectionMaterial = "PLASTIC" | "ALUMINIUM" | "GLASS" | "STEEL" | "OTHER";
export type AiCollectionDestination = "RECYCLING" | "INCINERATION_WITH_RECOVERY" | "INCINERATION_NO_RECOVERY" | "LANDFILL" | "UNKNOWN";
export type AiWaterGoalMode = "RISQUE_CONVENTIONNEL" | "EAU_CONSOMMEE_ACV";
export type AiCollectionPositionStatus = "FEASIBLE_SCENARIO" | "INFEASIBLE" | "UNKNOWN" | "OVER_BUDGET";

export const COLLECTION_SCIENCE_VERSION = "BNR-2021-collection-comparison-plan-v1";
const WASTE_RATE_KG_PER_PERSON_HOUR = 9.9;
const BUTTS_RATE_PER_PERSON_HOUR = 380;
const plasticFactor = getScientificFactor("ademe-bnr-plastic-incorporation-2021");
const aluminiumFactor = getScientificFactor("ademe-bnr-aluminium-incorporation-2021");
const glassFactor = getScientificFactor("ademe-bnr-glass-incorporation-2021");
const providerButtFactor = getScientificFactor("tchaomegot-smet71-provider-carbon-claim-2023");
const materialFactors: Partial<Record<AiCollectionMaterial, number>> = {
  PLASTIC: plasticFactor.value!,
  ALUMINIUM: aluminiumFactor.value!,
  GLASS: glassFactor.value!,
};
const buttsCarbonFactor = providerButtFactor.value!;
const conventionalWaterFactor = IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt;

export type AiMaterialScenario = {
  material: AiCollectionMaterial;
  share: number;
  destination: AiCollectionDestination;
  recyclingFraction: number | null;
  incorporationYield: number | null;
  netWaterSavingsLitersPerKgMpr?: number | null;
};
export type AiButtScenario =
  | { mode: "NOT_RECYCLED" }
  | { mode: "RECYCLING_UNQUANTIFIED" }
  | { mode: "TCHAO_PROVIDER_SCENARIO"; acceptsCarbonComparabilityHypothesis: boolean; waterAcvSavingsLitersPerButt?: number | null };
export type AiCollectionGoalInput = {
  targetCarbonKgCo2e: number | null;
  targetWaterConsumedLiters: number | null;
  waterMode: AiWaterGoalMode;
  materials: readonly AiMaterialScenario[];
  butts: AiButtScenario;
  maxPersonHours?: number | null;
  preferredPercent: number;
};
export type AiMaterialProjection = {
  material: AiCollectionMaterial;
  collectedKg: number;
  potentiallyIncorporatedKg: number | null;
  recyclingBenefitKgCo2e: number | null;
  netWaterConsumedSavedLiters: number | null;
  treatmentEmissionsKgCo2e: null;
  netTreatmentClimateKgCo2e: null;
};
export type AiCollectionPosition = {
  percent: number;
  status: AiCollectionPositionStatus;
  requiredPersonHours: number | null;
  wasteKg: number | null;
  buttsCount: number | null;
  carbonRecyclingScenarioKgCo2e: number | null;
  waterConventionalRiskLiters: number | null;
  netAcvWaterConsumedSavedLiters: number | null;
  materialBreakdown: readonly AiMaterialProjection[];
  reasons: readonly string[];
};
export type AiCollectionProjection = {
  scienceVersion: string;
  factorVersions: readonly string[];
  positions: readonly AiCollectionPosition[];
  eligiblePercents: readonly number[];
  selected: AiCollectionPosition;
  overallStatus: AiCollectionPositionStatus | "NO_FEASIBLE_POSITION";
  caveats: readonly string[];
};

function assertInput(input: AiCollectionGoalInput): void {
  for (const [label, value] of [["targetCarbonKgCo2e", input.targetCarbonKgCo2e], ["targetWaterConsumedLiters", input.targetWaterConsumedLiters], ["maxPersonHours", input.maxPersonHours ?? null]] as const) {
    if (value !== null && (!Number.isFinite(value) || value < 0)) throw new Error(`${label}: nombre fini positif ou zéro requis`);
  }
  if (!Number.isInteger(input.preferredPercent) || input.preferredPercent < 0 || input.preferredPercent > 100) throw new Error("preferredPercent: entier 0..100 requis");
  if (input.materials.length === 0) throw new Error("Mix matériau non déclaré");
  const seen = new Set<AiCollectionMaterial>();
  let totalShare = 0;
  for (const row of input.materials) {
    if (seen.has(row.material)) throw new Error("Doublon de catégorie matériau");
    seen.add(row.material);
    for (const [label, value] of [["share", row.share], ["recyclingFraction", row.recyclingFraction], ["incorporationYield", row.incorporationYield]] as const) {
      if (value !== null && (!Number.isFinite(value) || value < 0 || value > 1)) throw new Error(`${label}: fraction dans [0,1] requise`);
    }
    if (row.netWaterSavingsLitersPerKgMpr != null && !Number.isFinite(row.netWaterSavingsLitersPerKgMpr)) throw new Error("Facteur net d'eau non fini");
    if (row.destination !== "RECYCLING" && (row.recyclingFraction ?? 0) > 0) throw new Error("Bénéfice recyclage interdit hors voie RECYCLING");
    totalShare += row.share;
  }
  if (Math.abs(totalShare - 1) > 1e-9) throw new Error("Les fractions de matériau doivent totaliser 1");
  if (input.butts.mode === "TCHAO_PROVIDER_SCENARIO" && input.butts.waterAcvSavingsLitersPerButt != null && !Number.isFinite(input.butts.waterAcvSavingsLitersPerButt)) throw new Error("Facteur net d'eau mégots invalide");
}

function materialFactor(row: AiMaterialScenario, kind: "carbon" | "water"): number | null {
  if (row.destination === "UNKNOWN") return null;
  if (row.destination !== "RECYCLING") return 0;
  if (row.recyclingFraction === null || row.incorporationYield === null) return null;
  if (row.recyclingFraction === 0 || row.incorporationYield === 0) return 0;
  const raw = kind === "carbon" ? materialFactors[row.material] ?? null : row.netWaterSavingsLitersPerKgMpr ?? null;
  return raw === null ? null : row.recyclingFraction * row.incorporationYield * raw;
}

function buttFactor(input: AiButtScenario, kind: "carbon" | "water"): number | null {
  if (input.mode === "NOT_RECYCLED") return 0;
  if (input.mode === "RECYCLING_UNQUANTIFIED") return null;
  if (kind === "water") return input.waterAcvSavingsLitersPerButt ?? null;
  return input.acceptsCarbonComparabilityHypothesis ? buttsCarbonFactor : null;
}

function weightedWasteFactor(rows: readonly AiMaterialScenario[], kind: "carbon" | "water"): number | null {
  let total = 0;
  for (const row of rows) {
    if (row.share === 0) continue;
    const factor = materialFactor(row, kind);
    if (factor === null) return null;
    total += row.share * factor;
  }
  return total;
}

function buildMaterialProjection(rows: readonly AiMaterialScenario[], wasteKg: number): AiMaterialProjection[] {
  return rows.map((row) => {
    const collectedKg = wasteKg * row.share;
    const incorporated = row.destination === "UNKNOWN" || (row.destination === "RECYCLING" && (row.recyclingFraction === null || row.incorporationYield === null))
      ? null
      : row.destination === "RECYCLING" ? collectedKg * row.recyclingFraction! * row.incorporationYield! : 0;
    const carbonFactor = materialFactor(row, "carbon");
    const waterFactor = materialFactor(row, "water");
    return {
      material: row.material,
      collectedKg,
      potentiallyIncorporatedKg: collectedKg === 0 ? 0 : incorporated,
      recyclingBenefitKgCo2e: collectedKg === 0 ? 0 : carbonFactor === null ? null : collectedKg * carbonFactor,
      netWaterConsumedSavedLiters: collectedKg === 0 ? 0 : waterFactor === null ? null : collectedKg * waterFactor,
      treatmentEmissionsKgCo2e: null,
      netTreatmentClimateKgCo2e: null,
    };
  });
}

function emptyPosition(percent: number, status: AiCollectionPositionStatus, reason: string): AiCollectionPosition {
  return { percent, status, requiredPersonHours: null, wasteKg: null, buttsCount: null, carbonRecyclingScenarioKgCo2e: null, waterConventionalRiskLiters: null, netAcvWaterConsumedSavedLiters: null, materialBreakdown: [], reasons: [reason] };
}

function calculatePosition(input: AiCollectionGoalInput, percent: number): AiCollectionPosition {
  const buttShare = percent / 100;
  const wasteShare = 1 - buttShare;
  const wasteCarbon = wasteShare === 0 ? 0 : weightedWasteFactor(input.materials, "carbon");
  const buttCarbon = buttShare === 0 ? 0 : buttFactor(input.butts, "carbon");
  const carbonRate = wasteCarbon === null || buttCarbon === null ? null : WASTE_RATE_KG_PER_PERSON_HOUR * wasteShare * wasteCarbon + BUTTS_RATE_PER_PERSON_HOUR * buttShare * buttCarbon;
  const wasteWater = input.waterMode === "RISQUE_CONVENTIONNEL" || wasteShare === 0 ? 0 : weightedWasteFactor(input.materials, "water");
  const buttWater = input.waterMode === "RISQUE_CONVENTIONNEL" ? conventionalWaterFactor : buttShare === 0 ? 0 : buttFactor(input.butts, "water");
  const waterRate = wasteWater === null || buttWater === null ? null : WASTE_RATE_KG_PER_PERSON_HOUR * wasteShare * wasteWater + BUTTS_RATE_PER_PERSON_HOUR * buttShare * buttWater;
  const targets = [input.targetCarbonKgCo2e, input.targetWaterConsumedLiters] as const;
  const rates = [carbonRate, waterRate] as const;
  if (targets.some((target, index) => target !== null && target > 0 && rates[index] !== null && rates[index]! <= 0)) return emptyPosition(percent, "INFEASIBLE", "Un objectif positif est impossible avec le mécanisme sélectionné.");
  if (targets.some((target, index) => target === null || (target > 0 && rates[index] === null))) return emptyPosition(percent, "UNKNOWN", "Une cible ou un facteur requis est inconnu; l'atteinte des deux seuils n'est pas démontrable.");
  const carbonHours = targets[0] === 0 ? 0 : targets[0]! / carbonRate!;
  const waterHours = targets[1] === 0 ? 0 : targets[1]! / waterRate!;
  const hours = Math.max(carbonHours, waterHours);
  if (!Number.isFinite(hours) || hours < 0 || !Number.isSafeInteger(Math.ceil(hours * BUTTS_RATE_PER_PERSON_HOUR * buttShare))) return emptyPosition(percent, "UNKNOWN", "Effort ou nombre de mégots hors limites numériques.");
  const status = input.maxPersonHours != null && hours > input.maxPersonHours + 1e-12 ? "OVER_BUDGET" : "FEASIBLE_SCENARIO";
  const wasteKg = hours * WASTE_RATE_KG_PER_PERSON_HOUR * wasteShare;
  const buttsCount = Math.ceil(hours * BUTTS_RATE_PER_PERSON_HOUR * buttShare - 1e-12);
  const materialBreakdown = buildMaterialProjection(input.materials, wasteKg);
  const carbonParts = materialBreakdown.map((row) => row.recyclingBenefitKgCo2e);
  const buttCarbonForCount = buttsCount === 0 ? 0 : buttFactor(input.butts, "carbon");
  const waterParts = materialBreakdown.map((row) => row.netWaterConsumedSavedLiters);
  const buttWaterForCount = buttsCount === 0 ? 0 : buttFactor(input.butts, "water");
  const carbon = carbonParts.some((value) => value === null) || buttCarbonForCount === null ? null : carbonParts.reduce<number>((sum, value) => sum + (value ?? 0), 0) + buttsCount * buttCarbonForCount;
  const acvWater = waterParts.some((value) => value === null) || buttWaterForCount === null ? null : waterParts.reduce<number>((sum, value) => sum + (value ?? 0), 0) + buttsCount * buttWaterForCount;
  return {
    percent,
    status,
    requiredPersonHours: hours,
    wasteKg,
    buttsCount,
    carbonRecyclingScenarioKgCo2e: carbon,
    waterConventionalRiskLiters: buttsCount * conventionalWaterFactor,
    netAcvWaterConsumedSavedLiters: acvWater,
    materialBreakdown,
    reasons: status === "OVER_BUDGET" ? ["Plafond de temps volontaire dépassé."] : [],
  };
}

export function solveAiCleanwalkGoals(input: AiCollectionGoalInput): AiCollectionProjection {
  assertInput(input);
  const positions = Array.from({ length: 101 }, (_, percent) => calculatePosition(input, percent));
  const eligiblePercents = positions.filter((position) => position.status === "FEASIBLE_SCENARIO").map((position) => position.percent);
  const selected = positions[input.preferredPercent];
  return {
    scienceVersion: COLLECTION_SCIENCE_VERSION,
    factorVersions: [
      `${plasticFactor.id}@${plasticFactor.version}`,
      `${aluminiumFactor.id}@${aluminiumFactor.version}`,
      `${glassFactor.id}@${glassFactor.version}`,
      `${providerButtFactor.id}@${providerButtFactor.version}`,
      IMPACT_PROXY_CONFIG.effectiveVersion,
    ],
    positions,
    eligiblePercents,
    selected,
    overallStatus: eligiblePercents.length === 0 ? "NO_FEASIBLE_POSITION" : selected.status,
    caveats: [
      "Les seuils sont des analogies conditionnelles et ne représentent pas une compensation physique.",
      "Le proxy 500 L/mégot décrit un risque de pollution potentielle, pas une économie d'eau consommée.",
      "Une destination et un rendement de recyclage déclarés ne prouvent pas une incorporation effective.",
      "Les émissions de traitement par incinération ou stockage restent inconnues, même si le bénéfice de recyclage est nul.",
    ],
  };
}
