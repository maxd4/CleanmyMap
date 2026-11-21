import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

describe("gamification action facts server import boundary", () => {
  it("imports the organizer read path without loading the server-only account verifier", async () => {
    const factsModule = await import("./gamification-action-facts");

    expect(factsModule.buildActionFacts).toBeTypeOf("function");
  });
});
