import { describe, expect, it } from "vitest";
import { projectPublicEntity } from "./public-entity-projection";

describe("projectPublicEntity", () => {
  it("projects unified public identity, limits, and sources for an explicit canonical actor", () => {
    const projection = projectPublicEntity({ networkActorId: "asso-megots-alcome" });
    expect(projection).not.toBeNull();
    expect(projection?.identity.networkActorId).toBe("asso-megots-alcome");
    expect(projection?.limits.length).toBeGreaterThan(0);
    expect(projection?.sources.length).toBeGreaterThan(0);
    expect(Array.isArray(projection?.relations)).toBe(true);
  });

  it("fails closed on conflicting canonical IDs", () => {
    const projection = projectPublicEntity({
      annuaireEntryId: "asso-1",
      networkActorId: "asso-megots-alcome",
    });
    expect(projection).toBeNull();
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
