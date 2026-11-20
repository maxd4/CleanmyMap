/**
 * Lots 0+08: pure, deterministic dual-threshold educational collection scenario.
 * Neither recycling credit nor the 500 L/butt proxy represents verified compensation.
 * No persistence, gamification, AuthN, or project snapshot dependency.
 */
export type AiCollectionMaterial = "PLASTIC" | "ALUMINIUM" | "GLASS" | "STEEL" | "OTHER";
export type AiCollectionDestination = "RECYCLING" | "INCINERATION_WITH_RECOVERY" | "INCINERATION_NO_RECOVERY" | "LANDFILL" | "UNKNOWN";
export type AiWaterGoalMode = "RISQUE_CONVENTIONNEL" | "EAU_CONSOMMEE_ACV";
export type AiCollectionPositionStatus = "FEASIBLE_SCENARIO" | "INFEASIBLE" | "UNKNOWN" | "OVER_BUDGET";

export const COLLECTION_SCIENCE_VERSION = "BNR-2021-collection-comparison-plan-v1";
export const COLLECTION_RATES = { wasteKgPerPersonHour: 9.9, buttsPerPersonHour: 380, conventionalRiskLitersPerButt: 500 } as const;
/** kgCO2e per kg of *actually incorporated* secondary raw material, not kg collected. */
export const ADEME_BNR_2021_INCORPORATION: Readonly<Partial<Record<AiCollectionMaterial, number>>> = Object.freeze({
  PLASTIC: 2.702,
  ALUMINIUM: 6.407,
  GLASS: 1.948,
});
export const RECYCLING_SOURCE_URLS = {
  PLASTIC: "https://economie-circulaire.ademe.fr/bnr/plastiques",
  ALUMINIUM: "https://economie-circulaire.ademe.fr/bnr/aluminium",
  GLASS: "https://economie-circulaire.ademe.fr/bnr/verre",
} as const;
export const TCHAOMEGOT_SMET71_PROVIDER_CLAIM = {
  valueKgCo2ClaimedPerButt: 63/18_000,
  sourceUrl: "https://www.smet71.fr/media/Documents/RA_2023.pdf",
  proof: "PROVIDER_CLAIM_NOT_INDEPENDENTLY_VERIFIED",
} as const;

export type AiMaterialScenario = {
  material: AiCollectionMaterial;
  /** Mass share among waste excluding butts; all lines must sum to 1. */
  share: number;
  destination: AiCollectionDestination;
  /** Fraction of collected material sent toward recycling, 0..1, only for RECYCLING. */
  recyclingFraction: number | null;
  /** Material recycling-to-incorporation yield 0..1, only for RECYCLING. */
  incorporationYield: number | null;
  /** Signed net L consumed avoided per kg incorporated, only if scientifically compatible. */
  netWaterSavingsLitersPerKgMpr?: number | null;
};
export type AiButtScenario =
  | { mode: "NOT_RECYCLED" }
  | { mode: "RECYCLING_UNQUANTIFIED" }
  | { mode: "TCHAO_PROVIDER_SCENARIO"; acceptsCarbonComparabilityHypothesis: boolean; waterAcvSavingsLitersPerButt?: number | null };
export type AiCollectionGoalInput = {
  targetCarbonKgCo2e: number | null;
  /** IA water consumption metric, never the volume potentially contaminated by butts. */
  targetWaterConsumedLiters: number | null;
  waterMode: AiWaterGoalMode;
  materials: readonly AiMaterialScenario[];
  butts: AiButtScenario;
  /** Optional user-selected explicit effort budget, no implicit cap. */
  maxPersonHours?: number | null;
  /** Stable 0..100 integer preference: 0 = waste only, 100 = butts only. */
  preferredPercent: number;
};
export type AiMaterialProjection = {
  material: AiCollectionMaterial;
  collectedKg: number;
  /** Only scenario incorporation; not a confirmed recycling record. */
  potentiallyIncorporatedKg: number | null;
  recyclingBenefitKgCo2e: number | null;
  netWaterConsumedSavedLiters: number | null;
  /** Unknown for non-recycling destinations unless a separate scoped LCA is supplied. */
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
  positions: readonly AiCollectionPosition[];
  eligiblePercents: readonly number[];
  selected: AiCollectionPosition;
  overallStatus: AiCollectionPositionStatus | "NO_FEASIBLE_POSITION";
  caveats: readonly string[];
};
function checkNonnegative(n: number | null, label: string) {
  if (n !== null && (!Number.isFinite(n) || n < 0)) throw new Error(`${label}: nombre fini positif ou zéro requis`);
}
function checkFraction(n: number | null, label: string) {
  if (n !== null && (!Number.isFinite(n) || n < 0 || n > 1)) throw new Error(`${label}: fraction dans [0,1] requise`);
}
function assertScenario(input: AiCollectionGoalInput) {
  checkNonnegative(input.targetCarbonKgCo2e,"targetCarbonKgCo2e");
  checkNonnegative(input.targetWaterConsumedLiters,"targetWaterConsumedLiters");
  checkNonnegative(input.maxPersonHours ?? null,"maxPersonHours");
  if (!Number.isInteger(input.preferredPercent) || input.preferredPercent<0 || input.preferredPercent>100) throw new Error("preferredPercent: entier 0..100 requis");
  if (!Array.isArray(input.materials) || input.materials.length < 1) throw new Error("Mix matériau non déclaré");
  let sum = 0;
  const seen = new Set<AiCollectionMaterial>();
  for (const row of input.materials) {
    if (seen.has(row.material)) throw new Error("Doublon de catégorie matériau");
    seen.add(row.material);
    checkFraction(row.share,"share");
    checkFraction(row.recyclingFraction,"recyclingFraction");
    checkFraction(row.incorporationYield,"incorporationYield");
    if (row.netWaterSavingsLitersPerKgMpr !== undefined && row.netWaterSavingsLitersPerKgMpr !== null && !Number.isFinite(row.netWaterSavingsLitersPerKgMpr)) throw new Error("Économie d'eau nette non finie");
    if (row.destination !== "RECYCLING" && (row.recyclingFraction ?? 0)>0) throw new Error("Bénéfice recyclage interdit hors voie RECYCLING");
    sum+=row.share;
  }
  if (Math.abs(sum-1)>1e-9) throw new Error("Les fractions de matériau doivent totaliser 1");
  if (input.butts.mode === "TCHAO_PROVIDER_SCENARIO") {
    const w = input.butts.waterAcvSavingsLitersPerButt;
    if (w !== undefined && w !== null && !Number.isFinite(w)) throw new Error("Facteur net d'eau mégots invalide");
  }
}
function wasteMaterialFactor(row: AiMaterialScenario, kind: "CARBON"|"WATER"): number | null {
  if (row.destination === "UNKNOWN") return null;
  if (row.destination !== "RECYCLING") return 0; // zero recycling mechanism, not zero treatment emissions
  if (row.recyclingFraction === null || row.incorporationYield === null) return null;
  if (row.recyclingFraction === 0 || row.incorporationYield === 0) return 0;
  const factor = kind === "CARBON" ? (ADEME_BNR_2021_INCORPORATION[row.material] ?? null) : (row.netWaterSavingsLitersPerKgMpr ?? null);
  return factor===null?null:row.recyclingFraction*row.incorporationYield*factor;
}
function buttFactor(butts: AiButtScenario, kind:"CARBON"|"WATER"): number | null {
  if (butts.mode==="NOT_RECYCLED") return 0;
  if (butts.mode==="RECYCLING_UNQUANTIFIED") return null;
  if (kind==="WATER") return butts.waterAcvSavingsLitersPerButt ?? null;
  return butts.acceptsCarbonComparabilityHypothesis ? TCHAOMEGOT_SMET71_PROVIDER_CLAIM.valueKgCo2ClaimedPerButt : null;
}
function weightedFactor(materials: readonly AiMaterialScenario[], kind:"CARBON"|"WATER", wasteShare:number):number|null {
  if (wasteShare===0) return 0;
  let sum=0;
  for (const line of materials) {
    if (line.share===0) continue;
    const f=wasteMaterialFactor(line,kind);
    if (f===null) return null;
    sum+=line.share*f;
  }
  return sum;
}
function materialProjection(input:AiCollectionGoalInput, massKg:number):AiMaterialProjection[] {
  return input.materials.map(row=>{
    const collectedKg=massKg*row.share;
    const incorporationKnown = row.destination === "RECYCLING" && row.recyclingFraction !== null && row.incorporationYield !== null;
    const incorporated = collectedKg===0?0:incorporationKnown?collectedKg*(row.recyclingFraction as number)*(row.incorporationYield as number):row.destination==="UNKNOWN"?null:0;
    const cf=wasteMaterialFactor(row,"CARBON");
    const wf=wasteMaterialFactor(row,"WATER");
    return {material:row.material,collectedKg,potentiallyIncorporatedKg:incorporated,recyclingBenefitKgCo2e:collectedKg===0?0:cf===null?null:collectedKg*cf,netWaterConsumedSavedLiters:collectedKg===0?0:wf===null?null:collectedKg*wf,treatmentEmissionsKgCo2e:null,netTreatmentClimateKgCo2e:null};
  });
}
function computePosition(input: AiCollectionGoalInput, percent:number):AiCollectionPosition {
  const p=percent/100, wasteShare=1-p, buttShare=p;
  const fmC=weightedFactor(input.materials,"CARBON",wasteShare);
  const fbC=buttShare===0?0:buttFactor(input.butts,"CARBON");
  const kC=fmC===null||fbC===null?null:COLLECTION_RATES.wasteKgPerPersonHour*wasteShare*fmC+COLLECTION_RATES.buttsPerPersonHour*buttShare*fbC;
  const fmW= input.waterMode==="RISQUE_CONVENTIONNEL"?0:weightedFactor(input.materials,"WATER",wasteShare);
  const fbW=input.waterMode==="RISQUE_CONVENTIONNEL"?COLLECTION_RATES.conventionalRiskLitersPerButt:(buttShare===0?0:buttFactor(input.butts,"WATER"));
  const kW=fmW===null||fbW===null?null:COLLECTION_RATES.wasteKgPerPersonHour*wasteShare*fmW+COLLECTION_RATES.buttsPerPersonHour*buttShare*fbW;
  const targets:[number|null,number|null]=[input.targetCarbonKgCo2e,input.targetWaterConsumedLiters];
  const coefficients=[kC,kW];
  const reasons:string[]=[];
  // A definitely non-positive coefficient for a positive target proves impossibility.
  if (targets.some((t,i)=>t!==null&&t>0&&coefficients[i]!==null&&(coefficients[i] as number)<=0)) {
    reasons.push("Un seuil positif est impossible avec le mécanisme sélectionné");
    return {percent,status:"INFEASIBLE",requiredPersonHours:null,wasteKg:null,buttsCount:null,carbonRecyclingScenarioKgCo2e:null,waterConventionalRiskLiters:null,netAcvWaterConsumedSavedLiters:null,materialBreakdown:[],reasons};
  }
  if (targets.some((t,i)=>t===null||(t>0&&coefficients[i]===null))) {
    reasons.push("Cible ou facteur requis inconnu : aucune double atteinte démontrable");
    return {percent,status:"UNKNOWN",requiredPersonHours:null,wasteKg:null,buttsCount:null,carbonRecyclingScenarioKgCo2e:null,waterConventionalRiskLiters:null,netAcvWaterConsumedSavedLiters:null,materialBreakdown:[],reasons};
  }
  const hc=targets[0]===0?0:(targets[0] as number)/(kC as number);
  const hw=targets[1]===0?0:(targets[1] as number)/(kW as number);
  const h=Math.max(hc,hw);
  if (!Number.isFinite(h) || h<0 || !Number.isSafeInteger(Math.ceil(h*COLLECTION_RATES.buttsPerPersonHour*buttShare))) {
    reasons.push("Effort ou nombre de mégots hors limites numériques");
    return {percent,status:"UNKNOWN",requiredPersonHours:null,wasteKg:null,buttsCount:null,carbonRecyclingScenarioKgCo2e:null,waterConventionalRiskLiters:null,netAcvWaterConsumedSavedLiters:null,materialBreakdown:[],reasons};
  }
  const max = input.maxPersonHours ?? null;
  const status:AiCollectionPositionStatus=max!==null && h>max+1e-12?"OVER_BUDGET":"FEASIBLE_SCENARIO";
  if (status==="OVER_BUDGET") reasons.push("Plafond de temps volontaire dépassé");
  const m=h*COLLECTION_RATES.wasteKgPerPersonHour*wasteShare;
  const n=Math.ceil(h*COLLECTION_RATES.buttsPerPersonHour*buttShare-1e-12);
  const breakdown=materialProjection(input,m);
  const buttCarbon=n===0?0:buttFactor(input.butts,"CARBON");
  const cParts=breakdown.map(r=>r.recyclingBenefitKgCo2e);
  const carbon=cParts.some(x=>x===null)||buttCarbon===null?null:cParts.reduce<number>((s,v)=>s+(v??0),0)+n*buttCarbon;
  const netWaterFactor=n===0?0:buttFactor(input.butts,"WATER");
  const waterParts=breakdown.map(r=>r.netWaterConsumedSavedLiters);
  const waterAcv=waterParts.some(x=>x===null)||netWaterFactor===null?null:waterParts.reduce<number>((s,v)=>s+(v??0),0)+n*netWaterFactor;
  return {percent,status,requiredPersonHours:h,wasteKg:m,buttsCount:n,carbonRecyclingScenarioKgCo2e:carbon,waterConventionalRiskLiters:n*COLLECTION_RATES.conventionalRiskLitersPerButt,netAcvWaterConsumedSavedLiters:waterAcv,materialBreakdown:breakdown,reasons};
}
export function solveAiCleanwalkGoals(input: AiCollectionGoalInput):AiCollectionProjection {
  assertScenario(input);
  const positions=Array.from({length:101},(_,i)=>computePosition(input,i));
  const eligiblePercents=positions.filter(p=>p.status==="FEASIBLE_SCENARIO").map(p=>p.percent);
  const selected=positions[input.preferredPercent];
  return {scienceVersion:COLLECTION_SCIENCE_VERSION,positions,eligiblePercents,selected,overallStatus:eligiblePercents.length===0?"NO_FEASIBLE_POSITION":selected.status,caveats:[
    "Les deux seuils sont des analogies conditionnelles et non une compensation physique.",
    "Le proxy 500 L/mégot est un volume potentiellement contaminé, pas une économie d'eau consommée.",
    "Une destination de recyclage et un rendement déclarés ne prouvent pas une incorporation effective.",
    "Les émissions et coûts du traitement incinération/stockage restent NA, même si le bénéfice de recyclage y vaut 0.",
  ]};
}
