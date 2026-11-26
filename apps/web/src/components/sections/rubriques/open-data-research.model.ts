import { ACTION_ENTITY_TYPES } from "@/lib/actions/types";
import { ACTION_CONTEXT_FILTER_VALUES } from "@/lib/actions/action-context";

export type ResearchEntity = (typeof ACTION_ENTITY_TYPES)[number];
export type ResearchContext = (typeof ACTION_CONTEXT_FILTER_VALUES)[number];
export type ResearchQuery = { type:ResearchEntity; from:string; context:ResearchContext; limit:number };
export const DEFAULT_RESEARCH_QUERY:ResearchQuery={type:"action",from:"",context:"all",limit:80};
export function researchQueryUrl(query:ResearchQuery):string {
  if(!ACTION_ENTITY_TYPES.includes(query.type)||!ACTION_CONTEXT_FILTER_VALUES.includes(query.context)||!Number.isInteger(query.limit)||query.limit<1||query.limit>300)throw new Error("Invalid research query");
  if(query.from&&(!/^\d{4}-\d{2}-\d{2}$/.test(query.from)||Number.isNaN(Date.parse(query.from))||new Date(query.from).toISOString().slice(0,10)!==query.from))throw new Error("Invalid date");
  const params=new URLSearchParams({types:query.type,status:"approved",floorDate:query.from||"all",limit:String(query.limit)});
  if(query.type==="action"&&query.context!=="all")params.set("context",query.context);
  return "/api/actions/map?"+params.toString();
}

type RecordValue=Record<string,unknown>;
function record(value:unknown):RecordValue|null{return value!==null&&typeof value==="object"&&!Array.isArray(value)?value as RecordValue:null;}
function number(value:unknown):number|null{return typeof value==="number"&&Number.isFinite(value)&&value>=0?value:null;}
function enumValue<T extends string>(value:unknown,allowed:readonly T[]):T|null{return typeof value==="string"&&allowed.includes(value as T)?value as T:null;}
function date(value:unknown):string|null{return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value?value:null;}
function dept(value:unknown):string|null{return typeof value==="string"&&/^(\d{2,3}|2[AB])$/.test(value)?value:null;}

export type ResearchRow={
  date:string|null; department:string|null;
  wasteKg:number|null; butts:number|null; volunteers:number|null; collectors:number|null;
  durationMinutes:number|null; massMethod:string|null; buttsProvenance:string|null;
  measuresProvenance:string|null; geometryProvenance:string|null; qualityStatus:string|null;
};
export type ResearchSample={
  received:number; excluded:number; rows:ResearchRow[];
  isTruncated:boolean|null; partialSource:boolean|null;
};
function provided(metadata:RecordValue,key:string):boolean{
  return !Array.isArray(metadata.provided)||metadata.provided.includes(key);
}
function projectRow(item:unknown,query:ResearchQuery,today:string):ResearchRow|null {
  const row=record(item),contract=record(row?.contract),metadata=record(contract?.metadata),dates=record(contract?.dates),location=record(contract?.location);
  if(!row||!contract||!metadata||contract.type!==query.type||row.status!=="approved"||contract.status!=="approved")return null;
  const observed=date(dates?.observedAt);
  // Public map status is not proof that fieldwork happened. Unknown phases/dates
  // are excluded from the research sample rather than inferred from legacy fields.
  if(query.type==="action"&&(metadata.actionPhase!=="post_action_complete"||!observed||observed>today))return null;
  if(query.from&&(!observed||observed<query.from))return null;
  if(query.type==="action"&&query.context!=="all"&&(query.context==="unknown"?metadata.actionContext!=null:metadata.actionContext!==query.context))return null;
  const quality=record(contract.dataQuality),provenance=record(quality?.provenance);
  const butts=record(metadata.cigaretteButtsMeasurements),isAction=query.type==="action";
  const duration=isAction?number(metadata.durationMinutes):null;
  return {
    date:observed,department:dept(location?.departmentCode),
    wasteKg:isAction&&provided(metadata,"waste_kg")?number(metadata.wasteKg):null,
    butts:isAction&&provided(metadata,"cigarette_butts")?number(metadata.cigaretteButts):null,
    volunteers:isAction?number(metadata.volunteersCount):null,
    collectors:isAction?number(metadata.collectorsCount):null,
    // Legacy normalization can turn omitted duration into zero; do not claim it was measured.
    durationMinutes:duration!==null&&duration>0?duration:null,
    massMethod:isAction?enumValue(metadata.wasteMeasurementMethod,["balance_suspendue","balance_au_sol","estimation_visuelle","autre","inconnue"]):null,
    buttsProvenance:isAction?enumValue(butts?.cigaretteButtsCountProvenance,["counted","weight_converted","volume_converted"]):null,
    measuresProvenance:enumValue(provenance?.measures,["measured","derived","estimated","missing"]),
    geometryProvenance:enumValue(provenance?.geometry,["observed","declared","reference","reconstructed","estimated","fallback","missing","unknown"]),
    qualityStatus:enumValue(quality?.status,["ok","warning","blocking"]),
  };
}
export function projectResearchSample(value:unknown,query:ResearchQuery,today:string):ResearchSample {
  const body=record(value);
  if(!body||body.status!=="ok"||!Array.isArray(body.items)||body.count!==body.items.length||body.items.length>query.limit)throw new Error("Unexpected public response");
  const rows:ResearchRow[]=[];
  const seen=new Set<string>();
  for(const item of body.items){
    const raw=record(item),id=raw?.id;
    if(typeof id!=="string"||!id||seen.has(id))continue;
    const row=projectRow(item,query,today);
    if(!row)continue;
    seen.add(id);rows.push(row);
  }
  const health=record(body.sourceHealth);
  return {received:body.items.length,excluded:body.items.length-rows.length,rows,
    isTruncated:typeof body.isTruncated==="boolean"?body.isTruncated:null,
    partialSource:body.partialSource===true||health?.partial===true?true:body.partialSource===false&&health?.partial!==true?false:null};
}
