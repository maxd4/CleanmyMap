import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actionMock = vi.hoisted(() => vi.fn());
const qualityMock = vi.hoisted(() => vi.fn());
const progressionMock = vi.hoisted(() => vi.fn());

vi.mock("./progression-data", async () => {
  const actual = await vi.importActual<typeof import("./progression-data")>("./progression-data");
  return { ...actual, fetchActionById: actionMock, actionQualityScoreFromRow: qualityMock };
});
vi.mock("./progression-user", () => ({ getUserProgression: progressionMock }));

import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import { buildPostActionRetentionLoop } from "./progression-retention";

function action(id: string, notes: string | null = "Action locale") {
  return {
    id,
    created_at: "2026-10-01T10:00:00.000Z",
    created_by_clerk_id: "user-1",
    actor_name: id === "blank" ? " " : "Alice",
    action_date: "2026-10-01",
    location_label: "Parc test",
    latitude: 48,
    longitude: 2,
    waste_kg: id === "unknown-mass" ? null : 2.35,
    cigarette_butts: id === "unknown-mass" ? null : 12,
    volunteers_count: 2,
    duration_minutes: 60,
    status: "approved" as const,
    notes,
  };
}

function supabaseFor(events: unknown, error: unknown = null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.eq.mockImplementationOnce(() => query).mockImplementationOnce(() => query).mockImplementationOnce(() => ({
    data: events,
    error,
  }));
  return { from: vi.fn(() => query) } as unknown as SupabaseClient;
}

function progression(collectiveEvents: number) {
  return {
    currentLevel: 3,
    nextLevel: {
      requirements: {
        current: { collectiveEvents },
        thresholds: { minCollectiveEvents: 2 },
      },
    },
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  actionMock.mockResolvedValue(action("default"));
  qualityMock.mockReturnValue(75);
  progressionMock.mockResolvedValue(progression(2));
});

describe("post-action retention loop", () => {
  it("returns null when the source action is inaccessible", async () => {
    actionMock.mockResolvedValue(null);
    await expect(buildPostActionRetentionLoop(supabaseFor([]), { userId: "user-1", actionId: "missing" }))
      .resolves.toBeNull();
    expect(progressionMock).not.toHaveBeenCalled();
  });

  it("sums only positive validated XP and never attributes a badge from a current snapshot", async () => {
    actionMock.mockResolvedValue(action("unknown-mass", appendActionMetadataToNotes("Action", {
      associationName: "Action spontanée",
    })));
    qualityMock.mockReturnValue(85);
    const result = await buildPostActionRetentionLoop(supabaseFor([
      { status_phase: "validated", xp_awarded: 1.25 },
      { status_phase: "pending", xp_awarded: 9 },
      { status_phase: "validated", xp_awarded: -2 },
      { status_phase: "validated", xp_awarded: "invalid" },
    ]), { userId: "user-1", actionId: "unknown-mass" });

    expect(result).toMatchObject({
      xpAwarded: 1.25,
      badge: null,
      thanksMessage: expect.stringContaining("Action spontanée remercie Alice"),
      nextActionSuggestion: expect.stringContaining("itineraire IA"),
    });
    expect(result?.summary).toContain("masse de déchets non renseignée");
  });

  it("selects collective, quality and actor fallbacks in the copy", async () => {
    actionMock.mockResolvedValue(action("blank", "Action libre"));
    qualityMock.mockReturnValue(55);
    progressionMock.mockResolvedValue(progression(0));
    const collective = await buildPostActionRetentionLoop(supabaseFor([{ status_phase: "validated", xp_awarded: 2 }]), {
      userId: "user-1", actionId: "blank",
    });
    expect(collective?.nextActionSuggestion).toContain("action collective");
    expect(collective?.thanksMessage).toContain("Contributeur");

    progressionMock.mockResolvedValue(progression(2));
    const qualityC = await buildPostActionRetentionLoop(supabaseFor([]), {
      userId: "user-1", actionId: "blank",
    });
    expect(qualityC?.nextActionSuggestion).toContain("geolocalisation");
  });

  it("falls back to zero XP when the event read fails", async () => {
    const result = await buildPostActionRetentionLoop(supabaseFor(null, { message: "read failed" }), {
      userId: "user-1", actionId: "default",
    });
    expect(result?.xpAwarded).toBe(0);
  });
});
