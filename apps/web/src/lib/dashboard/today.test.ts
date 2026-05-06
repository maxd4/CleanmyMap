import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import { buildPilotageOverviewFromContracts } from "@/lib/pilotage/overview";
import { buildDashboardTodayState } from "./today";

function buildOverview() {
  const older = buildActionDataContract({
    id: "action-old",
    type: "action",
    status: "approved",
    source: "actions",
    observedAt: "2026-04-10",
    createdAt: "2026-04-10T10:00:00.000Z",
    locationLabel: "Parc ancien",
    latitude: 48.85,
    longitude: 2.35,
    wasteKg: 4.2,
    volunteersCount: 3,
    durationMinutes: 45,
    actorName: "Collectif Alpha",
  });
  const latest = buildActionDataContract({
    id: "action-latest",
    type: "clean_place",
    status: "pending",
    source: "local",
    observedAt: "2026-04-20",
    createdAt: "2026-04-20T15:30:00.000Z",
    locationLabel: "Rue des Lilas",
    latitude: 48.86,
    longitude: 2.36,
    wasteKg: 12.4,
    volunteersCount: 6,
    durationMinutes: 60,
    actorName: "Collectif Beta",
  });

  return buildPilotageOverviewFromContracts({
    contracts: [older, latest],
    periodDays: 30,
    now: new Date("2026-04-30T10:00:00.000Z"),
  });
}

describe("buildDashboardTodayState", () => {
  it("builds the ready state from the latest contract", () => {
    const state = buildDashboardTodayState({
      overview: buildOverview(),
      locale: "fr",
      recommendedAction: {
        href: "/actions/new",
        label: "Déclarer une action",
        reason: "Transformer une sortie en impact mesuré.",
      },
    });

    expect(state.kind).toBe("ready");
    if (state.kind !== "ready") {
      throw new Error("Expected ready state");
    }

    expect(state.latestActivity.title).toBe("Collectif Beta");
    expect(state.latestActivity.detail).toContain("Rue des Lilas");
    expect(state.latestActivity.detail).toContain("12,4");
    expect(state.latestActivity.meta).toContain("Import local");
    expect(state.validation.title).toContain("1 en attente");
    expect(state.nextAction.href).toBe("/actions/new");
  });

  it("builds the empty state when there is no activity", () => {
    const emptyOverview = buildPilotageOverviewFromContracts({
      contracts: [],
      periodDays: 30,
      now: new Date("2026-04-30T10:00:00.000Z"),
    });

    const state = buildDashboardTodayState({
      overview: emptyOverview,
      locale: "fr",
      recommendedAction: {
        href: "/actions/new",
        label: "Déclarer une action",
        reason: "Transformer une sortie en impact mesuré.",
      },
    });

    expect(state.kind).toBe("empty");
    if (state.kind !== "empty") {
      throw new Error("Expected empty state");
    }

    expect(state.message).toContain("Aucune activité");
    expect(state.nextAction.href).toBe("/actions/new");
  });

  it("builds the error state when the overview is unavailable", () => {
    const state = buildDashboardTodayState({
      overview: null,
      locale: "en",
      recommendedAction: {
        href: "/actions/new",
        label: "Declare an action",
        reason: "Turn a field visit into measured impact.",
      },
      errorMessage: "No dashboard data.",
    });

    expect(state.kind).toBe("error");
    if (state.kind !== "error") {
      throw new Error("Expected error state");
    }

    expect(state.message).toBe("No dashboard data.");
    expect(state.nextAction.title).toBe("Declare an action");
  });
});
