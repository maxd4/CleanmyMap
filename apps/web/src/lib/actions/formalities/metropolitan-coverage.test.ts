import {afterEach,describe,expect,it,vi} from "vitest";
import {loadMetropolitanContacts,resolveMetropolitanCoverage} from "./metropolitan-coverage.server";
const route = {latitude:null,longitude:null,department_code:"75",department_name:"Paris",derived_geometry_kind:"polyline" as const,
  derived_geometry_geojson:JSON.stringify({type:"LineString",coordinates:[[2.32,48.85],[2.4,48.85]]})};
const payload = (codes:string[]) => new Response(JSON.stringify({type:"FeatureCollection",features:codes.map(insee_com=>({properties:{insee_com}}))}));
afterEach(()=>vi.unstubAllGlobals());
describe("metropolitan coverage",()=>{
  it("intersects the actual route and deduplicates municipalities",async()=>{
    const request=vi.fn<typeof fetch>().mockResolvedValue(payload(["75056","94080","75056"]));
    const result=await resolveMetropolitanCoverage(route,request);
    expect(result).toMatchObject({status:"intersections",communeCodes:["75056","94080"]});
    const body=JSON.parse(String(request.mock.calls[0][1]?.body));
    expect(JSON.parse(body.geom)).toEqual(JSON.parse(route.derived_geometry_geojson));
  });
  it("never asserts full coverage when truncated or overseas codes appear",async()=>{
    const request=vi.fn<typeof fetch>().mockResolvedValue(payload(["75056","97101"]));
    expect(await resolveMetropolitanCoverage(route,request)).toMatchObject({status:"partial",communeCodes:["75056"]});
  });
  it("rejects ambiguous point on administrative boundary",async()=>{
    const request=vi.fn<typeof fetch>().mockResolvedValue(payload(["75056","94080"]));
    expect(await resolveMetropolitanCoverage({...route,latitude:48.85,longitude:2.35,derived_geometry_kind:"point",derived_geometry_geojson:null},request)).toMatchObject({status:"partial"});
  });
  it("resolves a point and marks a truncated point response partial",async()=>{
    const pointLocation={...route,latitude:48.8566,longitude:2.3522,derived_geometry_kind:"point" as const,derived_geometry_geojson:null};
    expect(await resolveMetropolitanCoverage(pointLocation,vi.fn<typeof fetch>().mockResolvedValue(payload(["75056"]))))
      .toMatchObject({status:"resolved_point",communeCodes:["75056"]});
    const truncated=new Response(JSON.stringify({type:"FeatureCollection",features:[{properties:{insee_com:"75056"}}],numberMatched:2}));
    expect(await resolveMetropolitanCoverage(pointLocation,vi.fn<typeof fetch>().mockResolvedValue(truncated)))
      .toMatchObject({status:"partial",communeCodes:["75056"]});
  });
  it("rejects malformed, empty, oversized and non-successful provider results",async()=>{
    expect(await resolveMetropolitanCoverage({...route,derived_geometry_geojson:"invalid"},vi.fn()))
      .toMatchObject({status:"unknown"});
    expect(await resolveMetropolitanCoverage({...route,derived_geometry_geojson:" ".repeat(80_001)},vi.fn()))
      .toMatchObject({status:"unknown"});
    expect(await resolveMetropolitanCoverage(route,vi.fn<typeof fetch>().mockResolvedValue(new Response("{}",{status:503}))))
      .toMatchObject({status:"unknown"});
    expect(await resolveMetropolitanCoverage(route,vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({type:"FeatureCollection",features:[{}]})))))
      .toMatchObject({status:"unknown"});
  });
  it("caps communes and treats malformed intersections as partial",async()=>{
    const codes=Array.from({length:13},(_,index)=>String(10000+index));
    const many=vi.fn<typeof fetch>().mockResolvedValue(payload(codes));
    expect(await resolveMetropolitanCoverage(route,many)).toMatchObject({status:"partial",communeCodes:codes.slice(0,12)});
    const mixed=vi.fn<typeof fetch>().mockResolvedValue(payload(["75056","invalid"]));
    expect(await resolveMetropolitanCoverage(route,mixed)).toMatchObject({status:"partial",communeCodes:["75056"]});
  });
  it("validates polygon rings and rejects invalid point coordinates",async()=>{
    const polygon={...route,derived_geometry_kind:"polygon" as const,derived_geometry_geojson:JSON.stringify({
      type:"Polygon",coordinates:[[[2.3,48.8],[2.4,48.8],[2.4,48.9],[2.3,48.8]]],
    })};
    const request=vi.fn<typeof fetch>().mockResolvedValue(payload(["75056"]));
    expect(await resolveMetropolitanCoverage(polygon,request)).toMatchObject({status:"intersections",communeCodes:["75056"]});
    expect(await resolveMetropolitanCoverage({...polygon,derived_geometry_geojson:JSON.stringify({
      type:"Polygon",coordinates:[[[2.3,48.8],[2.4,48.8],[2.4,48.9],[2.3,48.9]]],
    })},vi.fn())).toMatchObject({status:"unknown"});
    expect(await resolveMetropolitanCoverage({...route,latitude:120,longitude:0,derived_geometry_kind:"point",derived_geometry_geojson:null},vi.fn()))
      .toMatchObject({status:"unknown"});
  });
  it("rejects malformed response shapes and provider error statuses",async()=>{
    const malformedFeatures=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({type:"FeatureCollection",features:"invalid"})));
    const invalidJson=vi.fn<typeof fetch>().mockResolvedValue(new Response("not-json"));
    expect(await resolveMetropolitanCoverage(route,malformedFeatures)).toMatchObject({status:"unknown"});
    expect(await resolveMetropolitanCoverage(route,invalidJson)).toMatchObject({status:"unknown"});
  });
  it("never infers geography from stale department after provider failure",async()=>{
    const request=vi.fn<typeof fetch>().mockRejectedValue(new Error("unavailable"));
    expect(await resolveMetropolitanCoverage(route,request)).toMatchObject({status:"unknown",communeCodes:[]});
  });
  it("loads official competence contacts and reports its per-action DILA request budget",async()=>{
    const fetchMock=vi.fn<typeof fetch>()
      .mockResolvedValueOnce(payload(["75056"]))
      .mockResolvedValueOnce(new Response(JSON.stringify({results:[{
        code_insee_commune:"75056",code_type_service_local:"mairie",id_service_local:["df8f7f77-ed99-413c-a529-abb5093c7da9"],
      }],total_count:1})))
      .mockResolvedValueOnce(new Response(JSON.stringify({results:[{
        id:"df8f7f77-ed99-413c-a529-abb5093c7da9",nom:"Mairie",statut_de_diffusion:true,
        url_service_public:"https://lannuaire.service-public.gouv.fr/paris/test",
      }],total_count:1})));
    vi.stubGlobal("fetch",fetchMock);

    const result=await loadMetropolitanContacts(route,["notify"]);

    expect(result).toMatchObject({status:"complete",coverage:{communeCodes:["75056"]},lookupBudget:{requestsUsed:2,requestsAllowed:48}});
    expect(result.contacts[0]).toMatchObject({territorialRelation:"official_geographic_competence",taskCompetence:"not_verified"});
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("reports a location provider outage without claiming a complete contact search",async()=>{
    const fetchMock=vi.fn<typeof fetch>().mockRejectedValue(new Error("unavailable"));
    vi.stubGlobal("fetch",fetchMock);

    const result=await loadMetropolitanContacts(route,["pickup"]);

    expect(result).toMatchObject({status:"not_applicable",coverage:{status:"unknown",communeCodes:[]},contacts:[],lookupBudget:{requestsUsed:0,requestsAllowed:48}});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
