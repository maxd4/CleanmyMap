/** CSV mapping is supplied by the user, never guessed from an unverified provider export. */
import { normalizePersonalAiUsage, type PersonalAiNormalizedUsage, type PersonalAiUsageDraft } from "./ai-personal-usage-normalization";
export type AiCsvMapping = {
  delimiter: ","|";";
  startUtcColumn: string;
  endUtcColumn: string;
  inputColumn: string;
  outputColumn: string;
  modelColumn?: string;
  cacheReadColumn?: string;
  cacheWriteColumn?: string;
  sourceVersion: string;
  granularity: "request"|"bucket";
};
function parseCsvCells(text:string, delimiter:string):string[][] {
  const out:string[][]=[],row:string[]=[];
  let value="",quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){
      if(c==='"'&&text[i+1]==='"'){value+='"';i++;}
      else if(c==='"')quoted=false;
      else value+=c;
    }else if(c==='"'){
      if(value!=='')throw new Error("CSV: guillemet hors champ");
      quoted=true;
    }else if(c===delimiter){row.push(value);value="";}
    else if(c==='\n'){row.push(value.replace(/\r$/, ""));out.push([...row]);row.length=0;value="";}
    else value+=c;
  }
  if(quoted)throw new Error("CSV: guillemet non fermé");
  if(value!==''||row.length>0){row.push(value);out.push([...row]);}
  return out.filter(r=>r.some(c=>c.trim()!==''));
}
function parseCount(s:string,field:string):number|null {
  if(s.trim()==="")return null;
  if(!/^\d+$/.test(s))throw new Error(`CSV: ${field} doit être un entier non négatif`);
  const val=Number(s);
  if(!Number.isSafeInteger(val))throw new Error(`CSV: ${field} hors entier sûr`);
  return val;
}
export function parseExplicitlyMappedCsv(text:string,mapping:AiCsvMapping):readonly PersonalAiNormalizedUsage[] {
  if(new TextEncoder().encode(text).byteLength>10_000_000)throw new Error("CSV trop volumineux");
  const grid=parseCsvCells(text.replace(/^\uFEFF/,""),mapping.delimiter);
  if(grid.length<2||grid.length>20_001)throw new Error("CSV hors plage de lignes");
  const header=grid[0];
  if(new Set(header).size!==header.length)throw new Error("En-têtes CSV dupliqués");
  const used=[mapping.startUtcColumn,mapping.endUtcColumn,mapping.inputColumn,mapping.outputColumn,mapping.modelColumn,mapping.cacheReadColumn,mapping.cacheWriteColumn].filter((c):c is string=>Boolean(c));
  for(const col of used)if(!header.includes(col))throw new Error(`Colonne CSV manquante : ${col}`);
  const read=(r:readonly string[],col:string|undefined)=>col===undefined?"":r[header.indexOf(col)]??"";
  const rows:PersonalAiNormalizedUsage[]=[];
  for(const [i,r] of grid.slice(1).entries()){
    if(r.length!==header.length)throw new Error(`CSV ligne ${i+2}: nombre de colonnes incohérent`);
    const tokens={
      inputTotal:parseCount(read(r,mapping.inputColumn),"inputTotal"),inputUncached:null,
      cacheRead:parseCount(read(r,mapping.cacheReadColumn),"cacheRead"),cacheWrite:parseCount(read(r,mapping.cacheWriteColumn),"cacheWrite"),
      outputVisible:parseCount(read(r,mapping.outputColumn),"output"),outputReasoning:null,
      outputTotal:parseCount(read(r,mapping.outputColumn),"output"),reasoningRelation:"included" as const,toolUseInput:null,
    };
    const row:PersonalAiUsageDraft={source:"csv_mapped",sourceVersion:mapping.sourceVersion,granularity:mapping.granularity,accountScope:null,
      periodStartUtc:read(r,mapping.startUtcColumn)||null,periodEndUtc:read(r,mapping.endUtcColumn)||null,
      modelRaw:read(r,mapping.modelColumn)||null,modelCanonical:null,operator:null,execution:"cloud_api",inferenceRegion:null,requestCount:null,
      tokens,completeness:"UNKNOWN"};
    rows.push(normalizePersonalAiUsage(row));
  }
  return rows;
}
