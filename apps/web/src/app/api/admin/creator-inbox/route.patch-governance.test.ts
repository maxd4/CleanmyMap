import { beforeEach, describe, expect, it } from "vitest";
import {
  appendAdminOperationAuditMock,
  changeCommunityBugReportPriorityMock,
  deleteCommunityBugReportMock,
  makeRequest,
  removeCommunityBugReportFromActiveQueueMock,
  resetCreatorInboxMocks,
} from "@/__tests__/support/creator-inbox-route";

describe("PATCH /api/admin/creator-inbox — priority and logical removal", () => {
  beforeEach(() => {
    resetCreatorInboxMocks();
  });

  it("requires a bounded reason before changing feedback priority", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(makeRequest({
      source: "feedback",
      itemId: "feedback-1",
      action: "change_priority",
      priority: "critical",
      reason: "nope",
    }));
    expect(response.status).toBe(400);
    expect(changeCommunityBugReportPriorityMock).not.toHaveBeenCalled();
  });

  it("changes priority through the transactional owner and does not append a duplicate audit", async () => {
    changeCommunityBugReportPriorityMock.mockResolvedValueOnce({
      status: "updated",
      auditPersisted: true,
      record: {
        id: "feedback-1",
        priority: "critical",
        creatorState: "new",
        status: "open",
      },
    });
    const { PATCH } = await import("./route");
    const response = await PATCH(makeRequest({
      source: "feedback",
      itemId: "feedback-1",
      action: "change_priority",
      priority: "critical",
      reason: "Incident critique",
    }));
    expect(response.status).toBe(200);
    expect(changeCommunityBugReportPriorityMock).toHaveBeenCalledWith(expect.objectContaining({
      reportId: "feedback-1",
      priority: "critical",
      reason: "Incident critique",
      expectedPriority: "normal",
    }));
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
  });

  it("removes feedback logically through the transactional owner without physical deletion", async () => {
    const record = {
      id: "feedback-1",
      status: "open" as const,
      creatorState: "new" as const,
      priority: "normal" as const,
      removedAt: "2026-10-30T10:00:00.000Z",
      removedByUserId: "reviewer-1",
      removedReason: "Retrait justifié",
    };
    removeCommunityBugReportFromActiveQueueMock.mockResolvedValueOnce({
      status: "updated",
      auditPersisted: true,
      record,
    });
    const { PATCH } = await import("./route");
    const response = await PATCH(makeRequest({
      source: "feedback",
      itemId: "feedback-1",
      action: "delete",
      reason: "Retrait justifié",
    }));
    expect(response.status).toBe(200);
    expect(removeCommunityBugReportFromActiveQueueMock).toHaveBeenCalledWith(expect.objectContaining({
      reportId: "feedback-1",
      expectedStatus: "open",
      expectedCreatorState: "new",
    }));
    expect(deleteCommunityBugReportMock).not.toHaveBeenCalled();
  });

  it("returns a conflict when another admin changed the expected state", async () => {
    removeCommunityBugReportFromActiveQueueMock.mockResolvedValueOnce({
      status: "conflict",
      auditPersisted: true,
      record: null,
    });
    const { PATCH } = await import("./route");
    const response = await PATCH(makeRequest({
      source: "feedback",
      itemId: "feedback-1",
      action: "delete",
      reason: "Conflit à traiter",
    }));
    expect(response.status).toBe(409);
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
  });
});
