import {describe,expect,it} from "vitest";
import {buildActionDataContract,toActionMapItem,toPublicActionMapResponse} from "@/lib/actions/data-contract";
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

  it("projects genuine canonical /api/actions/map responses across action, spot and clean_place",()=>{
    const completedAction=buildActionDataContract({
      id:"act-canonical-1",
      type:"action",
      status:"approved",
      source:"actions",
      createdByClerkId:"user_private_123",
      observedAt:"2026-10-15",
      locationLabel:"12 rue de Rivoli, 75004 Paris",
      latitude:48.8566,
      longitude:2.3522,
      actorName:"PRIVATE_ACTOR_NAME",
      notesPlain:"Private free text note",
      actionPhase:"post_action_complete",
      wasteKg:0,
      cigaretteButts:null,
      volunteersCount:12,
      collectorsCount:10,
      durationMinutes:45,
      wasteMeasurementMethod:"balance_suspendue",
    });
    const missingMeasuresAction=buildActionDataContract({
      id:"act-canonical-2",
      type:"action",
      status:"approved",
      source:"actions",
      observedAt:"2026-10-16",
      locationLabel:"Paris 11e",
      latitude:null,
      longitude:null,
      actionPhase:"post_action_complete",
      wasteKg:null,
      cigaretteButts:0,
      durationMinutes:0,
    });
    const plannedAction=buildActionDataContract({
      id:"act-canonical-planned",
      type:"action",
      status:"approved",
      source:"actions",
      observedAt:"2027-05-01",
      locationLabel:"Paris 20e",
      latitude:null,
      longitude:null,
      actionPhase:"pre_action",
    });
    const canonicalSpot=buildActionDataContract({
      id:"spot-canonical-1",
      type:"spot",
      status:"approved",
      source:"spots",
      observedAt:"2026-10-12",
      locationLabel:"75018 Paris",
      latitude:48.89,
      longitude:2.34,
    });
    const canonicalCleanPlace=buildActionDataContract({
      id:"clean-canonical-1",
      type:"clean_place",
      status:"approved",
      source:"clean_places",
      observedAt:"2026-10-10",
      locationLabel:"75019 Paris",
      latitude:null,
      longitude:null,
    });

    const actionResponse=toPublicActionMapResponse({
      status:"ok",
      daysWindow:365,
      count:3,
      isTruncated:false,
      partialSource:false,
      items:[completedAction,missingMeasuresAction,plannedAction].map(c=>toActionMapItem(c)),
    });
    // ActionDataMetadata does not include metadata.provided; missing values must still remain null vs explicit 0.
    expect(completedAction.metadata).not.toHaveProperty("provided");
    const actionSample=projectResearchSample(actionResponse,q,"2026-11-26");
    expect(actionSample.received).toBe(3);
    expect(actionSample.excluded).toBe(1);
    expect(actionSample.rows).toHaveLength(2);
    expect(actionSample.rows[0]).toMatchObject({
      date:"2026-10-15",
      wasteKg:0,
      butts:null,
      volunteers:12,
      collectors:10,
      durationMinutes:45,
      massMethod:"balance_suspendue",
    });
    expect(actionSample.rows[1]).toMatchObject({
      date:"2026-10-16",
      wasteKg:null,
      butts:0,
      durationMinutes:null,
    });
    expect(JSON.stringify(actionSample)).not.toMatch(/PRIVATE_ACTOR_NAME|Private free text|user_private_123|48\.8566|2\.3522/);

    const spotResponse=toPublicActionMapResponse({
      status:"ok",daysWindow:365,count:1,isTruncated:false,partialSource:false,
      items:[toActionMapItem(canonicalSpot)],
    });
    const spotSample=projectResearchSample(spotResponse,{...q,type:"spot"},"2026-11-26");
    expect(spotSample.rows).toHaveLength(1);
    expect(spotSample.rows[0]).toMatchObject({date:"2026-10-12",wasteKg:null,butts:null});

    const cleanResponse=toPublicActionMapResponse({
      status:"ok",daysWindow:365,count:1,isTruncated:false,partialSource:false,
      items:[toActionMapItem(canonicalCleanPlace)],
    });
    const cleanSample=projectResearchSample(cleanResponse,{...q,type:"clean_place"},"2026-11-26");
    expect(cleanSample.rows).toHaveLength(1);
    expect(cleanSample.rows[0]).toMatchObject({date:"2026-10-10",wasteKg:null,butts:null});

    const emptyResponse=toPublicActionMapResponse({status:"ok",daysWindow:365,count:0,isTruncated:false,partialSource:false,items:[]});
    expect(projectResearchSample(emptyResponse,q,"2026-11-26")).toMatchObject({received:0,excluded:0,rows:[],isTruncated:false,partialSource:false});
  });
});
