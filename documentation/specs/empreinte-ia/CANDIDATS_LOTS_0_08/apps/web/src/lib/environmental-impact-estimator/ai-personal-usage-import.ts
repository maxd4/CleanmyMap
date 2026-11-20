/**
 * Lot 2, browser-safe parsing of documented usage shapes.
 * No credentials, transcript, prompt, PDF binary or raw provider blob in output.
 * Convert with the canonical normalizer; persistence only on explicit user confirmation.
 */
import { normalizePersonalAiUsage, type PersonalAiNormalizedUsage, type PersonalAiUsageDraft } from "./ai-personal-usage-normalization";
export type AiParsedImport = { rows: readonly PersonalAiNormalizedUsage[]; status: "READY"|"PARTIAL"; warnings: readonly string[] };
export const PERSONAL_AI_IMPORT_LIMITS = {jsonBytes:10_000_000,jsonLines:20_000,jsonlBytes:50_000_000,jsonlLines:250_000,csvBytes:10_000_000,csvLines:20_000,pdfBytes:5_000_000,pdfPages:20} as const;
function object(value:unknown, label:string):Record<string,unknown> {
  if (!value||typeof value!=="object"||Array.isArray(value))throw new Error(`${label}: objet attendu`);
  return value as Record<string,unknown>;
}
function array(value:unknown,label:string):readonly unknown[] {
  if(!Array.isArray(value))throw new Error(`${label}: tableau attendu`);
  return value;
}
function int(value:unknown,label:string):number {
  if(!Number.isSafeInteger(value) || (value as number)<0)throw new Error(`${label}: compteur entier absent ou invalide`);
  return value as number;
}
function maybeInt(value:unknown,label:string):number|null {
  if(value===undefined||value===null)return null;
  return int(value,label);
}
function maybeStr(value:unknown):string|null {return typeof value==="string"?value:null;}
function unixUtc(value:unknown,label:string):string {
  const n=int(value,label);
  const d=new Date(n*1000);
  if(!Number.isFinite(d.getTime()))throw new Error(`${label}: date Unix invalide`);
  return d.toISOString();
}
function blankTokens():PersonalAiUsageDraft["tokens"] {
  return {inputTotal:null,inputUncached:null,cacheRead:null,cacheWrite:null,outputVisible:null,outputReasoning:null,outputTotal:null,reasoningRelation:"unknown",toolUseInput:null};
}
function base(source:PersonalAiUsageDraft["source"],version:string,granularity:PersonalAiUsageDraft["granularity"]):PersonalAiUsageDraft {
  return {source,sourceVersion:version,granularity,accountScope:null,periodStartUtc:null,periodEndUtc:null,modelRaw:null,modelCanonical:null,operator:null,execution:"cloud_api",inferenceRegion:null,requestCount:null,tokens:blankTokens(),completeness:"UNKNOWN"};
}
export function parseOpenAiOrganizationUsage(value:unknown):AiParsedImport {
  const root=object(value,"OpenAI root");
  if(root.object!=="page")throw new Error("OpenAI : objet page non reconnu");
  const partial=root.has_more!==false || root.next_page!==null;
  const rows:PersonalAiNormalizedUsage[]=[];
  const warnings:string[]=[];
  const buckets=array(root.data,"OpenAI data");
  for(const [i,b] of buckets.entries()){
    const bucket=object(b,`OpenAI bucket ${i}`), start=unixUtc(bucket.start_time,"start_time"),end=unixUtc(bucket.end_time,"end_time");
    for(const [j,raw] of array(bucket.results,`OpenAI results ${i}`).entries()){
      const x=object(raw,`OpenAI result ${i}/${j}`);
      const tIn=int(x.input_tokens,"input_tokens"), cache=maybeInt(x.input_cached_tokens,"input_cached_tokens"),cacheWrite=maybeInt(x.input_cache_write_tokens,"input_cache_write_tokens");
      const uncached=maybeInt(x.input_uncached_tokens,"input_uncached_tokens");
      const out=int(x.output_tokens,"output_tokens");
      const draft=base("openai_usage","organization-usage-completions","bucket");
      draft.periodStartUtc=start; draft.periodEndUtc=end;
      draft.modelRaw=maybeStr(x.model);draft.requestCount=maybeInt(x.num_model_requests,"num_model_requests");
      draft.accountScope=maybeStr(x.project_id);
      draft.tokens={...blankTokens(),inputTotal:tIn,inputUncached:uncached,cacheRead:cache,cacheWrite,outputVisible:null,outputTotal:out,reasoningRelation:"included"};
      draft.completeness=partial?"PARTIAL":"COMPLETE";
      rows.push(normalizePersonalAiUsage(draft));
    }
  }
  if(partial)warnings.push("Pagination incomplète : ne pas présenter le total comme exhaustif");
  return {rows,status:partial?"PARTIAL":"READY",warnings};
}
export function parseAnthropicAnalytics2026(value:unknown):AiParsedImport {
  const root=object(value,"Anthropic Analytics 2026 root");
  const rows:PersonalAiNormalizedUsage[]=[],warnings:string[]=[];
  const partial=root.has_more!==false||root.next_page!==null;
  const refresh=maybeStr(root.data_refreshed_at);
  for(const [i,raw] of array(root.data,"Anthropic Analytics data").entries()){
    const line=object(raw,`Anthropic row ${i}`),usage=object(line.usage,"Anthropic usage"),group=object(line.group,"Anthropic group");
    const creation=object(usage.cache_creation,"Anthropic cache_creation");
    const cacheWrite=int(creation.ephemeral_1h_input_tokens,"ephemeral_1h_input_tokens")+int(creation.ephemeral_5m_input_tokens,"ephemeral_5m_input_tokens");
    if(!Number.isSafeInteger(cacheWrite))throw new Error("Cache write overflow");
    const uncached=int(usage.uncached_input_tokens,"uncached_input_tokens"),cached=int(usage.cache_read_input_tokens,"cache_read_input_tokens");
    const input=uncached+cached+cacheWrite;
    if(!Number.isSafeInteger(input))throw new Error("Total input overflow");
    const out=int(usage.output_tokens,"output_tokens");
    const row=base("anthropic_analytics_2026","analytics-usage-cost-2026-08-24","bucket");
    row.periodStartUtc=maybeStr(line.starting_at);row.periodEndUtc=maybeStr(line.ending_at);
    row.modelRaw=maybeStr(group.model);row.inferenceRegion=maybeStr(group.inference_geo);
    row.accountScope=maybeStr(group.workspace_id);
    row.requestCount=maybeInt(usage.requests,"requests");
    row.tokens={...blankTokens(),inputTotal:input,inputUncached:uncached,cacheRead:cached,cacheWrite,outputVisible:null,outputTotal:out,reasoningRelation:"included"};
    row.sourceReportedLogicalTotal=maybeInt(usage.total_tokens,"total_tokens");
    const periodEnd=row.periodEndUtc;
    const freshnessUnknown=refresh===null||periodEnd===null||!Number.isFinite(Date.parse(refresh))||Date.parse(refresh)<Date.parse(periodEnd);
    row.completeness=partial||freshnessUnknown?"PARTIAL":"COMPLETE";
    if(freshnessUnknown)warnings.push("Fraîcheur des données non démontrée : ne pas présumer une période complète");
    rows.push(normalizePersonalAiUsage(row));
  }
  if(partial)warnings.push("Pagination Anthropic incomplète");
  return {rows,status:partial||rows.some(r=>r.completeness!=="COMPLETE")?"PARTIAL":"READY",warnings};
}
export function parseGeminiGenerateContentUsage(value:unknown):AiParsedImport {
  const root=object(value,"Gemini response"),m=object(root.usageMetadata,"Gemini usageMetadata");
  const prompt=int(m.promptTokenCount,"promptTokenCount"),tool=int(m.toolUsePromptTokenCount,"toolUsePromptTokenCount");
  const candidates=int(m.candidatesTokenCount,"candidatesTokenCount"),thoughts=int(m.thoughtsTokenCount,"thoughtsTokenCount");
  const total=int(m.totalTokenCount,"totalTokenCount"),cache=maybeInt(m.cachedContentTokenCount,"cachedContentTokenCount");
  const input=prompt+tool,output=candidates+thoughts;
  if(!Number.isSafeInteger(input)||!Number.isSafeInteger(output)||input+output!==total)throw new Error("Gemini : totalTokenCount incohérent");
  if(cache!==null && cache>prompt)throw new Error("Gemini : cachedContentTokenCount > promptTokenCount");
  const row=base("gemini_usage","GenerateContentResponse.usageMetadata","request");
  row.modelRaw=maybeStr(root.modelVersion);row.requestCount=1;
  row.tokens={...blankTokens(),inputTotal:input,cacheRead:cache,inputUncached:cache===null?null:input-cache,outputVisible:candidates,outputReasoning:thoughts,outputTotal:output,reasoningRelation:"additional",toolUseInput:tool};
  row.sourceReportedLogicalTotal=total;
  row.completeness="COMPLETE";
  return {rows:[normalizePersonalAiUsage(row)],status:"READY",warnings:["Le prompt Gemini inclut déjà les tokens de cache ; raisonnement et outils ventilés séparément"]};
}
/**
 * Browser-safe Codex reconstruction implementing the same source priority and
 * cumulative reset rule as scripts/data/summarize-jsonl-tokens.mjs on main.
 * Integration must move/share the pure reconstruction owner rather than keep two copies.
 * Each call is scoped to one verified rollout/session, never concatenate unrelated sessions.
 */
export function parseCodexRolloutJsonl(jsonl:string):AiParsedImport {
  if(new TextEncoder().encode(jsonl).byteLength>PERSONAL_AI_IMPORT_LIMITS.jsonlBytes)throw new Error("Fichier JSONL trop volumineux");
  const lines=jsonl.split(/\r?\n/).filter(l=>l.trim().length>0);
  if(lines.length>PERSONAL_AI_IMPORT_LIMITS.jsonlLines)throw new Error("Trop de lignes JSONL");
  type Counter={input_tokens:number;cached_input_tokens:number;cache_write_input_tokens:number;output_tokens:number;reasoning_output_tokens:number};
  const fields:(keyof Counter)[]=["input_tokens","cached_input_tokens","cache_write_input_tokens","output_tokens","reasoning_output_tokens"];
  const series:{thread:Partial<Counter>[];info:Partial<Counter>[];direct:Partial<Counter>[]}={thread:[],info:[],direct:[]};
  for(const line of lines){
    let event:Record<string,unknown>;
    try{event=object(JSON.parse(line),"Codex event");}catch{throw new Error("Codex JSONL invalide : aucun contenu privé conservé dans le diagnostic");}
    const payload=event.payload&&typeof event.payload==="object"&&!Array.isArray(event.payload)?event.payload as Record<string,unknown>:null;
    if(!payload)continue;
    let raw:unknown;let destination:keyof typeof series|null=null;
    if(event.type==="token_usage_record"&&payload.thread_token_usage){raw=payload.thread_token_usage;destination="thread";}
    else if(event.type==="event_msg" && payload.info && typeof payload.info==="object" && (payload.info as Record<string,unknown>).total_token_usage){raw=(payload.info as Record<string,unknown>).total_token_usage;destination="info";}
    else if(event.type==="token_usage_record"&&payload.usage){raw=payload.usage;destination="direct";}
    if(!destination||!raw||typeof raw!=="object"||Array.isArray(raw))continue;
    const record=raw as Record<string,unknown>,out:Partial<Counter>={};
    for(const field of fields){if(record[field]!==undefined)out[field]=int(record[field],field);}
    series[destination].push(out);
  }
  const source=series.thread.length?"thread":series.info.length?"info":series.direct.length?"direct":null;
  if(source===null)throw new Error("Aucun compteur Codex utilisable");
  const totals:Partial<Counter>={},last:Partial<Counter>={};
  for(const record of series[source]){
    for(const field of fields){
      const value=record[field]; if(value===undefined)continue;
      const prev=last[field];const delta=source==="direct"?value:prev===undefined||value<prev?value:value-prev;
      totals[field]=(totals[field]??0)+delta; last[field]=value;
      if(!Number.isSafeInteger(totals[field]))throw new Error("Dépassement entier Codex");
    }
  }
  const input=totals.input_tokens??null,cached=totals.cached_input_tokens??null,output=totals.output_tokens??null;
  const row=base("codex_rollout","rollout-jsonl-cumulative-reset","bucket");
  row.tokens={...blankTokens(),inputTotal:input,cacheRead:cached,cacheWrite:totals.cache_write_input_tokens??null,inputUncached:input!==null&&cached!==null&&totals.cache_write_input_tokens!==undefined?input-cached-totals.cache_write_input_tokens:null,outputVisible:output!==null&&totals.reasoning_output_tokens!==undefined?output-totals.reasoning_output_tokens:null,outputReasoning:totals.reasoning_output_tokens??null,outputTotal:output,reasoningRelation:"included"};
  // Codex reasoning_output_tokens is a sub-detail of output_tokens.
  // Period and model remain unknown unless a trusted separate, bounded metadata contract is provided.
  row.completeness="PARTIAL";
  return {rows:[normalizePersonalAiUsage(row)],status:"PARTIAL",warnings:["Reconstruction par session uniquement ; modèle/période/source de session à confirmer avant agrégation"]};
}
