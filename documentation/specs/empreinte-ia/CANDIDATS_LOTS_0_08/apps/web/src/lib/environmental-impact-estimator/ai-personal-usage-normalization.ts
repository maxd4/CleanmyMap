/** Lots 1-3: importable personal AI declaration contract, pure, no persistence. */
export const PERSONAL_AI_NORMALIZATION_VERSION = "personal-ai-usage-plan-v1";
export type PersonalAiSource = "manual" | "openai_usage" | "anthropic_analytics_2026" | "gemini_usage" | "codex_rollout" | "csv_mapped" | "pdf_invoice";
export type PersonalAiGranularity = "request" | "bucket" | "manual" | "invoice";
export type PersonalAiReasoningRelation = "included" | "additional" | "unknown";
/** Access preferences are descriptive metadata only; they never establish pricing or entitlements. */
export type PersonalAiAccessSelection = {
  billingMode: "API" | "SUBSCRIPTION" | "LOCAL_OWNED";
  codingPlatformId?: string | null;
  subscriptionPlanId?: string | null;
};
export type PersonalAiNormalizedTokens = {
  inputTotal: number | null;
  inputUncached: number | null;
  cacheRead: number | null;
  cacheWrite: number | null;
  outputVisible: number | null;
  outputReasoning: number | null;
  outputTotal: number | null;
  reasoningRelation: PersonalAiReasoningRelation;
  toolUseInput: number | null;
  logicalTotal: number | null;
};
export type PersonalAiUsageDraft = {
  source: PersonalAiSource;
  sourceVersion: string;
  granularity: PersonalAiGranularity;
  /** Pseudonymous source account scope only. Never persist raw credentials or conversation. */
  accountScope: string | null;
  periodStartUtc: string | null;
  periodEndUtc: string | null;
  modelRaw: string | null;
  modelCanonical: string | null;
  operator: string | null;
  execution: "cloud_api" | "local_device";
  inferenceRegion: string | null;
  requestCount: number | null;
  tokens: Omit<PersonalAiNormalizedTokens,"logicalTotal">;
  sourceReportedLogicalTotal?: number | null;
  cost?: {amount: number; currency: string} | null;
  /** Optional user declaration, for lot 21 comparison; no inferred quota or subscription credit. */
  access?: PersonalAiAccessSelection | null;
  /** A bucket may be partial when pagination or freshness is incomplete. */
  completeness?: "COMPLETE" | "PARTIAL" | "UNKNOWN";
  sourceRef?: string | null;
};
export type PersonalAiNormalizedUsage = Omit<PersonalAiUsageDraft,"tokens"|"sourceReportedLogicalTotal"> & {
  normalizationVersion: string;
  tokens: PersonalAiNormalizedTokens;
};
const SAFE_MAX = Number.MAX_SAFE_INTEGER;
function count(n:number|null, label:string) {
  if (n!==null && (!Number.isSafeInteger(n)||n<0)) throw new Error(`${label}: entier non négatif requis`);
}
function safeSum(vals: readonly number[], label: string) {
  const sum=vals.reduce((s,v)=>s+v,0);
  if (!Number.isSafeInteger(sum)||sum>SAFE_MAX) throw new Error(`${label}: dépassement d'entier sûr`);
  return sum;
}
function utc(date:string|null, label:string) {
  if (date===null) return null;
  if (date.length>40 || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(date)) throw new Error(`${label}: ISO UTC Z requis`);
  const parsed=Date.parse(date);
  if (!Number.isFinite(parsed)||new Date(parsed).toISOString().slice(0,19)!==date.slice(0,19)) throw new Error(`${label}: date invalide`);
  return parsed;
}
function textOrNull(input:string|null, label:string, max=160) {
  if (input!==null && (input.length>max || /[\u0000-\u001f]/.test(input))) throw new Error(`${label}: format ou longueur invalide`);
}
export function normalizePersonalAiUsage(draft:PersonalAiUsageDraft):PersonalAiNormalizedUsage {
  const t=draft.tokens;
  const fields: (keyof Omit<PersonalAiNormalizedTokens,"logicalTotal"|"reasoningRelation">)[]=["inputTotal","inputUncached","cacheRead","cacheWrite","outputVisible","outputReasoning","outputTotal","toolUseInput"];
  for (const field of fields) count(t[field],`tokens.${field}`);
  count(draft.requestCount,"requestCount");
  count(draft.sourceReportedLogicalTotal??null,"sourceReportedLogicalTotal");
  if (draft.requestCount===0 && ((t.inputTotal??0)>0 || (t.outputTotal??0)>0)) throw new Error("Requêtes nulles et consommation positive contradictoires");
  for(const [name,val] of [["sourceVersion",draft.sourceVersion],["accountScope",draft.accountScope],["modelRaw",draft.modelRaw],["modelCanonical",draft.modelCanonical],["operator",draft.operator],["inferenceRegion",draft.inferenceRegion],["sourceRef",draft.sourceRef??null]] as const)textOrNull(val,name);
  const start=utc(draft.periodStartUtc,"periodStartUtc"),end=utc(draft.periodEndUtc,"periodEndUtc");
  if ((start===null)!==(end===null)) throw new Error("Période partielle : bornes début/fin requises ensemble");
  if (start!==null && end!==null && start>=end) throw new Error("Période [début, fin[ invalide");
  if(draft.cost){if(!Number.isFinite(draft.cost.amount)||draft.cost.amount<0)throw new Error("Coût invalide");if(!/^[A-Z]{3}$/.test(draft.cost.currency))throw new Error("Devise ISO 4217 requise");}
  if (draft.access) {
    const access=draft.access;
    if (!(["API","SUBSCRIPTION","LOCAL_OWNED"] as string[]).includes(access.billingMode)) throw new Error("Mode d'accès IA inconnu");
    textOrNull(access.codingPlatformId??null,"codingPlatformId",80);
    textOrNull(access.subscriptionPlanId??null,"subscriptionPlanId",80);
    if (access.billingMode!=="SUBSCRIPTION" && (access.codingPlatformId || access.subscriptionPlanId)) {
      throw new Error("Plateforme et forfait renseignés hors mode abonnement");
    }
    if (access.billingMode==="LOCAL_OWNED" && draft.execution!=="local_device") {
      throw new Error("Équipement local possédé et cloud_api incompatibles");
    }
    if (access.billingMode!=="LOCAL_OWNED" && draft.execution==="local_device") {
      throw new Error("Déclaration locale incohérente avec la facturation API/abonnement cloud");
    }
  }
  let inputTotal=t.inputTotal;
  // The cache subcategories are disjoint parts of inputTotal, never added to it.
  if (t.inputUncached!==null && t.cacheRead!==null && t.cacheWrite!==null){
    const parts=safeSum([t.inputUncached,t.cacheRead,t.cacheWrite],"input categories");
    if(inputTotal!==null && inputTotal!==parts)throw new Error("Ventilation entrée incohérente");
    if(inputTotal===null)inputTotal=parts;
  }
  if (t.cacheRead!==null && inputTotal!==null && t.cacheRead>inputTotal)throw new Error("cacheRead > inputTotal");
  if (t.cacheWrite!==null && inputTotal!==null && t.cacheWrite>inputTotal)throw new Error("cacheWrite > inputTotal");
  if (t.cacheRead!==null && t.cacheWrite!==null && inputTotal!==null && t.cacheRead+t.cacheWrite>inputTotal)throw new Error("Caches > inputTotal");
  let outputTotal=t.outputTotal;
  if(t.reasoningRelation==="included"){
    if(outputTotal!==null && t.outputReasoning!==null && t.outputReasoning>outputTotal)throw new Error("Reasoning > outputTotal inclus");
    if(outputTotal!==null && t.outputVisible!==null && t.outputVisible>outputTotal)throw new Error("Visible > outputTotal inclus");
  }
  if(t.reasoningRelation==="additional" && t.outputVisible!==null && t.outputReasoning!==null){
    const reconstructed=safeSum([t.outputVisible,t.outputReasoning],"output categories");
    if(outputTotal!==null && outputTotal!==reconstructed)throw new Error("Sorties supplémentaires incohérentes");
    outputTotal=reconstructed;
  }
  const logicalTotal=inputTotal!==null && outputTotal!==null?safeSum([inputTotal,outputTotal],"logicalTotal"):null;
  if(draft.sourceReportedLogicalTotal!==undefined&&draft.sourceReportedLogicalTotal!==null && logicalTotal!==null && draft.sourceReportedLogicalTotal!==logicalTotal)throw new Error("Total fournisseur incohérent");
  if(draft.sourceReportedLogicalTotal!==undefined&&draft.sourceReportedLogicalTotal!==null && logicalTotal===null) {
    // Preserve supplier assertion separately by requiring a complete normalized decomposition for logical aggregation.
    throw new Error("Total fournisseur sans ventilation comparable");
  }
  return {...draft, normalizationVersion:PERSONAL_AI_NORMALIZATION_VERSION, tokens:{...t,inputTotal,outputTotal,logicalTotal}};
}
/** Count only fully bounded UTC periods that lie entirely in a single UTC calendar month. */
export function monthUtcIfContained(startUtc:string|null,endUtc:string|null):string|null {
  if(startUtc===null || endUtc===null)return null;
  const start=utc(startUtc,"periodStartUtc"),end=utc(endUtc,"periodEndUtc");
  if(start===null||end===null||start>=end)return null;
  const month=startUtc.slice(0,7);
  return new Date(end-1).toISOString().slice(0,7)===month?month:null;
}
