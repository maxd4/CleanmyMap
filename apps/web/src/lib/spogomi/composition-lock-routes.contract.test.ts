import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const moveRoute = readFileSync(new URL("../../app/api/spogomi/events/[eventId]/teams/move/route.ts", import.meta.url), "utf8");
const lockRoute = readFileSync(new URL("../../app/api/spogomi/events/[eventId]/teams/lock/route.ts", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../../components/spogomi/spogomi-preparation-workspace.tsx", import.meta.url), "utf8");

describe("SPOGOMI composition mutation STATIC_CONTRACT", () => {
  it("passes the current revision and organizer actor to both mutation services", () => {
    expect(moveRoute).toContain("expectedRevision");
    expect(moveRoute).toContain("actorClerkId: access.userId");
    expect(lockRoute).toContain("expectedRevision");
    expect(lockRoute).toContain("access.userId");
  });

  it("exposes an explicit arbitration refusal and disables ordinary moves outside preparation", () => {
    expect(moveRoute).toContain("SpogomiCompositionProtectionError");
    expect(lockRoute).toContain("SpogomiCompositionProtectionError");
    expect(workspace).toContain("Une absence ou un remplacement nécessite une procédure d’arbitrage versionnée");
    expect(workspace).toContain("!compositionEditable");
    expect(workspace).toContain("expectedRevision: data.event.composition_revision ?? 0");
  });
});
