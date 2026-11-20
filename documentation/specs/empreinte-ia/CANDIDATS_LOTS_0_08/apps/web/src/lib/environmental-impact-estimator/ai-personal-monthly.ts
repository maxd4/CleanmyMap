/**
 * Lot 3: UTC aggregation with conservative overlap handling; no total inferred
 * from incomplete or cross-month data. Owner-scope RLS remains a separate
 * server/SQL responsibility and must not be simulated by this pure utility.
 */
import { type PersonalAiNormalizedUsage, monthUtcIfContained } from "./ai-personal-usage-normalization";
export type PersonalAiMonthlyEntry = { id:string; usage:PersonalAiNormalizedUsage; state:"ACTIVE"|"EXCLUDED"; conflictChoice?:"PREFER_THIS"|"EXCLUDE_THIS" };
export type PersonalAiMonthlySummary = {
  monthUtc:string;
  lowerBoundKnownLogicalTokens:number;
  completeLogicalTokens:number|null;
  knownInputTokens:number;
  knownOutputTokens:number;
  costByCurrency:Readonly<Record<string,number>>;
  includedIds:readonly string[];
  excludedIds:readonly string[];
  conflictIds:readonly string[];
  unknownCoverageIds:readonly string[];
  completeness:"COMPLETE"|"PARTIAL";
};
function sameDomain(a:PersonalAiNormalizedUsage,b:PersonalAiNormalizedUsage):boolean {
  // Different source accounts are not assumed disjoint without owner-confirmed scope mapping.
  return a.source===b.source || (a.modelCanonical??a.modelRaw)===(b.modelCanonical??b.modelRaw);
}
function overlaps(a:PersonalAiNormalizedUsage,b:PersonalAiNormalizedUsage):boolean {
  return a.periodStartUtc!==null&&a.periodEndUtc!==null&&b.periodStartUtc!==null&&b.periodEndUtc!==null&&
    a.periodStartUtc<b.periodEndUtc&&b.periodStartUtc<a.periodEndUtc;
}
export function summarizePersonalAiMonth(entries:readonly PersonalAiMonthlyEntry[],monthUtc:string):PersonalAiMonthlySummary {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthUtc))throw new Error("Mois UTC YYYY-MM requis");
  const chosen=entries.filter(e=>e.state==="ACTIVE"&&e.conflictChoice!=="EXCLUDE_THIS"&&e.usage.periodStartUtc?.slice(0,7)===monthUtc);
  const conflict=new Set<string>();
  for(let i=0;i<chosen.length;i++)for(let j=i+1;j<chosen.length;j++){
    const a=chosen[i],b=chosen[j];
    if(overlaps(a.usage,b.usage)&&sameDomain(a.usage,b.usage)){
      if(a.conflictChoice==="PREFER_THIS"&&b.conflictChoice!=="PREFER_THIS")conflict.add(b.id);
      else if(b.conflictChoice==="PREFER_THIS"&&a.conflictChoice!=="PREFER_THIS")conflict.add(a.id);
      else {conflict.add(a.id);conflict.add(b.id);}
    }
  }
  let knownInput=0,knownOutput=0,lower=0;
  const costByCurrency:Record<string,number>={},included:string[]=[],unknown:string[]=[],excluded=entries.filter(e=>e.state==="EXCLUDED"||e.conflictChoice==="EXCLUDE_THIS").map(e=>e.id);
  for(const e of chosen){
    const u=e.usage;
    if(conflict.has(e.id)){unknown.push(e.id);continue;}
    if(monthUtcIfContained(u.periodStartUtc,u.periodEndUtc)!==monthUtc || u.completeness!=="COMPLETE" || u.tokens.logicalTotal===null){unknown.push(e.id);continue;}
    included.push(e.id);
    knownInput+=u.tokens.inputTotal??0;knownOutput+=u.tokens.outputTotal??0;lower+=u.tokens.logicalTotal;
    if(![knownInput,knownOutput,lower].every(Number.isSafeInteger))throw new Error("Mois : total tokens hors entier sûr");
    if(u.cost){costByCurrency[u.cost.currency]=(costByCurrency[u.cost.currency]??0)+u.cost.amount;}
  }
  return {monthUtc,lowerBoundKnownLogicalTokens:lower,completeLogicalTokens:unknown.length>0?null:lower,knownInputTokens:knownInput,knownOutputTokens:knownOutput,costByCurrency,includedIds:included,excludedIds:excluded,conflictIds:[...conflict],unknownCoverageIds:unknown,completeness:unknown.length>0?"PARTIAL":"COMPLETE"};
}
export type PersonalAiBudgetStatus = {budgetTokens:number|null;knownUsageTokens:number;consumptionCoverage:"COMPLETE"|"PARTIAL"; ratio:number|null;nearWarning:boolean|null;overBudget:boolean|null;isLowerBound:boolean};
export function computePersonalAiMonthlyBudget(monthly:PersonalAiMonthlySummary,budgetTokens:number|null,warningThreshold=0.8):PersonalAiBudgetStatus {
  if(budgetTokens!==null&&(!Number.isSafeInteger(budgetTokens)||budgetTokens<0))throw new Error("Budget tokens invalide");
  if(!Number.isFinite(warningThreshold)||warningThreshold<0||warningThreshold>1)throw new Error("Seuil d'alerte invalide");
  const ratio=budgetTokens===null?null:budgetTokens===0?(monthly.lowerBoundKnownLogicalTokens>0?Infinity:0):monthly.lowerBoundKnownLogicalTokens/budgetTokens;
  return {budgetTokens,knownUsageTokens:monthly.lowerBoundKnownLogicalTokens,consumptionCoverage:monthly.completeness,ratio,
    nearWarning:ratio===null?null:ratio>=warningThreshold,overBudget:ratio===null?null:ratio>1,isLowerBound:monthly.completeness!=="COMPLETE"};
}
