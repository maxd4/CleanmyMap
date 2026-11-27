import { describe, expect, it, vi } from "vitest";
import { createDilaRequestBudget, lookupMetropolitanContacts } from "./metropolitan-directory.server";
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
  it("uses newly published DILA service types without a local allowlist", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(payload([
      {code_insee_commune:"31496",code_type_service_local:"parc_naturel_regional",id_service_local:[id]},
    ])).mockResolvedValueOnce(payload([{
      id,nom:"Parc test",statut_de_diffusion:true,
      url_service_public:"https://lannuaire.service-public.gouv.fr/occitanie/test/"+id,
    }]));
    const result = await lookupMetropolitanContacts("31496",fetchImpl);
    expect(result.contacts[0]?.types).toEqual(["parc_naturel_regional"]);
    expect(new URL(String(fetchImpl.mock.calls[0][0])).searchParams.get("where")).toBe('code_insee_commune = "31496"');
  });
  it("follows DILA pagination and marks provider truncation as partial", async () => {
    const firstPage = Array.from({length:100},(_,index) => ({
      code_insee_commune:"31496",code_type_service_local:"service_"+index,id_service_local:[],
    }));
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(payload(firstPage,101))
      .mockResolvedValueOnce(payload([{code_insee_commune:"31496",code_type_service_local:"police_municipale",id_service_local:[id]}],101))
      .mockResolvedValueOnce(payload([{id,nom:"Police municipale test",statut_de_diffusion:true,
        url_service_public:"https://lannuaire.service-public.gouv.fr/occitanie/test/"+id}]));
    const result = await lookupMetropolitanContacts("31496",fetchImpl);
    expect(result.contacts[0]?.types).toEqual(["police_municipale"]);
    expect(result.complete).toBe(false);
    expect(new URL(String(fetchImpl.mock.calls[1][0])).searchParams.get("offset")).toBe("100");
    expect(new URL(String(fetchImpl.mock.calls[0][0])).searchParams.get("order_by")).toBe("code_insee_commune,code_type_service_local,id_service_local");
  });
  it("ranks services matching selected needs before the deterministic identifier cap", async () => {
    const ids = Array.from({ length: 31 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`);
    const usefulId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    const rows = [...ids.map((serviceId, index) => ({
      code_insee_commune: "31496", code_type_service_local: `service_${index}`, id_service_local: JSON.stringify([serviceId]),
    })), { code_insee_commune: "31496", code_type_service_local: "mairie", id_service_local: JSON.stringify([usefulId]) }];
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(payload(rows))
      .mockResolvedValueOnce(payload([{ id: usefulId, nom: "Mairie", statut_de_diffusion: true,
        url_service_public: `https://lannuaire.service-public.gouv.fr/occitanie/test/${usefulId}` }]));
    const result = await lookupMetropolitanContacts("31496", fetchImpl, ["notify"]);
    const detailQuery = new URL(String(fetchImpl.mock.calls[1]?.[0])).searchParams.get("where") ?? "";

    expect(detailQuery).toContain(usefulId);
    expect(result.contacts[0]).toMatchObject({
      territorialRelation: "official_geographic_competence",
      taskCompetence: "not_verified",
    });
  });
  it("stops at the shared DILA request budget and reports a partial result", async () => {
    const budget = createDilaRequestBudget(2);
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(payload([{ code_insee_commune: "31496", code_type_service_local: "mairie", id_service_local: JSON.stringify([id]) }], 101))
      .mockResolvedValueOnce(payload([{ code_insee_commune: "31496", code_type_service_local: "mairie", id_service_local: JSON.stringify([id]) }], 101));

    await expect(lookupMetropolitanContacts("31496", fetchImpl, ["notify"], budget)).resolves.toEqual({
      contacts: [], complete: false,
    });
    expect(budget).toEqual({ remaining: 0, used: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("marks malformed pages, unsupported service identifiers and provider failures as incomplete", async () => {
    const malformed = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({ results: [], total_count: -1 })));
    await expect(lookupMetropolitanContacts("31496", malformed)).rejects.toThrow("Invalid DILA response");

    const unsupported = vi.fn<typeof fetch>().mockResolvedValueOnce(payload([
      { code_insee_commune: "31496", code_type_service_local: "mairie", id_service_local: ["not-a-uuid"] },
    ]));
    expect(await lookupMetropolitanContacts("31496", unsupported)).toMatchObject({ contacts: [], complete: false });

    const failed = vi.fn<typeof fetch>().mockRejectedValueOnce(new Error("offline"));
    await expect(lookupMetropolitanContacts("31496", failed)).rejects.toThrow("offline");
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
