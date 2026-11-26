import { describe, expect, it } from "vitest";
import { countInstitutionalDescendants, getInstitutionalAncestors, getNetworkNeighbourhood, separateNetworkBadges } from "./annuaire-graph-interactions";
import { buildGeoNetworkEntities, getAllGeoRelations } from "./annuaire-geo-network.model";
import { INITIAL_ANNUAIRE_ENTRIES } from "./seed-index";
import { PARIS_PUBLIC_CLEANLINESS_DATASET } from "@/lib/partners/public-cleanliness-organization";

describe("graph exploration",()=>{
  it("walks only hierarchy for ancestor highlighting",()=>{
    const ancestors=getInstitutionalAncestors("division-17",PARIS_PUBLIC_CLEANLINESS_DATASET.relations);
    expect(ancestors.has("stpp")).toBe(true);
    expect(ancestors.has("dpe")).toBe(true);
    expect(ancestors.has("city-paris")).toBe(true);
    expect(ancestors.has("syctom")).toBe(false);
  });
  it("counts unique descendants, respecting the visible set",()=>{
    const children=new Map([["a",["b","c"]],["b",["c"]],["c",["a"]]]);
    expect(countInstitutionalDescendants("a",children,new Set(["a","b","c"]))).toBe(2);
    expect(countInstitutionalDescendants("a",children,new Set(["a","b"]))).toBe(1);
  });
  it("expands real neighbours by at most two steps without duplicates",()=>{
    const entries=INITIAL_ANNUAIRE_ENTRIES.map(entry=>({...entry,distanceKm:null}));
    const edges=getAllGeoRelations(buildGeoNetworkEntities(entries,entries));
    const direct=getNetworkNeighbourhood("operator-ckfd",edges,1);
    const two=getNetworkNeighbourhood("operator-ckfd",edges,2);
    expect(direct.size).toBeGreaterThan(1);
    for(const id of direct)expect(two.has(id)).toBe(true);
    expect(getNetworkNeighbourhood(null,edges,2).size).toBe(0);
  });
  it("separates colocated badges deterministically without changing their inputs",()=>{
    const badges=[{id:"b",x:200,y:150,diameter:40,selected:false},{id:"a",x:200,y:150,diameter:40,selected:true}];
    const positions=separateNetworkBadges(badges,400,300);
    expect(positions.get("a")).toEqual({x:200,y:150});
    expect(positions.get("b")).not.toEqual(positions.get("a"));
    expect(badges[0]).toEqual({id:"b",x:200,y:150,diameter:40,selected:false});
    expect(separateNetworkBadges([...badges].reverse(),400,300)).toEqual(positions);
  });
});
