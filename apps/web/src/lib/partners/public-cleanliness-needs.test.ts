import { describe, expect, it } from "vitest";
import { PARIS_PUBLIC_CLEANLINESS_DATASET as data, getPublicCleanlinessContact, validatePublicCleanlinessOrganization, type PublicCleanlinessCityDataset } from "./public-cleanliness-organization";
import { PUBLIC_CLEANLINESS_NEEDS, getPublicCleanlinessNeedRoute, getPublicInstitutionalContributions } from "./public-cleanliness-needs";
import { PARIS_CLEANWALK_ACTORS } from "./paris-cleanwalk-network";

describe("Paris waste chain and public contact routes", () => {
  it("resolves the eight needs for every canonical arrondissement with documented provenance and explicit gaps", () => {
    expect(PUBLIC_CLEANLINESS_NEEDS).toHaveLength(8);
    expect(data.territoryIds).toHaveLength(20);
    for (const territory of data.territoryIds) {
      for (const need of PUBLIC_CLEANLINESS_NEEDS) {
        const route = getPublicCleanlinessNeedRoute(data, territory, need)!;
        expect(route.targets.length).toBeGreaterThan(0);
        expect(route.missing).toEqual([]);
        expect(route.gaps.fr.length).toBeGreaterThan(0);
        expect(route.sources.length).toBeGreaterThan(0);
        expect(route.targets.every(target => target.sources.length > 0)).toBe(true);
        const division = route.targets.find(target => target.id.startsWith("division-"));
        if (need === "mobilize") {
          expect(division).toBeUndefined();
        } else {
          expect(division).toBeDefined();
          expect(division!.territoryKnown).toBe(true);
          expect(data.nodes.find(node => node.id === division!.id)?.territoryIds).toContain(territory);
        }
      }
    }
    expect(getPublicCleanlinessNeedRoute(data, "Paris:21", "organize")).toBeNull();
    expect(getPublicCleanlinessNeedRoute({ ...data, city: "Lyon" }, "Paris:1", "organize")).toBeNull();
  });

  it("keeps household collection regimes separate from event pickup, including Paris Centre", () => {
    for (const territory of data.territoryIds) {
      const route = getPublicCleanlinessNeedRoute(data, territory, "removal")!;
      const regimes = route.targets.filter(target => ["municipal-collection-regie", "private-collectors"].includes(target.id));
      expect(regimes).toHaveLength(1);
      const number = Number(territory.split(":")[1]);
      expect(regimes[0].id).toBe([2, 5, 6, 8, 9, 12, 14, 16, 17, 20].includes(number) ? "municipal-collection-regie" : "private-collectors");
      expect(route.gaps.fr).toContain("confirmation de prise en charge");
      expect(route.guidance.fr).toContain("sans consigne explicite");
    }
  });

  it("qualifies equipment and drop-off rather than implying approval", () => {
    const equipment = getPublicCleanlinessNeedRoute(data, "Paris:17", "equipment")!;
    expect(equipment.guidance.fr).toContain("sacs et des gants");
    expect(equipment.gaps.fr).toContain("Pinces");
    expect(equipment.targets.find(t => t.id === "stpp-supply-center")?.status).toBe("historical");
    const storage = getPublicCleanlinessNeedRoute(data, "Paris:20", "storage")!;
    expect(storage.guidance.fr).toContain("demande préalable");
    expect(storage.gaps.fr).toContain("Aucun stock");
    expect(storage.targets.some(t => t.id.startsWith("syctom-tri-"))).toBe(false);
  });

  it("reuses identities, public network relations and non-hierarchical treatment contracts", () => {
    expect(validatePublicCleanlinessOrganization(data)).toEqual([]);
    const actorIds = new Set(PARIS_CLEANWALK_ACTORS.map(actor => actor.id));
    expect(data.nodes.filter(node => node.networkActorId).every(node => actorIds.has(node.networkActorId!))).toBe(true);
    expect(data.nodes.filter(node => node.id === "person-pierre-lombard")).toHaveLength(1);
    expect(data.relations.find(edge => edge.from === "person-pierre-lombard" && edge.to === "syctom-vice-presidency")?.kind).toBe("mandate");
    expect(data.relations.some(edge => edge.kind === "hierarchy" && ["syctom", "private-collectors", "asso-megots-alcome", "eco-organisme-citeo"].includes(edge.to))).toBe(false);
    expect(data.relations.find(edge => edge.from === "operator-trivalo-92" && edge.to === "syctom-tri-nanterre")).toMatchObject({ kind: "service", validUntil: "2028-06-30" });
    expect(data.nodes.find(node => node.id === "syctom-tri-paris-17")?.assignment).toBe("historical");
    expect(getPublicInstitutionalContributions(data, "dpe").map(relation => relation.id)).toContain("rel-dpe-mairie-5");
    expect(getPublicInstitutionalContributions(data, "town-hall-05").map(relation => relation.otherId)).toContain("dpe");
    expect(getPublicInstitutionalContributions(data, "town-hall-06")).toEqual([]);
  });

  it("projects only public fields and fails closed on foreign, recruitment and private channels", () => {
    const hall = data.nodes.find(node => node.id === "town-hall-centre")!;
    const invalidContacts = [
      { label: "Private invitation", url: "https://chat.whatsapp.com/private-code", kind: "official_portal" as const, sourceIds: ["paris-elus-2026"] },
      { label: "Private admin link", url: "https://private.example.com/secret", kind: "official_portal" as const, sourceIds: ["paris-elus-2026"] },
      { label: "Recruitment", url: "https://travaillerpourparis.offres.paris.fr/13375", kind: "functional_contact" as const, sourceIds: ["req-20-recruitment"] },
    ];
    for (const contact of invalidContacts) {
      expect(getPublicCleanlinessContact({ ...hall, publicContact: contact }, data.sources)).toBeNull();
    }
    const injected: PublicCleanlinessCityDataset = { ...data, nodes: data.nodes.map(node => node.id === hall.id ? { ...node, privateAdministrativeNotes: "private-secret-marker", publicContact: invalidContacts[0] } : node) };
    const route = getPublicCleanlinessNeedRoute(injected, "Paris:1", "organize")!;
    expect(route.targets.find(target => target.id === hall.id)?.contact).toBeNull();
    expect(JSON.stringify(route)).not.toMatch(/private-secret-marker|private-code/);
    expect(validatePublicCleanlinessOrganization(injected)).toContain("unsafe-public-contact:" + hall.id);
  });

  it("shows unavailable targets explicitly and never claims operators for unknown territories", () => {
    const missing = { ...data, nodes: data.nodes.filter(node => node.id !== "division-01-04") };
    expect(getPublicCleanlinessNeedRoute(missing, "Paris:1", "organize")?.missing).toHaveLength(1);
    const route = getPublicCleanlinessNeedRoute(data, "Paris:1", "cigarette")!;
    expect(route.wasteCategories).toEqual(["cigarette_butt"]);
    expect(route.targets.find(target => target.id === "asso-megots-ecomegot")?.territoryKnown).toBe(false);
    expect(route.targets.find(target => target.id === "asso-megots-alcome")?.rationale.fr).toContain("pas collecteur direct");
    expect(route.targets.find(target => target.id === "operator-ckfd")?.territoryKnown).toBe(false);
    for (const territory of data.territoryIds) {
      const cigarette = getPublicCleanlinessNeedRoute(data, territory, "cigarette")!;
      expect(cigarette.guidance.fr).toContain("100 kg");
      expect(cigarette.guidance.fr).toContain("petits volumes");
      expect(cigarette.gaps.fr).toContain("Aucun bac commun");
      expect(cigarette.targets.find(target => target.id === "operator-carton-plein-cyclo")).toMatchObject({ territoryKnown: false });
      expect(cigarette.targets.find(target => target.id === "municipal-tri-sites")?.rationale.fr).toContain("aucun dépôt établi");
      expect(cigarette.targets.some(target => target.id === "operator-mego")).toBe(false);
    }
    for (const id of ["operator-ckfd", "operator-mego", "operator-carton-plein-cyclo"]) {
      expect(data.nodes.find(node => node.id === id)).toMatchObject({ networkActorId: id, directoryId: id, territoryIds: [] });
    }
    expect(data.relations.some(edge => (edge.from === "operator-carton-plein-cyclo" || edge.to === "operator-carton-plein-cyclo"))).toBe(false);
    expect(route.targets.find(target => target.id === "asso-megots-cyclope")?.rationale.fr).toContain("énergétique");
    expect(route.targets.some(target => target.id === "operator-mego")).toBe(false);
    expect(data.relations.find(edge => edge.from === "operator-ckfd" && edge.to === "operator-mego")?.kind).toBe("service");
  });
});
