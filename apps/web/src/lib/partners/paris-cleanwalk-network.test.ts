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
  it("includes all 16 required Paris ecosystem actors and platforms with unique IDs", () => {
    const ids = PARIS_CLEANWALK_ACTORS.map((actor) => actor.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PARIS_CLEANWALK_ACTORS).toHaveLength(16);

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

  it("contains the documented relations with valid actors, distinct publie_sur vs action_commune, and sources", () => {
    const actorIds = new Set(PARIS_CLEANWALK_ACTORS.map((actor) => actor.id));
    for (const relation of PARIS_CLEANWALK_RELATIONS) {
      expect(actorIds.has(relation.sourceId)).toBe(true);
      expect(actorIds.has(relation.targetId)).toBe(true);
      expect(isSafeHttpUrl(relation.source.url)).toBe(true);
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
});
