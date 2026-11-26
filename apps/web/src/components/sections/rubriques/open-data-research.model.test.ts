import {describe,expect,it} from "vitest";
import {DEFAULT_RESEARCH_QUERY,projectResearchSample,researchQueryUrl} from "./open-data-research.model";
const q=DEFAULT_RESEARCH_QUERY;
const item=(id:string,phase="post_action_complete",extra:Record<string,unknown>={})=>({id,status:"approved",contract:{type:"action",status:"approved",dates:{observedAt:"2026-11-01"},location:{departmentCode:"75",latitude:48.85,longitude:2.35},metadata:{actionPhase:phase,wasteKg:0,cigaretteButts:null,durationMinutes:0,actorName:"PRIVATE_SENTINEL",...extra}}});
const body=(items:unknown[],extra:Record<string,unknown>={})=>({status:"ok",count:items.length,items,isTruncated:false,partialSource:false,...extra});
describe("public research sample",()=>{
  it("uses real public query parameters and bounds",()=>{
    const url=new URL(researchQueryUrl({...q,context:"school",from:"2026-01-01",limit:300}),"https://example.test");
    expect(url.pathname).toBe("/api/actions/map");
    expect(Object.fromEntries(url.searchParams)).toEqual({types:"action",status:"approved",floorDate:"2026-01-01",limit:"300",context:"school"});
    expect(()=>researchQueryUrl({...q,limit:301})).toThrow();
    expect(()=>researchQueryUrl({...q,from:"2026-02-31"})).toThrow();
    expect(researchQueryUrl({...q,type:"spot",context:"school"})).not.toContain("context");
  });
  it("excludes planned, draft, duplicate and future records even with approved status",()=>{
    const future=item("f");future.contract.dates.observedAt="2027-01-01";
    const result=projectResearchSample(body([item("a"),item("b","pre_action"),item("c","post_action_draft"),item("a"),future]),q,"2026-11-25");
    expect(result.received).toBe(5);expect(result.excluded).toBe(4);expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({wasteKg:0,butts:null,durationMinutes:null,department:"75"});
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE_SENTINEL|48\.85|2\.35/);
  });
  it("preserves provenance and omitted measurements, distinguishes partial and truncated",()=>{
    const result=projectResearchSample(body([item("a","post_action_complete",{wasteKg:25,provided:[],wasteMeasurementMethod:"estimation_visuelle"})],{isTruncated:true,partialSource:false}),q,"2026-11-25");
    expect(result.rows[0]).toMatchObject({wasteKg:null,massMethod:"estimation_visuelle"});
    expect(result).toMatchObject({isTruncated:true,partialSource:false});
    expect(projectResearchSample(body([],{partialSource:false,sourceHealth:{partial:true}}),q,"2026-11-25").partialSource).toBe(true);
    expect(()=>projectResearchSample({status:"ok",count:1,items:[]},q,"2026-11-25")).toThrow();
  });
  it("never converts a spot to a cleanup",()=>{
    const spot=item("spot");spot.contract.type="spot";
    expect(projectResearchSample(body([spot]),q,"2026-11-25").rows).toHaveLength(0);
    expect(projectResearchSample(body([spot]),{...q,type:"spot"},"2026-11-25").rows[0]).toMatchObject({wasteKg:null,butts:null});
  });
});
