import { describe, expect, it } from "vitest";
import type { CreateActionPayload } from "./types";
import { buildActionInsertPayload, buildCreateActionGeometry } from "./store-create-contract";

function buildPayload(overrides: Partial<CreateActionPayload> = {}): CreateActionPayload {
  return {
    actionDate: "2026-10-29",
    locationLabel: "Paris",
    wasteKg: 1,
    cigaretteButts: 0,
    volunteersCount: 15,
    durationMinutes: 60,
    ...overrides,
  };
}

function buildRow(payload: CreateActionPayload = buildPayload(), userId = "creator-1") {
  return buildActionInsertPayload({
    userId,
    payload,
    persistedGeometry: buildCreateActionGeometry(payload, null),
    finalDrawing: null,
    status: "pending",
  });
}

describe("action context create persistence contract", () => {
  it("persists automatic school for 11 children out of 15", () => {
    expect(buildRow(buildPayload({
      actionPhase: "post_action_complete",
      volunteerParticipation: {
        childrenCount: 11,
        adultCount: 4,
        retiredCount: 0,
        participantsCount: 15,
        effectiveVolunteerUnits: 15,
        effectiveVolunteerUnitsFormulaVersion: "participants-v1",
      },
    }))).toMatchObject({
      action_context: "school",
      action_context_source: "automatic_children_ratio",
      school_context_confirmed: null,
      school_context_confirmed_at: null,
      school_context_confirmed_by_clerk_id: null,
      children_count: 11,
      adult_count: 4,
      retired_count: 0,
    });
  });

  it("does not activate school at exactly 10 children out of 15", () => {
    expect(buildRow(buildPayload({
      volunteerParticipation: {
        childrenCount: 10,
        adultCount: 5,
        retiredCount: 0,
        participantsCount: 15,
        effectiveVolunteerUnits: 15,
        effectiveVolunteerUnitsFormulaVersion: "participants-v1",
      },
    }))).toMatchObject({
      action_context: "citizen",
      action_context_source: "automatic_children_ratio",
    });
  });

  it.each([
    ["citizen", "citizen"],
    ["company", "company"],
    ["school", "school"],
  ] as const)("keeps explicit %s independent from composition", (context, expectedContext) => {
    expect(buildRow(buildPayload({
      actionContext: context,
      volunteerParticipation: {
        childrenCount: 15,
        adultCount: 0,
        retiredCount: 0,
        participantsCount: 15,
        effectiveVolunteerUnits: 15,
        effectiveVolunteerUnitsFormulaVersion: "participants-v1",
      },
    }))).toMatchObject({
      action_context: expectedContext,
      action_context_source: "explicit",
    });
  });

  it("attaches explicit school confirmation to the authenticated creator", () => {
    const row = buildRow(buildPayload({ actionContext: "school" }), "creator-42");
    expect(row).toMatchObject({
      school_context_confirmed: true,
      school_context_confirmed_by_clerk_id: "creator-42",
    });
    expect(typeof row.school_context_confirmed_at).toBe("string");
  });

  it("keeps an unknown pre-action composition unclassified", () => {
    expect(buildRow(buildPayload({
      actionPhase: "pre_action",
      volunteerParticipation: null,
      actionContext: undefined,
    }))).toMatchObject({
      action_context: null,
      action_context_source: null,
      school_context_confirmed: null,
    });
  });
});
