/** Lot 2: import preview and conflict classification. Pure, no writes, no raw files. */
import type { PersonalAiNormalizedUsage } from "./ai-personal-usage-normalization";
export type PersonalAiImportPreviewStatus = "READY"|"PARTIAL_NOT_AGGREGATABLE"|"DUPLICATE_EXACT"|"REVISION_REQUIRES_CONFIRMATION"|"CONFLICT_OVERLAP"|"IDENTITY_INCOMPLETE";
export type PersonalAiPreviewRow = { row:PersonalAiNormalizedUsage; status:PersonalAiImportPreviewStatus; conflictsWith:readonly number[]; stableSourceKey:string|null };
function stableKey(u:PersonalAiNormalizedUsage):string|null {
  // A source id or complete period is mandatory to avoid collision of unknown bills/events.
  if(!u.sourceRef && (u.periodStartUtc===null||u.periodEndUtc===null))return null;
  const model=u.modelCanonical??u.modelRaw??"UNKNOWN_MODEL";
  const account=u.accountScope??"UNDECLARED_SCOPE";
  return JSON.stringify([u.source,u.sourceVersion,u.granularity,account,u.sourceRef??null,u.periodStartUtc,u.periodEndUtc,model]);
}
function sameCounts(a:PersonalAiNormalizedUsage,b:PersonalAiNormalizedUsage):boolean {
  return JSON.stringify(a.tokens)===JSON.stringify(b.tokens) && JSON.stringify(a.cost??null)===JSON.stringify(b.cost??null);
}
function overlaps(a:PersonalAiNormalizedUsage,b:PersonalAiNormalizedUsage):boolean {
  return a.periodStartUtc!==null&&a.periodEndUtc!==null&&b.periodStartUtc!==null&&b.periodEndUtc!==null&&a.periodStartUtc<b.periodEndUtc&&b.periodStartUtc<a.periodEndUtc;
}
/**
 * Potential overlap is deliberately conservative: an organization bucket and
 * project/request details may cover the same usage, without proof of exclusion.
 */
function competingScope(a:PersonalAiNormalizedUsage,b:PersonalAiNormalizedUsage) {
  return a.source===b.source && (a.modelCanonical??a.modelRaw)===(b.modelCanonical??b.modelRaw) && overlaps(a,b);
}
export function previewPersonalAiImport(incoming:readonly PersonalAiNormalizedUsage[],existing:readonly PersonalAiNormalizedUsage[]=[]):readonly PersonalAiPreviewRow[] {
  const all=[...existing,...incoming];
  return incoming.map((row,i)=>{
    const key=stableKey(row);
    const conflicts:number[]=[];
    let status:PersonalAiImportPreviewStatus=key===null?"IDENTITY_INCOMPLETE":row.completeness!=="COMPLETE"?"PARTIAL_NOT_AGGREGATABLE":"READY";
    // Distinguish exact identity reimport, late revision, and scope overlaps.
    for(let j=0;j<all.length;j++){
      if(j===existing.length+i)continue;
      const other=all[j],otherKey=stableKey(other);
      if(key!==null && key===otherKey){
        if(sameCounts(row,other)){
          if(status!=="REVISION_REQUIRES_CONFIRMATION") status="DUPLICATE_EXACT";
        }else status="REVISION_REQUIRES_CONFIRMATION";
        conflicts.push(j);
      }else if(competingScope(row,other)){
        if(status==="READY"||status==="PARTIAL_NOT_AGGREGATABLE")status="CONFLICT_OVERLAP";
        conflicts.push(j);
      }
    }
    return {row,status,conflictsWith:conflicts,stableSourceKey:key};
  });
}
/**
 * Use on the client/server only when crypto.subtle is available. Persist only
 * the digest of the normalized stable identity, never a raw account name.
 */
export async function hashPersonalAiStableKey(stableSourceKey:string):Promise<string> {
  if(stableSourceKey.length>2048)throw new Error("Identité de source trop volumineuse");
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(stableSourceKey));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
