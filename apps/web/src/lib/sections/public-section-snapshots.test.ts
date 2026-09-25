import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const fetchUnifiedActionContractsMock = vi.hoisted(() => vi.fn());
const toPublicActionListItemMock = vi.hoisted(() => vi.fn());
const toPublicActionMapItemMock = vi.hoisted(() => vi.fn());
const buildActionInsightsMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/actions/unified-source", () => ({
  fetchUnifiedActionContracts: fetchUnifiedActionContractsMock,
}));
vi.mock("@/lib/actions/data-contract", () => ({
  toPublicActionListItem: toPublicActionListItemMock,
  toPublicActionMapItem: toPublicActionMapItemMock,
}));
vi.mock("@/lib/actions/insights", () => ({
  buildActionInsights: buildActionInsightsMock,
}));
vi.mock("@/lib/actions/map/map-route", () => ({
  isPublicMapContract: () => true,
  toPublicMapContract: (contract: unknown) => contract,
}));

import { loadPublicSectionInitialData } from "./public-section-snapshots";

describe("public section SSR snapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseServerClientMock.mockReturnValue({});
    buildActionInsightsMock.mockReturnValue({});
    fetchUnifiedActionContractsMock.mockResolvedValue({
      items: [{ id: "action-1", type: "action", status: "approved" }],
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions"],
        warnings: [],
      },
    });
    toPublicActionListItemMock.mockReturnValue({
      id: "action-1",
      action_date: "2026-09-25",
      waste_kg: 2,
      cigarette_butts: 4,
      volunteers_count: 3,
      duration_minutes: 45,
      geometry_kind: "point",
      created_by_clerk_id: "must-not-escape",
      notes: "private note",
      contract: {
        createdByClerkId: "must-not-escape",
        geometry: { kind: "point", coordinates: [[2.3, 48.8]] },
        metadata: {
          volunteerParticipation: null,
          photos: [{ dataUrl: "private-photo" }],
        },
      },
    });
    toPublicActionMapItemMock.mockReturnValue({
      id: "action-1",
      geometry_kind: "point",
      created_by_clerk_id: "must-not-escape",
      contract: {
        createdByClerkId: "must-not-escape",
        geometry: { kind: "point" },
      },
    });
  });

  it("passes bounded public projections to the client without private fields", async () => {
    const initialData = await loadPublicSectionInitialData("recycling");
    const serialized = JSON.stringify(initialData);

    expect(initialData?.recycling?.actions?.items).toHaveLength(1);
    expect(initialData?.recycling?.map?.items).toHaveLength(1);
    expect(initialData?.recycling?.breakdown).toBeNull();
    expect(serialized).not.toContain("must-not-escape");
    expect(serialized).not.toContain("private note");
    expect(serialized).not.toContain("private-photo");
    expect(fetchUnifiedActionContractsMock).toHaveBeenCalledTimes(2);
  });

  it("does not invent an empty snapshot when the public source fails", async () => {
    fetchUnifiedActionContractsMock.mockRejectedValueOnce(new Error("unavailable"));

    await expect(loadPublicSectionInitialData("climate")).resolves.toBeUndefined();
  });
});
