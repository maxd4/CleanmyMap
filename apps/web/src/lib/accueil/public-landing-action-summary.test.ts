import { describe, expect, it, vi } from "vitest";
import { PUBLIC_IMPACT_PROJECTION_VERSION } from "@/lib/impact/scientific-projection-versions";

const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => ({ rpc: rpcMock }),
}));

import {
  advancePublicImpactActionState,
  loadIncrementalPublicLandingActionSummary,
  rebuildPublicImpactActionState,
} from "./public-landing-action-summary";

describe("public incremental impact projection contract", () => {
  it("passes the current methodology version to both state transitions", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await advancePublicImpactActionState("2026-09-08");
    await rebuildPublicImpactActionState("2026-09-08");

    expect(rpcMock).toHaveBeenNthCalledWith(
      1,
      "advance_public_impact_action_state",
      {
        p_floor_date: "2026-09-08",
        p_methodology_version: PUBLIC_IMPACT_PROJECTION_VERSION,
      },
    );
    expect(rpcMock).toHaveBeenNthCalledWith(
      2,
      "rebuild_public_impact_action_state",
      {
        p_floor_date: "2026-09-08",
        p_methodology_version: PUBLIC_IMPACT_PROJECTION_VERSION,
      },
    );
  });

  it("does not expose an aggregate returned by an incompatible state", async () => {
    rpcMock.mockResolvedValue({
      data: [{
        visible_actions: 1,
        distinct_locations: 1,
        participants_total: 0,
        volunteers: 0,
        participants_known_actions: 0,
        participants_action_count: 0,
        total_duration_minutes: 0,
        waste_kg: null,
        waste_source_count: 0,
        cigarette_butts: 0,
        methodology_version: "impact-terrain-public-2026.09-v2",
      }],
      error: null,
    });

    await expect(loadIncrementalPublicLandingActionSummary()).rejects.toThrow(
      "Incremental landing action summary returned no row.",
    );
  });
});
