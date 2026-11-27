import {describe,expect,it,vi} from "vitest";
import {resolveMetropolitanCoverage} from "./metropolitan-coverage.server";
const route = {latitude:null,longitude:null,department_code:"75",department_name:"Paris",derived_geometry_kind:"polyline" as const,
  derived_geometry_geojson:JSON.stringify({type:"LineString",coordinates:[[2.32,48.85],[2.4,48.85]]})};
const payload = (codes:string[]) => new Response(JSON.stringify({type:"FeatureCollection",features:codes.map(insee_com=>({properties:{insee_com}}))}));
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
  it("never infers geography from stale department after provider failure",async()=>{
    const request=vi.fn<typeof fetch>().mockRejectedValue(new Error("unavailable"));
    expect(await resolveMetropolitanCoverage(route,request)).toMatchObject({status:"unknown",communeCodes:[]});
  });
});
