import { describe, expect, it, vi } from "vitest";
import { lookupMetropolitanContacts } from "./metropolitan-directory.server";
import { isMetropolitanCommune } from "./metropolitan-contacts-contract";
const id = "df8f7f77-ed99-413c-a529-abb5093c7da9";
const payload = (results: unknown[], total_count = results.length) => new Response(JSON.stringify({results,total_count}));
describe("metropolitan directory", () => {
  it.each(["01001","2A004","2B033","75056","95127"])("accepts metropolitan code %s", code => expect(isMetropolitanCommune(code)).toBe(true));
  it.each(["97101","97411","98701","20001","invalid"])("rejects non-metropolitan or malformed code %s", code => expect(isMetropolitanCommune(code)).toBe(false));
  it("joins on geographic competence and published service IDs, deduplicates and excludes personal data", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(payload([{code_insee_commune:"31496",code_type_service_local:"mairie",id_service_local:JSON.stringify([id,id])}]))
      .mockResolvedValueOnce(payload([{id,nom:"Mairie test",statut_de_diffusion:"true",
        url_service_public:"https://lannuaire.service-public.gouv.fr/occitanie/test/"+id,
        telephone:'[{"valeur":"01 23 45 67 89"}]', adresse_courriel:'["mairie@example.test","a@example.test?bcc=x"]',
        site_internet:'[{"valeur":"https://example.test"},{"valeur":"javascript:alert(1)"}]', affectation_personne:[{name:"Private"}]}]));
    const result = await lookupMetropolitanContacts("31496",fetchImpl);
    expect(result.complete).toBe(true);
    expect(result.contacts).toHaveLength(1);
    expect(result.contacts[0]).toMatchObject({communeCodes:["31496"],types:["mairie"],emails:["mairie@example.test"],websites:["https://example.test"]});
    expect(result.contacts[0]).not.toHaveProperty("affectation_personne");
    expect(new URL(String(fetchImpl.mock.calls[0][0])).searchParams.get("where")).toContain('code_insee_commune = "31496"');
    expect(new URL(String(fetchImpl.mock.calls[1][0])).searchParams.get("where")).toContain(id);
  });
  it("keeps direct email fields returned by the live DILA records endpoint", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(payload([
      {code_insee_commune:"31496",code_type_service_local:"mairie",id_service_local:[id]},
    ])).mockResolvedValueOnce(payload([{
      id,nom:"Mairie test",statut_de_diffusion:"true",
      url_service_public:"https://lannuaire.service-public.gouv.fr/occitanie/test/"+id,
      adresse_courriel:"contact@example.test",
    }]));
    const result = await lookupMetropolitanContacts("31496",fetchImpl);
    expect(result.contacts[0]?.emails).toEqual(["contact@example.test"]);
  });
  it("reports truncation and excludes unpublished services",async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(payload([{code_insee_commune:"31496",code_type_service_local:"mairie",id_service_local:[id]}],2))
      .mockResolvedValueOnce(payload([{id,nom:"Non public",statut_de_diffusion:"false",url_service_public:"https://lannuaire.service-public.gouv.fr/test"}]));
    expect(await lookupMetropolitanContacts("31496",fetchImpl)).toEqual({contacts:[],complete:false});
  });
  it("rejects invalid codes before provider requests",async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    expect(await lookupMetropolitanContacts("97101",fetchImpl)).toEqual({contacts:[],complete:false});
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
