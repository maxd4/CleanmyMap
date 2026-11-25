import { describe, expect, it } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "@/components/sections/rubriques/annuaire/seed-index";
import { PARIS_CLEANWALK_ACTORS, PARIS_CLEANWALK_RELATIONS, countDistinctOperationsLast12Months, computeRelationThickness } from "./paris-cleanwalk-network";
import { PARIS_SCHEDULED_OPERATIONS, projectScheduledRelations } from "./paris-cleanwalk-network.scheduled";
import { computeParisNetwork3DLayout, filterParisNetwork, DEFAULT_PARIS_NETWORK_3D_FILTERS } from "@/components/sections/rubriques/annuaire/paris-network-3d.model";
describe("declared scheduled school operations", () => {
  it("uses unique UAI identities from editorial seed and preserves uncertainty", () => {
    const schools=INITIAL_ANNUAIRE_ENTRIES.filter(e=>e.kind==="etablissement_enseignement");
    expect(schools.map(e=>e.schoolProfile?.uai)).toEqual(["0756544F","0751241S"]);
    expect(new Set(INITIAL_ANNUAIRE_ENTRIES.map(e=>e.id)).size).toBe(INITIAL_ANNUAIRE_ENTRIES.length);
    expect(PARIS_CLEANWALK_ACTORS.filter(a=>a.category==="etablissement_enseignement").map(a=>a.id)).toEqual(schools.map(e=>e.id));
    expect(new Set(schools[1].schoolProfile?.addresses.map(a=>a.label)).size).toBe(2);
    expect(schools[1]).toMatchObject({lat:null,lng:null,qualificationStatus:"contact_non_qualifie"});
    expect(PARIS_CLEANWALK_ACTORS.every(a=>a.isCleanMyMapMember===false)).toBe(true);
  });
  it("keeps exactly two operations and three derived links", () => {
    expect(PARIS_SCHEDULED_OPERATIONS.map(e=>[e.id,e.date,e.status])).toEqual([["cleanwalk-ellipse-champ-de-mars-2026-12-04","2026-12-04","programme"],["cleanwalk-voltaire-brigade-verte-2026-11-30","2026-11-30","programme"]]);
    for(const e of PARIS_SCHEDULED_OPERATIONS) {
      expect(e.provenance).toMatchObject({kind:"declaration_organisateur",publicUrl:null});
      expect(e).toMatchObject({meetingPoint:null,time:null,route:null,classes:null,studentCount:null,supervisors:null,equipment:null});
    }
    expect(PARIS_SCHEDULED_OPERATIONS[0]).toMatchObject({location:"Champ-de-Mars, Paris 7e",schoolIdentification:"declaree"});
    expect(PARIS_SCHEDULED_OPERATIONS[1]).toMatchObject({location:null,arrondissement:null,schoolIdentification:"probable"});
    expect(PARIS_SCHEDULED_OPERATIONS[1].actors[0].role).toBeNull();
    const links=projectScheduledRelations(PARIS_SCHEDULED_OPERATIONS);
    expect(links.map(r=>[r.sourceId,r.targetId])).toEqual([["school-uai-0756544f","cleanmymap"],["school-uai-0756544f","asso-featured-1"],["school-uai-0751241s","asso-featured-1"]]);
    expect(links[0].operationId).toBe(links[1].operationId);
    expect(PARIS_CLEANWALK_RELATIONS.filter(r=>r.relationType==="collaboration_programmee")).toEqual(links);
  });
  it("never promotes past scheduled dates into historical counts", () => {
    const links=projectScheduledRelations(PARIS_SCHEDULED_OPERATIONS);
    for(const r of links)for(const date of ["2026-11-25","2026-12-10","2027-01-01"]){
      expect(countDistinctOperationsLast12Months(r,date)).toBeNull();
      expect(computeRelationThickness(r,date).operationsCount12m).toBeNull();
    }
    const filtered=filterParisNetwork(PARIS_CLEANWALK_ACTORS,PARIS_CLEANWALK_RELATIONS,{...DEFAULT_PARIS_NETWORK_3D_FILTERS,relationType:"collaboration_programmee"});
    expect(filtered.relations).toHaveLength(3);
    expect(computeParisNetwork3DLayout(filtered.actors,filtered.relations).edges.every(e=>e.dashPattern==="dashed"&&e.colorHex==="#fbbf24"&&e.operationsCount12m===null)).toBe(true);
    expect(filterParisNetwork(PARIS_CLEANWALK_ACTORS,PARIS_CLEANWALK_RELATIONS,{...DEFAULT_PARIS_NETWORK_3D_FILTERS,category:"etablissement_enseignement"}).actors).toHaveLength(2);
  });
});
