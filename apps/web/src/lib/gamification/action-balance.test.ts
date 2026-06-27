import { expect, it } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import {
  computeActionBalanceCounts,
  computeActionBalanceSummary,
  getActionBalanceContext,
} from "./action-balance";

function makeAction(params: {
  id: string;
  createdAt: string;
  actionDate?: string;
  status?: "pending" | "approved" | "rejected";
  associationName: string;
}): {
  id: string;
  created_at: string;
  created_by_clerk_id: string;
  actor_name: string;
  action_date: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  waste_kg: number;
  cigarette_butts: number;
  volunteers_count: number;
  duration_minutes: number;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  manual_drawing: null;
} {
  return {
    id: params.id,
    created_at: params.createdAt,
    created_by_clerk_id: "user-1",
    actor_name: "Alice",
    action_date: params.actionDate ?? params.createdAt.slice(0, 10),
    location_label: "France",
    latitude: null,
    longitude: null,
    waste_kg: 1,
    cigarette_butts: 10,
    volunteers_count: 2,
    duration_minutes: 45,
    status: params.status ?? "approved",
    notes: appendActionMetadataToNotes("Action", {
      associationName: params.associationName,
    }),
    manual_drawing: null,
  };
}

function isoAtMinuteOffset(minutesOffset: number): string {
  return new Date(Date.UTC(2026, 5, 1, 8, 0, 0) + minutesOffset * 60_000).toISOString();
}

it("classifies the three expected contexts", () => {
  expect(
    getActionBalanceContext({
      notes: appendActionMetadataToNotes("A", { associationName: "Action spontanée" }),
    }),
  ).toBe("spontaneous");
  expect(
    getActionBalanceContext({
      notes: appendActionMetadataToNotes("A", { associationName: "La Brigade Verte France" }),
    }),
  ).toBe("association");
  expect(
    getActionBalanceContext({
      notes: appendActionMetadataToNotes("A", { associationName: "Entreprise - ACME" }),
    }),
  ).toBe("enterprise");
});

it("awards XP by completed cycles, resets the cycle, and increases the next requirement", () => {
  const rows = [
    makeAction({
      id: "s-1",
      createdAt: "2026-06-01T08:00:00.000Z",
      associationName: "Action spontanée",
    }),
    makeAction({
      id: "a-1",
      createdAt: "2026-06-01T08:05:00.000Z",
      associationName: "Association Exemple",
    }),
    makeAction({
      id: "e-1",
      createdAt: "2026-06-01T08:10:00.000Z",
      associationName: "Entreprise - ACME",
    }),
    makeAction({
      id: "s-2",
      createdAt: "2026-06-01T09:00:00.000Z",
      associationName: "Action spontanée",
    }),
    makeAction({
      id: "a-2",
      createdAt: "2026-06-01T09:05:00.000Z",
      associationName: "Association Exemple",
    }),
    makeAction({
      id: "e-2",
      createdAt: "2026-06-01T09:10:00.000Z",
      associationName: "Entreprise - ACME",
    }),
    makeAction({
      id: "s-3",
      createdAt: "2026-06-01T09:15:00.000Z",
      associationName: "Action spontanée",
    }),
    makeAction({
      id: "a-3",
      createdAt: "2026-06-01T09:20:00.000Z",
      associationName: "Association Exemple",
    }),
    makeAction({
      id: "e-3",
      createdAt: "2026-06-01T09:25:00.000Z",
      associationName: "Entreprise - ACME",
    }),
  ];

  const validated = new Set(rows.map((row) => row.id));
  const summary = computeActionBalanceSummary(rows, validated);

  expect(summary.spontaneous).toBe(0);
  expect(summary.association).toBe(0);
  expect(summary.enterprise).toBe(0);
  expect(summary.totalValidated).toBe(9);
  expect(summary.balancedCycles).toBe(2);
  expect(summary.totalXpAwarded).toBe(3);
  expect(summary.currentCycleTarget).toBe(3);
  expect(summary.currentCycleXpReward).toBe(3);
  expect(summary.currentCycleProgress).toBe(0);
  expect(summary.missingCounts).toEqual({
    spontaneous: 3,
    association: 3,
    enterprise: 3,
  });
  expect(summary.currentGrade.label).toBe("Topaze");
  expect(summary.nextGrade?.label).toBe("Saphir");
  expect(summary.progressPercent).toBe(0);
  expect(summary.awards.map((award) => award.xpAwarded)).toEqual([1, 2]);
});

it("ignores rejected or unvalidated actions", () => {
  const rows = [
    makeAction({
      id: "s-1",
      createdAt: "2026-06-01T08:00:00.000Z",
      associationName: "Action spontanée",
    }),
    makeAction({
      id: "a-1",
      createdAt: "2026-06-01T08:05:00.000Z",
      associationName: "Association Exemple",
    }),
    makeAction({
      id: "e-1",
      createdAt: "2026-06-01T08:10:00.000Z",
      associationName: "Entreprise - ACME",
    }),
    makeAction({
      id: "s-2",
      createdAt: "2026-06-01T09:00:00.000Z",
      associationName: "Action spontanée",
    }),
    makeAction({
      id: "a-2",
      createdAt: "2026-06-01T09:05:00.000Z",
      associationName: "Association Exemple",
      status: "approved",
    }),
    makeAction({
      id: "e-2",
      createdAt: "2026-06-01T09:10:00.000Z",
      associationName: "Entreprise - ACME",
      status: "rejected",
    }),
  ];

  const validated = new Set(["s-1", "a-1", "e-1"]);
  const summary = computeActionBalanceCounts(rows, validated);

  expect(summary.balancedCycles).toBe(1);
  expect(summary.totalXpAwarded).toBe(1);
  expect(summary.currentCycleTarget).toBe(2);
  expect(summary.currentCycleProgress).toBe(0);
  expect(summary.missingCounts).toEqual({
    spontaneous: 2,
    association: 2,
    enterprise: 2,
  });
  expect(summary.currentGrade.label).toBe("Quartz");
  expect(summary.nextGrade?.label).toBe("Topaze");
});

it("continues as pilier grades after the last gem grade", () => {
  const rows: Array<ReturnType<typeof makeAction>> = [];
  let minuteOffset = 0;

  for (let cycleIndex = 0; cycleIndex < 25; cycleIndex += 1) {
    const target = cycleIndex + 1;
    for (let repeat = 0; repeat < target; repeat += 1) {
      rows.push(
        makeAction({
          id: `s-${cycleIndex}-${repeat}`,
          createdAt: isoAtMinuteOffset(minuteOffset),
          associationName: "Action spontanée",
        }),
      );
      minuteOffset += 1;
      rows.push(
        makeAction({
          id: `a-${cycleIndex}-${repeat}`,
          createdAt: isoAtMinuteOffset(minuteOffset),
          associationName: "Association Exemple",
        }),
      );
      minuteOffset += 1;
      rows.push(
        makeAction({
          id: `e-${cycleIndex}-${repeat}`,
          createdAt: isoAtMinuteOffset(minuteOffset),
          associationName: "Entreprise - ACME",
        }),
      );
      minuteOffset += 1;
    }
  }

  const validated = new Set(rows.map((row) => row.id));
  const summary = computeActionBalanceSummary(rows, validated);

  expect(summary.balancedCycles).toBe(25);
  expect(summary.totalXpAwarded).toBe(325);
  expect(summary.currentGrade.label).toBe("Pilier III");
  expect(summary.nextGrade?.label).toBe("Pilier IV");
});
