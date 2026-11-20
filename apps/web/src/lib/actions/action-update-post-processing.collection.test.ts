import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { shouldReconcileParticipantImpact } from "./action-update-post-processing";

describe("action update progression invalidation", () => {
  it("reconciles participant impact when aggregate collectors change", () => {
    expect(shouldReconcileParticipantImpact({ collectors_count: 12 }, {} as never)).toBe(true);
  });

  it("continues to reconcile participant roster and collective measurement changes", () => {
    expect(shouldReconcileParticipantImpact({}, { participantAccounts: [] } as never)).toBe(true);
    expect(shouldReconcileParticipantImpact({ waste_kg: 100 }, {} as never)).toBe(true);
    expect(shouldReconcileParticipantImpact({ cigarette_butts: 50 }, {} as never)).toBe(true);
  });
});
