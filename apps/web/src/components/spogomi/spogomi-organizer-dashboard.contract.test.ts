import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./spogomi-organizer-dashboard.tsx", import.meta.url), "utf8");

describe("SPOGOMI organizer creation contract", () => {
  it("uses the existing authenticated API with user-entered dates and idempotency", () => {
    expect(source).toContain('fetch("/api/spogomi/events"');
    expect(source).toContain('method: "POST"');
    expect(source).toContain("reuseOrCreateSpogomiCreationAttempt");
    expect(source).toContain("creationAttemptRef.current = null");
    expect(source).toContain("startsAtDate.toISOString()");
    expect(source).toContain("router.refresh()");
    expect(source).not.toContain("publicVisibility");
  });

  it("keeps public navigation conditional on publication", () => {
    expect(source).toContain('event.public_visibility === "published"');
    expect(source).toContain("Voir la page publique");
    expect(source).toContain("Gérer cette compétition");
  });
});
