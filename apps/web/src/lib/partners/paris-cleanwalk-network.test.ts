import { describe, expect, it } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "@/components/sections/rubriques/annuaire/seed-index";
import {
  PARIS_CLEANWALK_ACTORS,
  PARIS_CLEANWALK_RELATIONS,
  RELATION_THICKNESS_POLICY,
  computeRelationThickness,
  countDistinctOperationsLast12Months,
  isPrivateOrUnauthorizedInviteUrl,
  isSafeHttpUrl,
  sanitizeAndDeduplicatePublicChannels,
} from "./paris-cleanwalk-network";

describe("paris-cleanwalk-network registry contract", () => {
  it("includes all 28 required Paris ecosystem actors and platforms with unique IDs", () => {
    const ids = PARIS_CLEANWALK_ACTORS.map((actor) => actor.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PARIS_CLEANWALK_ACTORS).toHaveLength(28);

    const names = PARIS_CLEANWALK_ACTORS.map((actor) => actor.name);
    for (const required of [
      "Brigade Verte Paris",
      "Surfrider Paris",
      "Zero Waste Paris",
      "Ma Petite Planète",
      "World Cleanup Day France",
      "Mégothon",
      "SPOGOMI / Dream in Green France",
      "MyLegiTech",
      "Mairie du 5e arrondissement de Paris",
      "Mairie du 6e arrondissement de Paris",
      "Cleanwalker Paris",
      "The Clean Project",
      "J'agis pour la nature",
      "JeVeuxAider.gouv.fr",
      "Cleanwalk.org",
    ]) {
      expect(names).toContain(required);
    }
    expect(names.some((name) => name.includes("Ville de Paris"))).toBe(true);
  });

  it("reuses canonical Annuaire IDs when they exist", () => {
    const annuaireIds = new Set(INITIAL_ANNUAIRE_ENTRIES.map((entry) => entry.id));
    const linkedActors = PARIS_CLEANWALK_ACTORS.filter(
      (actor) => actor.annuaireEntryId !== undefined,
    );

    expect(linkedActors.map((actor) => actor.id)).toEqual(
      expect.arrayContaining([
        "asso-featured-1",
        "asso-surfrider-paris",
        "asso-zerowaste-paris",
        "evt-paris-nettoyages",
        "evt-j-agis-nature",
        "evt-je-veux-aider",
      ]),
    );

    for (const actor of linkedActors) {
      expect(annuaireIds.has(actor.id)).toBe(true);
      expect(actor.annuaireEntryId).toBe(actor.id);
    }
  });

  it("distinguishes direct organizers, network coordinators and publication platforms", () => {
    const byId = new Map(PARIS_CLEANWALK_ACTORS.map((actor) => [actor.id, actor]));

    expect(byId.get("asso-featured-1")?.ecosystemRoles).toEqual([
      "organisateur_direct",
    ]);
    expect(byId.get("asso-zerowaste-paris")?.ecosystemRoles).toEqual([
      "organisateur_direct",
      "coordinateur_reseau",
      "sensibilisation_prevention",
    ]);
    expect(byId.get("evt-j-agis-nature")?.ecosystemRoles).toEqual([
      "plateforme_publication",
    ]);
    expect(byId.get("evt-je-veux-aider")?.ecosystemRoles).toEqual([
      "plateforme_publication",
    ]);
    expect(byId.get("cleanwalk-org")?.ecosystemRoles).toEqual([
      "plateforme_publication",
    ]);
    expect(
      byId.get("cleanwalk-org")?.platformStatus?.v2UnavailableFeaturesNote,
    ).toContain("V2");
  });

  it("handles Brigade Verte Paris channels and avoids Super Brigade Verte confusion on JeVeuxAider", () => {
    const brigadeVerte = PARIS_CLEANWALK_ACTORS.find(
      (actor) => actor.id === "asso-featured-1",
    );
    expect(brigadeVerte).toBeDefined();
    expect(brigadeVerte?.publicLeader?.name).toBe("Thomas Saint-Aubin");
    expect(
      brigadeVerte?.publicChannels.some(
        (ch) =>
          ch.url ===
          "https://www.jagispourlanature.org/structure/brigade-verte-paris",
      ),
    ).toBe(true);

    const brigadeJagisRel = PARIS_CLEANWALK_RELATIONS.find(
      (rel) =>
        rel.sourceId === "asso-featured-1" &&
        rel.targetId === "evt-j-agis-nature" &&
        rel.relationType === "publie_sur",
    );
    expect(brigadeJagisRel).toBeDefined();

    const falseJeVeuxAiderRel = PARIS_CLEANWALK_RELATIONS.find(
      (rel) =>
        (rel.sourceId === "asso-featured-1" &&
          rel.targetId === "evt-je-veux-aider") ||
        (rel.sourceId === "evt-je-veux-aider" &&
          rel.targetId === "asso-featured-1"),
    );
    expect(falseJeVeuxAiderRel).toBeUndefined();
  });

  it("never exposes private invite links, unsafe URLs or CleanMyMap membership", () => {
    for (const actor of PARIS_CLEANWALK_ACTORS) {
      expect(actor.isCleanMyMapMember).toBe(false);
      expect(isSafeHttpUrl(actor.officialWebsite)).toBe(true);
      expect(isSafeHttpUrl(actor.provenance.sourceUrl)).toBe(true);
      for (const ch of actor.publicChannels) {
        expect(isSafeHttpUrl(ch.url)).toBe(true);
        expect(isPrivateOrUnauthorizedInviteUrl(ch.url)).toBe(false);
        expect(isSafeHttpUrl(ch.provenance.sourceUrl)).toBe(true);
        expect(ch.provenance.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }

    const materialProviders = PARIS_CLEANWALK_ACTORS.filter(
      (actor) => actor.equipmentAvailability.status === "fournit_materiel",
    );
    expect(materialProviders.map((actor) => actor.id)).toEqual([
      "evt-paris-nettoyages",
    ]);
  });

  it("deduplicates public channels and rejects private WhatsApp/Discord/Telegram invites", () => {
    const sanitized = sanitizeAndDeduplicatePublicChannels([
      {
        type: "site_officiel",
        label: "Site 1",
        url: "https://brigadeverteparis.fr/",
        provenance: {
          sourceLabel: "brigadeverteparis.fr",
          sourceUrl: "https://brigadeverteparis.fr",
          verifiedAt: "2026-11-19",
          certainty: "verifie",
        },
      },
      {
        type: "site_officiel",
        label: "Site doublon",
        url: "https://brigadeverteparis.fr",
        provenance: {
          sourceLabel: "brigadeverteparis.fr",
          sourceUrl: "https://brigadeverteparis.fr",
          verifiedAt: "2026-11-19",
          certainty: "verifie",
        },
      },
      {
        type: "groupe_whatsapp",
        label: "Groupe privé",
        url: "https://chat.whatsapp.com/SecretInvite123",
        provenance: {
          sourceLabel: "Privé",
          sourceUrl: "https://brigadeverteparis.fr",
          verifiedAt: "2026-11-19",
          certainty: "partiel_ou_incertain",
        },
      },
      {
        type: "groupe_discord",
        label: "Invite privée",
        url: "https://discord.gg/private123",
        provenance: {
          sourceLabel: "Privé",
          sourceUrl: "https://brigadeverteparis.fr",
          verifiedAt: "2026-11-19",
          certainty: "partiel_ou_incertain",
        },
      },
    ]);

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0]?.label).toBe("Site 1");
  });

  it("validates structured channel URLs against deceptive hosts, private invites and encoding bypasses", () => {
    // Private invites (direct, subdomain, trailing dot, percent-encoded, double-slash)
    expect(isPrivateOrUnauthorizedInviteUrl("https://chat.whatsapp.com/SecretInvite123")).toBe(true);
    expect(isPrivateOrUnauthorizedInviteUrl("https://chat.whatsapp.com./SecretInvite123")).toBe(true);
    expect(isPrivateOrUnauthorizedInviteUrl("https://wa.me/33612345678")).toBe(true);
    expect(isPrivateOrUnauthorizedInviteUrl("https://api.whatsapp.com/send?phone=33612345678")).toBe(true);
    expect(isPrivateOrUnauthorizedInviteUrl("https://discord.gg/private123")).toBe(true);
    expect(isPrivateOrUnauthorizedInviteUrl("https://discord.com/invite/private123")).toBe(true);
    expect(isPrivateOrUnauthorizedInviteUrl("https://discordapp.com//%69%6e%76%69%74%65/private123")).toBe(true);
    expect(isPrivateOrUnauthorizedInviteUrl("https://t.me/+SecretHash")).toBe(true);
    expect(isPrivateOrUnauthorizedInviteUrl("https://t.me/%2BSecretHash")).toBe(true);
    expect(isPrivateOrUnauthorizedInviteUrl("https://t.me/%252BSecretHash")).toBe(true);
    expect(isPrivateOrUnauthorizedInviteUrl("https://telegram.me/joinchat/SecretHash")).toBe(true);

    // Deceptive hosts & unsafe URLs
    expect(isSafeHttpUrl("https://chat.whatsapp.com.attacker.example/cleanwalk")).toBe(false);
    expect(isSafeHttpUrl("https://discord.gg.attacker.example/cleanwalk")).toBe(false);
    expect(isSafeHttpUrl("https://user:pass@example.org/")).toBe(false);
    expect(isPrivateOrUnauthorizedInviteUrl("https://chat.whatsapp.com.attacker.example/cleanwalk")).toBe(true);
    expect(isPrivateOrUnauthorizedInviteUrl("https://t.me/%E0%A4%A")).toBe(true);

    // Legitimate public channels and query strings mentioning domains
    expect(isPrivateOrUnauthorizedInviteUrl("https://www.cleanwalk.org/")).toBe(false);
    expect(isPrivateOrUnauthorizedInviteUrl("https://t.me/cleanwalk_public_channel")).toBe(false);
    expect(isPrivateOrUnauthorizedInviteUrl("https://not-wa.me.example.org/events")).toBe(false);
    expect(isPrivateOrUnauthorizedInviteUrl("https://cleanmymap.fr/actions/map?ref=discord.gg")).toBe(false);
  });

  it("contains the documented relations with valid actors, distinct publie_sur vs action_commune, and sources", () => {
    const actorIds = new Set(PARIS_CLEANWALK_ACTORS.map((actor) => actor.id));
    for (const relation of PARIS_CLEANWALK_RELATIONS) {
      expect(actorIds.has(relation.sourceId)).toBe(true);
      expect(actorIds.has(relation.targetId)).toBe(true);
      if (relation.relationType === "collaboration_programmee") {
        expect(relation.source.url).toBeNull(); expect(relation.source.provenance).toBe("declaration_organisateur"); expect(relation.operations).toBeUndefined();
      } else expect(isSafeHttpUrl(relation.source.url)).toBe(true);
    }

    const relationIds = new Set(PARIS_CLEANWALK_RELATIONS.map((rel) => rel.id));
    expect(relationIds.has("rel-wcd-megothon")).toBe(true);
    expect(relationIds.has("rel-brigade-verte-mylegitech")).toBe(true);
    expect(relationIds.has("rel-the-clean-project-megothon")).toBe(true);
    expect(relationIds.has("rel-brigade-verte-jagis")).toBe(true);
  });
});

describe("paris-cleanwalk-network 12-month deduplication and thickness policy", () => {
  it("deduplicates repeated operation IDs and filters to the 12-month rolling window", () => {
    const count = countDistinctOperationsLast12Months(
      {
        relationType: "action_commune",
        frequencyKnown: true,
        operations: [
          {
            id: "op-1",
            date: "2026-05-23",
            label: "Mégothon Bastille",
            sourceUrl: "https://www.lemegothon.fr",
          },
          {
            id: "op-1",
            date: "2026-05-23",
            label: "Mégothon Bastille (doublon)",
            sourceUrl: "https://www.worldcleanupday.fr",
          },
          {
            id: "op-2",
            date: "2026-09-19",
            label: "WCD Paris",
            sourceUrl: "https://www.worldcleanupday.fr",
          },
          {
            id: "op-old",
            date: "2025-01-10",
            label: "Hors fenêtre 12 mois",
            sourceUrl: "https://www.worldcleanupday.fr",
          },
        ],
      },
      "2026-11-19",
    );

    expect(count).toBe(2);
  });

  it("uses neutral thickness when frequency is unknown instead of inventing 0", () => {
    const result = computeRelationThickness({
      relationType: "action_commune",
      frequencyKnown: false,
      operations: undefined,
    });

    expect(result.operationsCount12m).toBeNull();
    expect(result.isNeutralFallback).toBe(true);
    expect(result.thickness).toBe(RELATION_THICKNESS_POLICY.neutralThickness);
    expect(result.thickness).toBeGreaterThan(0);
  });

  it("applies a bounded linear scale between 1 and 12+ proven operations", () => {
    const makeOps = (n: number) =>
      Array.from({ length: n }, (_, index) => ({
        id: `op-${index + 1}`,
        date: "2026-06-01",
        label: `Opération ${index + 1}`,
        sourceUrl: "https://www.worldcleanupday.fr",
      }));

    const oneOp = computeRelationThickness(
      { relationType: "action_commune", frequencyKnown: true, operations: makeOps(1) },
      "2026-11-19",
    );
    const sixOps = computeRelationThickness(
      { relationType: "action_commune", frequencyKnown: true, operations: makeOps(6) },
      "2026-11-19",
    );
    const twentyOps = computeRelationThickness(
      { relationType: "action_commune", frequencyKnown: true, operations: makeOps(20) },
      "2026-11-19",
    );

    expect(oneOp.thickness).toBe(RELATION_THICKNESS_POLICY.minThickness);
    expect(sixOps.thickness).toBeGreaterThan(oneOp.thickness);
    expect(sixOps.thickness).toBeLessThan(twentyOps.thickness);
    expect(twentyOps.thickness).toBe(RELATION_THICKNESS_POLICY.maxThickness);
  });

  it("validates corrected editorial URLs, public leader and WCD/Megothon partnership", () => {
    const byId = new Map(PARIS_CLEANWALK_ACTORS.map((actor) => [actor.id, actor]));
    expect(byId.get("cleanwalk-org")?.officialWebsite).toBe(
      "https://www.cleanwalk.org/",
    );
    expect(
      byId
        .get("cleanwalk-org")
        ?.publicChannels.some(
          (ch) =>
            ch.url === "https://www.helloasso.com/associations/cleanwalk-org",
        ),
    ).toBe(true);
    expect(
      byId
        .get("asso-zerowaste-paris")
        ?.publicChannels.some(
          (ch) =>
            ch.url ===
            "https://www.jeveuxaider.gouv.fr/organisations/16300-zero-waste-paris",
        ),
    ).toBe(true);
    expect(byId.get("world-cleanup-day-france")?.publicLeader?.name).toBe(
      "Virginie Delugeard",
    );

    const wcdMegothon = PARIS_CLEANWALK_RELATIONS.find(
      (rel) => rel.id === "rel-wcd-megothon",
    );
    expect(wcdMegothon?.relationType).toBe("partenariat");
    expect(wcdMegothon?.frequencyKnown).toBe(false);
    expect(wcdMegothon?.operations).toBeUndefined();

    const relationIds = new Set(PARIS_CLEANWALK_RELATIONS.map((rel) => rel.id));
    expect(relationIds.has("rel-spogomi-jagis")).toBe(false);
    expect(relationIds.has("rel-surfrider-wcd")).toBe(false);
    expect(relationIds.has("rel-dpe-brigade-verte")).toBe(false);

    const dpeMairie5 = PARIS_CLEANWALK_RELATIONS.find(
      (rel) => rel.id === "rel-dpe-mairie-5",
    );
    expect(dpeMairie5?.source.url).toBe(
      "https://mairie05.paris.fr/pages/contre-les-rats-la-mairie-du-5e-passe-a-l-offensive-32006",
    );

    const spogomi = byId.get("spogomi-dream-in-green-france");
    expect(spogomi?.parisZone.arrondissements).toEqual([]);
  });

  it("evaluates rolling 12-month operations at two distinct reference dates and preserves known-zero vs unknown", () => {
    const ops = [
      {
        id: "op-1",
        date: "2026-05-23",
        label: "Opération test",
        sourceUrl: "https://www.worldcleanupday.fr",
      },
    ];

    expect(
      countDistinctOperationsLast12Months(
        { relationType: "action_commune", frequencyKnown: true, operations: ops },
        "2026-11-19",
      ),
    ).toBe(1);

    expect(
      countDistinctOperationsLast12Months(
        { relationType: "action_commune", frequencyKnown: true, operations: ops },
        "2027-06-01",
      ),
    ).toBe(0);

    const knownZero = computeRelationThickness(
      { relationType: "action_commune", frequencyKnown: true, operations: [] },
      "2026-11-19",
    );
    expect(knownZero.operationsCount12m).toBe(0);
    expect(knownZero.isNeutralFallback).toBe(true);
    expect(knownZero.thickness).toBe(RELATION_THICKNESS_POLICY.neutralThickness);
  });

  it("includes the 9 prevention/awareness actors with verified IDs, roles and provenance", () => {
    const byId = new Map(PARIS_CLEANWALK_ACTORS.map((actor) => [actor.id, actor]));

    const expectedActors = [
      {
        id: "asso-gestes-propres",
        annuaireEntryId: "asso-gestes-propres",
        url: "https://www.gestespropres.com/organiser-un-cleanup",
      },
      {
        id: "asso-1",
        annuaireEntryId: "asso-1",
        organizerDirectoryId: "association-pikpik",
        url: "https://pikpik.org/",
      },
      {
        id: "asso-megots-alcome",
        annuaireEntryId: "asso-megots-alcome",
        url: "https://alcome.eco/",
      },
      {
        id: "asso-zerowaste-france",
        url: "https://www.zerowastefrance.org/lassociation/missions/",
      },
      {
        id: "asso-maison-zero-dechet",
        url: "https://lamaisonduzerodechet.org/association/",
      },
      {
        id: "asso-no-plastic-in-my-sea",
        organizerDirectoryId: "association-no-plastic-in-my-sea",
        url: "https://noplasticinmysea.org/lassociation/",
      },
      {
        id: "asso-aremacs-idf",
        url: "https://www.aremacs.com/association",
      },
      {
        id: "collectivite-syctom",
        url: "https://www.syctom-paris.fr/prevention-et-sensibilisation.html",
      },
      {
        id: "eco-organisme-citeo",
        url: "https://www.citeo.com/nous-connaitre/",
      },
    ];

    for (const expected of expectedActors) {
      const actor = byId.get(expected.id);
      expect(actor).toBeDefined();
      expect(actor?.ecosystemRoles).toContain("sensibilisation_prevention");
      expect(actor?.officialWebsite).toBe(expected.url);
      expect(actor?.provenance.sourceUrl).toBe(expected.url);
      if (expected.annuaireEntryId) {
        expect(actor?.annuaireEntryId).toBe(expected.annuaireEntryId);
      }
      if (expected.organizerDirectoryId) {
        expect(actor?.organizerDirectoryId).toBe(expected.organizerDirectoryId);
      }
    }

    // Existing actors updated with sensibilisation_prevention
    expect(byId.get("asso-surfrider-paris")?.ecosystemRoles).toContain(
      "sensibilisation_prevention",
    );
    expect(byId.get("evt-paris-nettoyages")?.ecosystemRoles).toContain(
      "sensibilisation_prevention",
    );
    expect(byId.get("asso-zerowaste-paris")?.ecosystemRoles).toContain(
      "sensibilisation_prevention",
    );
    // Zero Waste France is distinct from Zero Waste Paris
    expect(byId.get("asso-zerowaste-france")?.name).toBe("Zero Waste France");
    expect(byId.get("asso-zerowaste-paris")?.name).toBe("Zero Waste Paris");

    // Eco-organisms classified under entreprise_rse (not reseau_evenement)
    expect(byId.get("asso-megots-alcome")?.category).toBe("entreprise_rse");
    expect(byId.get("eco-organisme-citeo")?.category).toBe("entreprise_rse");
    expect(byId.get("asso-megots-alcome")?.publicContact?.url).toBe(
      "https://alcome.eco/",
    );
    expect(byId.get("asso-megots-alcome")?.provenance.secondarySourceUrl).toBe(
      "https://filieres-rep.ademe.fr/filieres-REP/filiere-TABAC",
    );

    // Pik Pik Environnement association kept distinct from PikPik Services Solidaires
    const pikpik = byId.get("asso-1");
    expect(pikpik?.publicContact?.url).toBe("https://pikpik.org/");
    expect(pikpik?.officialWebsite).not.toContain("pikpik-services-solidaires");
    expect(pikpik?.provenance.secondarySourceUrl).toBe(
      "https://www.jeveuxaider.gouv.fr/missions-benevolat/101949/benevolat-pikpik-environnement-26",
    );
    expect(
      pikpik?.publicChannels.some(
        (ch) =>
          ch.type === "plateforme_jeveuxaider" &&
          ch.url ===
            "https://www.jeveuxaider.gouv.fr/missions-benevolat/101949/benevolat-pikpik-environnement-26",
      ),
    ).toBe(true);

    // AREMACS IDF completed with Paris antenna provenance
    expect(byId.get("asso-aremacs-idf")?.provenance.secondarySourceUrl).toBe(
      "https://www.aremacs.com/antennes/paris",
    );
  });

  it("enforces funding provenance, entity scope, rounded totals and unknown shares without inventing values", () => {
    const byId = new Map(PARIS_CLEANWALK_ACTORS.map((actor) => [actor.id, actor]));

    // Complete 2025 breakdown for Zero Waste France (rounded total 99.9%)
    const zwf = byId.get("asso-zerowaste-france");
    expect(zwf?.funding?.entityName).toBe("Zero Waste France");
    expect(zwf?.funding?.period).toBe("2025");
    expect(zwf?.funding?.sharesPublished).toBe(true);
    expect(zwf?.funding?.notes).toContain("99,9 %");
    const zwfSum = (zwf?.funding?.sources ?? []).reduce(
      (acc, src) => acc + (src.sharePercent ?? 0),
      0,
    );
    expect(zwfSum).toBeCloseTo(99.9, 1);

    // Partial/unknown shares must not invent 0%
    const unknownShareIds = [
      "asso-gestes-propres",
      "asso-zerowaste-paris",
      "asso-maison-zero-dechet",
      "asso-no-plastic-in-my-sea",
      "asso-megots-alcome",
    ];
    for (const id of unknownShareIds) {
      const actor = byId.get(id);
      expect(actor?.funding).toBeDefined();
      expect(actor?.funding?.sharesPublished).toBe(false);
      expect(actor?.funding?.sources.length).toBeGreaterThan(0);
      for (const src of actor?.funding?.sources ?? []) {
        expect(src.sharePercent).toBeUndefined();
      }
      expect(actor?.funding?.sourceUrl.startsWith("https://")).toBe(true);
    }

    // Surfrider Paris must not inherit Surfrider Europe accounts
    expect(byId.get("asso-surfrider-paris")?.funding).toBeUndefined();

    // Every actor with funding must target its own entity (no national/local conflation)
    for (const actor of PARIS_CLEANWALK_ACTORS) {
      if (actor.funding) {
        expect(actor.funding.entityName).toBe(actor.name);
      }
    }
  });

  it("includes CleanMyMap as the 26th actor with civic-tech platform status and verified provenance", () => {
    const byId = new Map(PARIS_CLEANWALK_ACTORS.map((actor) => [actor.id, actor]));
    const cleanmymap = byId.get("cleanmymap");
    const cleanwalkOrg = byId.get("cleanwalk-org");

    expect(cleanmymap).toBeDefined();
    expect(cleanwalkOrg).toBeDefined();
    expect(cleanmymap?.id).not.toBe(cleanwalkOrg?.id);
    expect(cleanmymap?.name).toBe("CleanMyMap");
    expect(cleanmymap?.category).toBe("plateforme_mise_en_relation");
    expect(cleanmymap?.roles).toEqual(["relais"]);
    expect(cleanmymap?.ecosystemRoles).toEqual(["plateforme_publication"]);
    expect(cleanmymap?.publicLeader?.name).toBe("Maxence Deroome");
    expect(cleanmymap?.officialWebsite).toBe("https://cleanmymap.fr");
    expect(cleanmymap?.publicContact?.url).toBe("https://cleanmymap.fr/contact");
    expect(
      cleanmymap?.publicChannels.some(
        (ch) => ch.url === "https://cleanmymap.fr/actions/map",
      ),
    ).toBe(true);
    expect(
      cleanmymap?.publicChannels.some(
        (ch) => ch.url === "https://github.com/maxd4/CleanmyMap",
      ),
    ).toBe(true);
    expect(cleanmymap?.provenance.sourceUrl).toContain("README.md");
    expect(cleanmymap?.provenance.secondarySourceUrl).toContain("AUTHORS.md");
    expect(cleanmymap?.funding).toBeUndefined();
    expect(cleanmymap?.isCleanMyMapMember).toBe(false);
    expect(cleanmymap?.parisZone.arrondissements).toEqual([]);
  });
});
