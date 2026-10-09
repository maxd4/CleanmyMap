import { describe, expect, it } from "vitest";
import type { ActionEditorRecord } from "@/lib/actions/http";
import { buildBeforeActionFormFromAction } from "./use-before-action-workflow";

describe("before-action resume hydration", () => {
  it("rehydrates organizers and participants from the authorized action payload", () => {
    const action = {
      actionPhase: "pre_action",
      preparationData: null,
      actorName: "Maxence",
      associationName: "Association locale",
      organizerType: "association",
      organizerId: "directory-association",
      organizerName: "Association locale",
      organizerAccounts: ["user-organizer", "user-organizer"],
      actionDate: "2026-10-09",
      locationLabel: "Paris",
      departureLocationLabel: null,
      arrivalLocationLabel: null,
      eventStartTime: null,
      eventEndTime: null,
      volunteersCount: 2,
      durationMinutes: 60,
      groupJoinEnabled: false,
      participantAccounts: ["user-participant"],
    } as ActionEditorRecord;

    const form = buildBeforeActionFormFromAction({
      action,
      resolvedDefaultActorName: "fallback",
      initialRecordType: "action",
    });

    expect(form.organizerAccounts).toBe("user-organizer");
    expect(form.participantAccounts).toEqual(["user-participant"]);
  });
});
