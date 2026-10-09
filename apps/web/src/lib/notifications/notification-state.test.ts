import { describe, expect, it } from "vitest";

import type { AppNotification } from "./client";
import {
  countPendingNotificationDecisions,
  getNotificationDecisionDescriptor,
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
});
