import { describe, expect, it } from "vitest";
import { appendActionMetadataToNotes } from "@/lib/actions/metadata";
import {
  computeActionBalanceCounts,
  computeActionBalanceSummary,
  getActionBalanceContext,
} from "./action-balance";

function makeAction(params: {
  id: string;
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
    created_at: "2026-06-01T10:00:00Z",
    created_by_clerk_id: "user-1",
    actor_name: "Alice",
    action_date: "2026-06-01",
    location_label: "Paris",
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

describe("action balance badge", () => {
  it("classifies the three expected contexts", () => {
    expect(getActionBalanceContext({ notes: appendActionMetadataToNotes("A", { associationName: "Action spontanée" }) })).toBe("spontaneous");
    expect(getActionBalanceContext({ notes: appendActionMetadataToNotes("A", { associationName: "La Brigade Verte Paris" }) })).toBe("association");
    expect(getActionBalanceContext({ notes: appendActionMetadataToNotes("A", { associationName: "Entreprise - ACME" }) })).toBe("enterprise");
  });

  it("counts only validated approved actions and balances by the weakest context", () => {
    const rows = [
      makeAction({ id: "a1", associationName: "Action spontanée" }),
      makeAction({ id: "a2", associationName: "La Brigade Verte Paris" }),
      makeAction({ id: "a3", associationName: "Entreprise - ACME" }),
      makeAction({ id: "a4", associationName: "Action spontanée", status: "pending" }),
      makeAction({ id: "a5", associationName: "Entreprise - ACME", status: "rejected" }),
      makeAction({ id: "a6", associationName: "La Brigade Verte Paris" }),
      makeAction({ id: "a7", associationName: "La Brigade Verte Paris" }),
      makeAction({ id: "a8", associationName: "Entreprise - ACME" }),
    ];

    const summary = computeActionBalanceSummary(rows, new Set(["a1", "a2", "a3", "a6", "a7", "a8"]));

    expect(summary.spontaneous).toBe(1);
    expect(summary.association).toBe(3);
    expect(summary.enterprise).toBe(2);
    expect(summary.balancedCycles).toBe(1);
    expect(summary.currentGrade.label).toBe("Quartz");
    expect(summary.nextGrade?.label).toBe("Topaze");
    expect(summary.progressPercent).toBe(0);
  });

  it("progresses through gem grades then pilier grades", () => {
    const rows = [
      ...Array.from({ length: 3 }, (_, index) => makeAction({ id: `s-${index}`, associationName: "Action spontanée" })),
      ...Array.from({ length: 3 }, (_, index) => makeAction({ id: `a-${index}`, associationName: "Association Exemple" })),
      ...Array.from({ length: 3 }, (_, index) => makeAction({ id: `e-${index}`, associationName: "Entreprise - ACME" })),
      ...Array.from({ length: 22 }, (_, index) => makeAction({ id: `extra-${index}`, associationName: "Action spontanée" })),
    ];

    const validated = new Set(rows.map((row) => row.id));
    const summary = computeActionBalanceCounts(rows, validated);
    expect(summary.balancedCycles).toBe(3);

    const nextSummary = computeActionBalanceSummary(rows, validated);
    expect(nextSummary.currentGrade.label).toBe("Topaze");
    expect(nextSummary.nextGrade?.label).toBe("Saphir");
  });

  it("continues as pilier grades after the last gem grade", () => {
    const rows = [
      ...Array.from({ length: 25 }, (_, index) => makeAction({ id: `s-${index}`, associationName: "Action spontanée" })),
      ...Array.from({ length: 25 }, (_, index) => makeAction({ id: `a-${index}`, associationName: "Association Exemple" })),
      ...Array.from({ length: 25 }, (_, index) => makeAction({ id: `e-${index}`, associationName: "Entreprise - ACME" })),
    ];
    const validated = new Set(rows.map((row) => row.id));
    const summary = computeActionBalanceSummary(rows, validated);

    expect(summary.balancedCycles).toBe(25);
    expect(summary.currentGrade.label).toBe("Pilier II");
    expect(summary.nextGrade?.label).toBe("Pilier III");
  });
});
