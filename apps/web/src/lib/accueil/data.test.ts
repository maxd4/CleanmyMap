import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import {
  buildHomeCommunityActivity,
  computeLandingCounters,
  formatLandingOverviewErrorMessage,
} from "./data";

function makeContract(
  id: string,
  status: "pending" | "approved" | "rejected",
  wasteKg: number,
) {
  return buildActionDataContract({
    id,
    type: "action",
    status,
    source: "web_form",
    observedAt: "2026-04-10",
    createdAt: "2026-04-10T08:00:00.000Z",
    locationLabel: `Paris ${id}`,
    latitude: 48.87,
    longitude: 2.35,
    actorName: `Bénévole ${id}`,
    wasteKg,
    cigaretteButts: wasteKg * 10,
    volunteersCount: wasteKg,
  });
}

describe("accueil data", () => {
  it("builds landing counters only from approved actions", () => {
    const counters = computeLandingCounters(
      [
        makeContract("approved", "approved", 10),
        makeContract("pending", "pending", 99),
        makeContract("rejected", "rejected", 88),
      ],
      "2026-01-01",
    );

    expect(counters.wasteKg).toBe(10);
    expect(counters.butts).toBe(100);
    expect(counters.volunteers).toBe(10);
  });

  it("builds community activity only from approved actions", () => {
    const activity = buildHomeCommunityActivity(
      [
        makeContract("approved", "approved", 10),
        makeContract("pending", "pending", 99),
      ],
      "2026-01-01",
    );

    expect(activity.visibleActions).toBe(1);
    expect(activity.items).toHaveLength(1);
    expect(activity.items[0]?.id).toBe("approved");
  });

  it("formats a clear landing overview error message", () => {
    expect(
      formatLandingOverviewErrorMessage(new Error("Database timeout")),
    ).toBe("Supabase est momentanément indisponible. Database timeout");
    expect(formatLandingOverviewErrorMessage("boom")).toBe(
      "Supabase est momentanément indisponible. Réessaie dans un instant.",
    );
  });
});
