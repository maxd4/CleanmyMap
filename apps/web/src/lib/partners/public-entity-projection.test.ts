import { describe, expect, it } from "vitest";
import { projectPublicEntity } from "./public-entity-projection";

describe("projectPublicEntity", () => {
  it("projects unified public identity, limits, sources, and exact relations for World Cleanup Day France", () => {
    const projection = projectPublicEntity({ networkActorId: "world-cleanup-day-france" });
    expect(projection).not.toBeNull();
    expect(projection?.identity.networkActorId).toBe("world-cleanup-day-france");
    expect(projection?.limits.length).toBeGreaterThan(0);
    expect(projection?.sources.length).toBeGreaterThan(0);
    expect(projection?.relations.length).toBeGreaterThan(0);
    expect(
      projection?.relations.some(
        (r) => r.sourceId === "megothon" || r.targetId === "megothon",
      ),
    ).toBe(true);
  });

  it("projects institution-only nodes with their own territories, relations, and sources", () => {
    const fromInst = projectPublicEntity({ institutionId: "town-hall-05" });
    const fromNet = projectPublicEntity({ networkActorId: "mairie-paris-5" });
    expect(fromInst).not.toBeNull();
    expect(fromNet).not.toBeNull();
    expect(fromInst?.identity.institutionId).toBe("town-hall-05");
    expect(fromNet?.identity.institutionId).toBe("town-hall-05");
    expect(fromNet?.institutionRelations).toEqual(fromInst?.institutionRelations);
    expect(fromNet?.institutionSources).toEqual(fromInst?.institutionSources);
  });

  it("fails closed on conflicting canonical IDs including institutionId without network link", () => {
    expect(
      projectPublicEntity({
        annuaireEntryId: "asso-1",
        networkActorId: "asso-megots-alcome",
      }),
    ).toBeNull();
    expect(
      projectPublicEntity({
        institutionId: "division-17",
        annuaireEntryId: "asso-3",
      }),
    ).toBeNull();
  });

  it("returns null for unknown identities without name-based fallback", () => {
    expect(projectPublicEntity({ networkActorId: "non-existent-actor" })).toBeNull();
    expect(projectPublicEntity({ institutionId: "non-existent-node" })).toBeNull();
  });

  it("preserves legitimate scope differences without leaking private institutional fields", () => {
    const projection = projectPublicEntity({ annuaireEntryId: "asso-3" });
    expect(projection).not.toBeNull();
    expect(projection?.identity.annuaireEntryId).toBe("asso-3");
    expect(JSON.stringify(projection)).not.toContain("revalidationStatus");
    expect(JSON.stringify(projection)).not.toContain("isPubliclyPublishable");
  });
});
