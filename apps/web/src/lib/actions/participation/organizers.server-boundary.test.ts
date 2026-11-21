import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn() }));

describe("organizer read import boundary", () => {
  it("keeps persisted organizer reads importable without loading the server-only verifier", async () => {
    const organizers = await import("./organizers");

    expect(organizers.loadCanonicalActionOrganizerIdsForAction).toBeTypeOf("function");
    expect(organizers.resolveDefaultActionOrganizerIds).toBeTypeOf("function");
  });
});
