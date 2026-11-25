import { describe, it, expect } from "vitest";
import { resolveParisFormalitiesSupport, selectRelevantAssociationContacts } from "./paris-support";

describe("Paris formalities support projection", () => {
  it("preserves territorial email restrictions and deduplicates halls", () => {
    const support = resolveParisFormalitiesSupport([7,9,17,7,0,21]);
    expect(support.arrondissements).toEqual([7,9,17]);
    expect(support.divisions.map(c=>c.id)).toEqual(["paris-7-8","paris-9-10","paris-17"]);
    expect(new Set(support.divisions.map(c=>c.email)).size).toBe(3);
    expect(resolveParisFormalitiesSupport([8]).divisions[0]).not.toHaveProperty("email");
    expect(resolveParisFormalitiesSupport([7,8]).divisions[0].emailArrondissements).toEqual([7]);
    expect(resolveParisFormalitiesSupport([1,2,3,4]).townHalls).toHaveLength(1);
  });
  it("uses association actor identities and only matching documented areas", () => {
    const result = resolveParisFormalitiesSupport([7,9,17]);
    expect(result.associations.some(item=>item.actor.id==="asso-featured-1")).toBe(false);
    expect(resolveParisFormalitiesSupport([19]).associations.some(item=>item.actor.id==="asso-featured-1")).toBe(true);
    expect(result.associations.every(item=>item.matchedArrondissements.every(n=>result.arrondissements.includes(n)))).toBe(true);
    expect(resolveParisFormalitiesSupport([]).associations).toEqual([]);
    expect(selectRelevantAssociationContacts(new Set([7]),[],[])).toEqual([]);
  });
  it("does not resolve a deposit or stock and makes restrictions explicit", () => {
    const support = resolveParisFormalitiesSupport([7]);
    expect(support.logistics).toMatchObject({stockConfirmed:false,pickupAddress:null,authorizedCollectionAddress:null});
    expect(support.guidance.map(item=>item.text).join(" ")).toContain("Ne laissez aucun sac");
    expect(support.guidance.map(item=>item.text).join(" ")).toContain("Pas de dépôt indifférencié");
  });
});
