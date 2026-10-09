import { describe, expect, it } from "vitest";
import type { ActionEditorRecord } from "@/lib/actions/http";
import { buildBeforeActionFormFromAction, buildBeforeActionInitialForm } from "./use-before-action-workflow";

describe("before-action resume hydration", () => {
  it("starts with no forecast or demographic defaults", () => {
    const form = buildBeforeActionInitialForm(["Maxence"], "Maxence", "action");

    expect(form.volunteersCount).toBe("");
    expect(form.childrenCount).toBe("");
    expect(form.adultCount).toBe("");
    expect(form.retiredCount).toBe("");
  });

  it("rehydrates organizers and participants from the authorized action payload", () => {
    const action = {
      actionPhase: "pre_action",
      preparationData: { routeTopology: "loop" },
      actorName: "Maxence",
      associationName: "Association locale",
      organizerType: "association",
      organizerId: "directory-association",
      organizerName: "Association locale",
      organizerAccounts: ["user-organizer", "user-organizer"],
      actionDate: "2026-10-09",
      locationLabel: "Paris",
      departureLocationLabel: null,
      arrivalLocationLabel: "Ancienne arrivée",
      latitude: 48.85,
      longitude: 2.35,
      eventStartTime: "09:00",
      eventEndTime: "11:00",
      volunteersCount: 2,
      durationMinutes: 60,
      groupJoinEnabled: false,
      participantAccounts: ["user-participant"],
    } as unknown as ActionEditorRecord;

    const form = buildBeforeActionFormFromAction({
      action,
      resolvedDefaultActorName: "fallback",
      initialRecordType: "action",
    });

    expect(form.organizerAccounts).toBe("user-organizer");
    expect(form.participantAccounts).toEqual(["user-participant"]);
    expect(form.volunteersCount).toBe("");
    expect(form.arrivalLocationLabel).toBe("");
    expect(form.latitude).toBe("48.85");
    expect(form.longitude).toBe("2.35");
    expect(form.actionDate).toBe("2026-10-09");
    expect(form.eventStartTime).toBe("09:00");
    expect(form.eventEndTime).toBe("11:00");
    expect(form.durationMinutes).toBe("60");
  });

  it("keeps an explicitly declared zero duration distinct from the SQL default", () => {
    const action = {
      actionPhase: "pre_action",
      preparationData: { durationMinutesDeclared: true },
      actionDate: "2026-10-09",
      locationLabel: "Paris",
      departureLocationLabel: "Quai nord",
      arrivalLocationLabel: null,
      eventStartTime: null,
      eventEndTime: null,
      volunteersCount: 1,
      durationMinutes: 0,
      groupJoinEnabled: false,
      participantAccounts: [],
    } as unknown as ActionEditorRecord;

    const form = buildBeforeActionFormFromAction({
      action,
      resolvedDefaultActorName: "fallback",
      initialRecordType: "action",
    });

    expect(form.durationMinutes).toBe("0");
  });

  it("rehydrates an explicitly persisted forecast and its non-overlapping split", () => {
    const action = {
      actionPhase: "pre_action",
      preparationData: {
        volunteersExpected: 8,
        volunteerParticipation: {
          childrenCount: 2,
          adultCount: 4,
          retiredCount: 2,
        },
      },
      actorName: "Maxence",
      associationName: "Association locale",
      organizerType: "association",
      actionDate: "2026-10-09",
      locationLabel: "Paris",
      departureLocationLabel: null,
      arrivalLocationLabel: null,
      eventStartTime: null,
      eventEndTime: null,
      volunteersCount: 8,
      durationMinutes: 60,
      groupJoinEnabled: false,
      participantAccounts: [],
    } as unknown as ActionEditorRecord;

    const form = buildBeforeActionFormFromAction({
      action,
      resolvedDefaultActorName: "fallback",
      initialRecordType: "action",
    });

    expect(form.volunteersCount).toBe("8");
    expect(form.childrenCount).toBe("2");
    expect(form.adultCount).toBe("4");
    expect(form.retiredCount).toBe("2");
  });
});
