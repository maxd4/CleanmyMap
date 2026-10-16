import { beforeEach, describe, expect, it, vi } from "vitest";

const canUseSupabaseServerPersistenceMock = vi.hoisted(() => vi.fn());
const readLocalRecordStoreMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({
  assertPersistenceAvailable: vi.fn(),
  canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock,
  deleteAndPersistRecord: vi.fn(),
  deleteSupabaseRecordById: vi.fn(),
  findRecordInList: vi.fn(),
  persistSupabaseRecord: vi.fn(),
  readSupabaseRecord: vi.fn(),
  readSupabaseRecords: vi.fn(),
  replaceAndPersistRecord: vi.fn(),
}));
vi.mock("@/lib/persistence/local-record-store", () => ({
  readLocalRecordStore: readLocalRecordStoreMock,
  writeLocalRecordStore: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

const baseRecord = {
  submittedByDisplayName: "Owner",
  submittedByEmail: null,
  submittedByRole: "benevole",
  reportType: "bug" as const,
  description: "A sufficiently detailed feedback message.",
  pagePath: "/sections/feedback",
  source: "feedback_section" as const,
  status: "open" as const,
};

const ownerRecords = [
  {
    ...baseRecord,
    id: "responded",
    createdAt: "2026-08-27T11:00:00.000Z",
    submittedByUserId: "owner-1",
    title: "Réponse envoyée",
    creatorState: "responded" as const,
  },
  {
    ...baseRecord,
    id: "treated",
    createdAt: "2026-08-27T10:00:00.000Z",
    submittedByUserId: "owner-1",
    title: "Retour traité",
    creatorState: "treated" as const,
  },
  {
    ...baseRecord,
    id: "archived",
    createdAt: "2026-08-27T09:00:00.000Z",
    submittedByUserId: "owner-1",
    title: "Retour archivé",
    creatorState: "archived" as const,
  },
];

const {
  listCommunityBugReportsForUser,
  parseCommunityBugReportHistoryCursor,
} = await import("./bug-reports-store");

describe("community bug report personal history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canUseSupabaseServerPersistenceMock.mockReturnValue(false);
    readLocalRecordStoreMock.mockResolvedValue({
      updatedAt: "2026-08-27T12:00:00.000Z",
      records: [...ownerRecords, { ...ownerRecords[0], id: "other-user", submittedByUserId: "owner-2" }],
    });
  });

  it("filters by the server owner and paginates by created date plus id", async () => {
    const firstPage = await listCommunityBugReportsForUser({
      submittedByUserId: " owner-1 ",
      limit: 2,
    });

    expect(firstPage.items.map((item) => item.id)).toEqual(["responded", "treated"]);
    expect(firstPage.items.map((item) => item.creatorState)).toEqual([
      "responded",
      "treated",
    ]);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).toEqual({
      createdAt: "2026-08-27T10:00:00.000Z",
      id: "treated",
    });

    const secondPage = await listCommunityBugReportsForUser({
      submittedByUserId: "owner-1",
      limit: 2,
      beforeCursor: firstPage.nextCursor,
    });

    expect(secondPage.items.map((item) => item.id)).toEqual(["archived"]);
    expect(secondPage.items[0]?.creatorState).toBe("archived");
    expect(secondPage.hasMore).toBe(false);
  });

  it("returns an empty page when the owner has no remaining reports", async () => {
    readLocalRecordStoreMock.mockResolvedValueOnce({
      updatedAt: "2026-08-27T12:00:00.000Z",
      records: [{ ...ownerRecords[0], submittedByUserId: "other-user" }],
    });

    await expect(
      listCommunityBugReportsForUser({ submittedByUserId: "owner-1" }),
    ).resolves.toEqual({ items: [], nextCursor: null, hasMore: false });
  });

  it("rejects cursor values that could alter the owner query filter", () => {
    expect(
      parseCommunityBugReportHistoryCursor(
        "2026-08-27T10:00:00.000Z|id.or(submitted_by_user_id.eq.other-user)",
      ),
    ).toBeNull();
  });

  it("delegates qualification to the transactional RPC with the actor and operation", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    const rpcMock = vi.fn().mockResolvedValue({
      data: {
        status: "updated",
        item: {
          id: "feedback-1",
          created_at: "2026-08-27T11:00:00.000Z",
          submitted_by_user_id: "owner-1",
          submitted_by_display_name: "Owner",
          submitted_by_email: null,
          submitted_by_role: "benevole",
          report_type: "bug",
          title: "Bug",
          description: "A sufficiently detailed feedback message.",
          page_path: "/sections/feedback",
          source: "feedback_section",
          status: "open",
          creator_state: "new",
          screenshot_upload_state: null,
          qualification_status: "accepted",
          qualification_reason: "Retour pertinent.",
          qualification_decided_at: "2026-08-27T12:00:00.000Z",
          qualification_decided_by_user_id: "max-owner",
          qualification_duplicate_feedback_id: null,
        },
      },
      error: null,
    });
    getSupabaseServerClientMock.mockReturnValue({ rpc: rpcMock });

    const { qualifyCommunityBugReport } = await import("./bug-reports-store");
    await expect(
      qualifyCommunityBugReport({
        reportId: "feedback-1",
        decision: "accepted",
        reason: "Retour pertinent.",
        duplicateFeedbackId: null,
        actorUserId: "max-owner",
        operationId: "operation-1",
      }),
    ).resolves.toMatchObject({
      status: "updated",
      record: { qualificationStatus: "accepted" },
    });
    expect(rpcMock).toHaveBeenCalledWith("qualify_community_bug_report", {
      p_feedback_id: "feedback-1",
      p_decision: "accepted",
      p_reason: "Retour pertinent.",
      p_duplicate_feedback_id: null,
      p_actor_user_id: "max-owner",
      p_operation_id: "operation-1",
    });
  });

  it("fails closed instead of recording an unaudited local qualification", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(false);
    const { qualifyCommunityBugReport } = await import("./bug-reports-store");

    await expect(
      qualifyCommunityBugReport({
        reportId: "feedback-1",
        decision: "accepted",
        reason: "Retour pertinent.",
        duplicateFeedbackId: null,
        actorUserId: "max-owner",
        operationId: "operation-2",
      }),
    ).rejects.toThrow("transactional Supabase persistence");
    expect(readLocalRecordStoreMock).not.toHaveBeenCalled();
  });
});
