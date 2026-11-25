import { describe, expect, it } from "vitest";
import { PARIS_CLEANING_DIVISIONS, PARIS_MUNICIPAL_TOWN_HALLS, PARIS_ASSOCIATION_PUBLIC_CONTACTS, PARIS_DPE_CONTACT, resolveParisCleaningDivisionContacts, resolveParisTownHallContacts } from "./paris-cleanwalk-network.contacts";

describe("Paris shared public contact contract", () => {
  it("covers each of the 20 districts once in the 14 divisions and 17 town halls", () => {
    expect(PARIS_CLEANING_DIVISIONS).toHaveLength(14);
    expect(PARIS_MUNICIPAL_TOWN_HALLS).toHaveLength(17);
    for (let n = 1; n <= 20; n++) {
      expect(resolveParisCleaningDivisionContacts([n])).toHaveLength(1);
      expect(resolveParisTownHallContacts([n])).toHaveLength(1);
      expect(Boolean(resolveParisCleaningDivisionContacts([n])[0].email)).toBe(n !== 8);
    }
    expect(resolveParisTownHallContacts([1,2,3,4]).map(c => c.id)).toEqual(["mairie-paris-centre"]);
  });
  it("uses territorial email scopes and does not propagate the 7e contact", () => {
    expect(resolveParisCleaningDivisionContacts([7,9,17]).map(c => c.email)).toEqual(["DPE-STPP-7/8e-Exploitation7e@paris.fr", "DPE-STPP-9/10e-Exploitation@paris.fr", "DPE-STPP-17e-Exploitation@paris.fr"]);
    expect(resolveParisCleaningDivisionContacts([8])[0]).not.toHaveProperty("email");
    expect(resolveParisCleaningDivisionContacts([7,8])[0].emailArrondissements).toEqual([7]);
    expect(resolveParisCleaningDivisionContacts([7,7,21,0,1.5])).toHaveLength(1);
    expect(resolveParisCleaningDivisionContacts([])).toEqual([]);
  });
  it("corrects the annex sector inversion and retains canonical IDs", () => {
    expect(resolveParisCleaningDivisionContacts([18])[0]).toMatchObject({id:"paris-18", organizationNodeId:"division-18", phone:"01 53 09 22 60", email:"DPE-STPP-18e-Exploitation@paris.fr"});
    expect(resolveParisCleaningDivisionContacts([19])[0]).toMatchObject({id:"paris-19", organizationNodeId:"division-19", phone:"01 53 72 54 00", email:"DPE-STPP-19e-Exploitation@paris.fr"});
    expect(PARIS_DPE_CONTACT.actorId).toBe("evt-paris-nettoyages");
    expect(resolveParisTownHallContacts([5,6]).map(c => c.id)).toEqual(["mairie-paris-5","mairie-paris-6"]);
    expect(new Set(PARIS_CLEANING_DIVISIONS.map(c => c.email)).size).toBe(14);
    expect(new Set(PARIS_MUNICIPAL_TOWN_HALLS.map(c => c.id)).size).toBe(17);
  });
  it("keeps four existing association actors and never invents logistic locations", () => {
    expect(PARIS_ASSOCIATION_PUBLIC_CONTACTS.map(c => c.actorId)).toEqual(["asso-featured-1","asso-surfrider-paris","asso-zerowaste-paris","cleanwalker-paris"]);
    expect(PARIS_ASSOCIATION_PUBLIC_CONTACTS.map(c => c.email)).toEqual(["brigadeverteparis20@gmail.com","antenne75@surfrider.eu","contact@zerowasteparis.fr",undefined]);
    expect(PARIS_DPE_CONTACT.logistics).toMatchObject({stockConfirmed:false,pickupAddress:null,authorizedCollectionAddress:null});
    for (const c of PARIS_CLEANING_DIVISIONS) { expect(c.emailSource.url).toMatch(/^https:\/\//); expect(c.emailSource.verifiedOn).toBe("2026-11-25"); }
    for (const c of PARIS_MUNICIPAL_TOWN_HALLS) expect(c.source.url).toMatch(/^https:\/\/www\.paris\.fr\/lieux\//);
    for (const c of PARIS_ASSOCIATION_PUBLIC_CONTACTS) expect(c.source.url).toMatch(/^https:\/\//);
  });
});
