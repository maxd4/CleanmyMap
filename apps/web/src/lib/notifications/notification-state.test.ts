import { describe, expect, it } from "vitest";

import type { AppNotification } from "./client";
import {
  countPendingNotificationDecisions,
  getNotificationDecisionDescriptor,
  getNotificationDecisionOutcome,
  prioritizeNotificationPreview,
  resolveNotificationDisplayState,
} from "./notification-state";

const notification = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: "notification-1",
  type: "chat",
  title: "Demande",
  content: "Une demande attend votre réponse.",
  read_at: null,
  created_at: "2026-10-09T10:00:00.000Z",
  payload: { requestKind: "action_share", requestId: "request-1" },
  ...overrides,
});

describe("notification decision state", () => {
  it("keeps a read notification pending when the business request is still pending", () => {
    const item = notification({ read_at: "2026-10-09T10:01:00.000Z" });
    expect(resolveNotificationDisplayState({ notification: item, pendingRequestIds: new Set(["request-1"]) })).toBe("decision_pending");
    expect(countPendingNotificationDecisions([item], new Set(["request-1"]))).toBe(1);
  });

  it("distinguishes treated local decisions from unavailable ones", () => {
    const item = notification();
    expect(resolveNotificationDisplayState({ notification: item, pendingRequestIds: new Set(), treatedNotificationIds: new Set([item.id]) })).toBe("treated");
    expect(resolveNotificationDisplayState({ notification: item, pendingRequestIds: new Set() })).toBe("unavailable");
  });

  it("does not expose decision actions for arbitrary payloads", () => {
    expect(getNotificationDecisionDescriptor({ requestKind: "other", requestId: "request-1" })).toBeNull();
    expect(getNotificationDecisionDescriptor({ requestKind: "action_share" })).toBeNull();
  });

  it("recognizes only canonical action invitation payloads", () => {
    const item = notification({
      type: "action_event",
      payload: {
        eventType: "action_event",
        subtype: "invitation",
        registrationId: "registration-1",
      },
    });
    expect(getNotificationDecisionDescriptor(item.payload)).toEqual({
      kind: "action_invitation",
      requestId: "registration-1",
    });
    expect(resolveNotificationDisplayState({
      notification: item,
      pendingRequestIds: new Set(["registration-1"]),
    })).toBe("decision_pending");
  });

  it("keeps a withdrawn invitation unavailable even if a stale pending projection remains", () => {
    const item = notification({
      type: "action_event",
      payload: {
        eventType: "action_event",
        subtype: "invitation",
        registrationId: "registration-1",
        decisionState: "unavailable",
        decision: "withdrawn",
      },
    });
    expect(resolveNotificationDisplayState({
      notification: item,
      pendingRequestIds: new Set(["registration-1"]),
    })).toBe("unavailable");
  });

  it("recognizes a public registration request separately from an invitation", () => {
    const item = notification({
      type: "action_event",
      payload: {
        eventType: "action_event",
        subtype: "registration_request",
        requestKind: "registration_request",
        actionId: "action-2",
        registrationId: "registration-2",
      },
    });
    expect(getNotificationDecisionDescriptor(item.payload)).toEqual({
      kind: "action_registration_request",
      requestId: "registration-2",
      actionId: "action-2",
    });
    expect(resolveNotificationDisplayState({
      notification: item,
      pendingRequestIds: new Set(["registration-2"]),
    })).toBe("decision_pending");
  });

  it("renders durable outcomes and prioritizes old decisions over recent information", () => {
    expect(getNotificationDecisionOutcome({ decision: "accepted" })).toBe("accepted");
    expect(getNotificationDecisionOutcome({ decision: "reject" })).toBe("rejected");
    expect(getNotificationDecisionOutcome({ decision: "withdrawn" })).toBe("withdrawn");

    const oldDecision = notification({ id: "old-decision" });
    const recentInformation = notification({ id: "recent-information", payload: null });
    const duplicateDecision = notification({ id: "old-decision", title: "Duplicate" });
    expect(prioritizeNotificationPreview(
      [oldDecision],
      [recentInformation, duplicateDecision],
      4,
    ).map((item) => item.id)).toEqual(["old-decision", "recent-information"]);
  });

  it("keeps decisions at positions 21 or 100 reachable without loading history", () => {
    const history = Array.from({ length: 100 }, (_, index) => notification({
      id: `information-${index + 1}`,
      payload: null,
    }));
    const firstPending = notification({ id: "pending-21" });
    const secondPending = notification({ id: "pending-100" });

    expect(prioritizeNotificationPreview(
      [firstPending, secondPending],
      history,
      4,
    ).map((item) => item.id)).toEqual([
      "pending-21",
      "pending-100",
      "information-1",
      "information-2",
    ]);
  });
});
