import { describe, expect, it } from "vitest";
import { projectPublicEntity } from "./public-entity-projection";
import { PARIS_CLEANWALK_ACTORS } from "./paris-cleanwalk-network";
import { PARIS_PUBLIC_CLEANLINESS_DATASET } from "./public-cleanliness-organization";
import type { PublishedAnnuaireEntry } from "./annuaire-types";

describe("complete public entity projection", () => {
  it("retains every existing network actor and its documented activities, means and channels", () => {
    for (const actor of PARIS_CLEANWALK_ACTORS) {
      const p = projectPublicEntity({ networkActorId: actor.id });
      expect(p?.publicActor?.activities).toEqual(actor.activities);
      expect(p?.publicActor?.equipmentAvailability).toEqual(actor.equipmentAvailability);
      expect(p?.publicActor?.participationModalities).toEqual(actor.participationModalities);
      expect(p?.publicActor?.funding).toEqual(actor.funding);
    }
  });
  it("retains each institutional node, its incident links and their sources", () => {
    for (const node of PARIS_PUBLIC_CLEANLINESS_DATASET.nodes) {
      const p = projectPublicEntity({ institutionId: node.id });
      expect(p?.institution?.id).toBe(node.id);
      for (const edge of p?.institutionRelations ?? []) {
        expect(edge.from === node.id || edge.to === node.id).toBe(true);
        for (const id of edge.sourceIds) expect(p?.institutionSources.some(source => source.id === id)).toBe(true);
      }
    }
  });
  it("keeps parity for explicitly identical entities", () => {
    expect(projectPublicEntity({ institutionId: "town-hall-05" })).toEqual(projectPublicEntity({ networkActorId: "mairie-paris-5" }));
  });
  it("projects an authorized published entry without administrative fields or name inference", () => {
    const entry: PublishedAnnuaireEntry = {
      id: "published-test", name: "Syctom", legalIdentity: "Fixture", kind: "association",
      types: [], description: "Public description", location: "Paris", lat: null, lng: null,
      coveredArrondissements: [], contributionTypes: [], availability: "Declared",
      provenance: "published_partner", verificationStatus: "en_cours", qualificationStatus: "contact_non_qualifie",
      lastUpdatedAt: "2026-11-25", internalAdminContact: { referentName: "PRIVATE_NAME", email: "private@example.invalid", phone: "PRIVATE_PHONE" },
    };
    const p = projectPublicEntity({ annuaireEntryId: entry.id }, entry);
    expect(p?.directoryEntry?.description).toBe("Public description");
    expect(p?.identity.networkActorId).toBeNull();
    expect(JSON.stringify(p)).not.toMatch(/PRIVATE_NAME|PRIVATE_PHONE|private@example.invalid|internalAdminContact/);
    expect(projectPublicEntity({ annuaireEntryId: "asso-3" }, entry)).toBeNull();
  });
});
