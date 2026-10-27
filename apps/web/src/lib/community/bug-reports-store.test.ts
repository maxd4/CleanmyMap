import { beforeEach, describe, expect, it, vi } from "vitest";

const canUseSupabaseServerPersistenceMock = vi.hoisted(() => vi.fn());
const readLocalRecordStoreMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const deleteAndPersistRecordMock = vi.hoisted(() => vi.fn());
const findRecordInListMock = vi.hoisted(() => vi.fn());
const writeLocalRecordStoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({
  assertPersistenceAvailable: vi.fn(),
  canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock,
  deleteAndPersistRecord: deleteAndPersistRecordMock,
  deleteSupabaseRecordById: vi.fn(),
  findRecordInList: findRecordInListMock,
  persistSupabaseRecord: vi.fn(),
  readSupabaseRecord: vi.fn(),
  readSupabaseRecords: vi.fn(),
  replaceAndPersistRecord: vi.fn(),
}));
vi.mock("@/lib/persistence/local-record-store", () => ({
  readLocalRecordStore: readLocalRecordStoreMock,
  writeLocalRecordStore: writeLocalRecordStoreMock,
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

  it("rejects malformed transactional qualification and tracking responses", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    const rpcMock = vi.fn().mockResolvedValue({ data: { status: "unknown", item: null }, error: null });
    getSupabaseServerClientMock.mockReturnValue({ rpc: rpcMock });
    const { qualifyCommunityBugReport, updateCommunityBugReportTracking, listCommunityBugReportsForUser } = await import("./bug-reports-store");
    await expect(qualifyCommunityBugReport({ reportId: "feedback-1", decision: "accepted", reason: null, duplicateFeedbackId: null, actorUserId: "admin", operationId: "operation-3" })).rejects.toThrow("Invalid feedback qualification result");
    await expect(updateCommunityBugReportTracking({ reportId: "feedback-1", trackingStatus: "shipped", publicSummary: null, reference: null, shippedOn: null, actorUserId: "admin", operationId: "operation-4" })).rejects.toThrow("Invalid feedback tracking result");
    rpcMock.mockResolvedValue({ data: null, error: { message: "rpc failed" } });
    await expect(qualifyCommunityBugReport({ reportId: "feedback-1", decision: "rejected", reason: null, duplicateFeedbackId: null, actorUserId: "admin", operationId: "operation-5" })).rejects.toThrow("rpc failed");
    await expect(updateCommunityBugReportTracking({ reportId: "feedback-1", trackingStatus: "not_planned", publicSummary: null, reference: null, shippedOn: null, actorUserId: "admin", operationId: "operation-6" })).rejects.toThrow("rpc failed");
    await expect(listCommunityBugReportsForUser({ submittedByUserId: "   " })).rejects.toThrow("owner id is required");
  });

  it("delegates product tracking to the transactional RPC without using the local store", async () => {
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
          tracking_status: "shipped",
          tracking_public_summary: "Le problème de carte est corrigé.",
          tracking_reference: "2026.10",
          tracking_shipped_on: "2026-10-16",
          tracking_shipped_notification_at: "2026-10-16T12:00:00.000Z",
          tracking_updated_at: "2026-10-16T12:00:00.000Z",
          tracking_updated_by_user_id: "max-owner",
        },
      },
      error: null,
    });
    getSupabaseServerClientMock.mockReturnValue({ rpc: rpcMock });

    const { updateCommunityBugReportTracking } = await import("./bug-reports-store");
    await expect(
      updateCommunityBugReportTracking({
        reportId: "feedback-1",
        trackingStatus: "shipped",
        publicSummary: "Le problème de carte est corrigé.",
        reference: "2026.10",
        shippedOn: "2026-10-16",
        actorUserId: "max-owner",
        operationId: "operation-tracking-1",
      }),
    ).resolves.toMatchObject({ status: "updated", record: { tracking: { status: "shipped" } } });
    expect(rpcMock).toHaveBeenCalledWith("update_community_bug_report_tracking", {
      p_feedback_id: "feedback-1",
      p_tracking_status: "shipped",
      p_public_summary: "Le problème de carte est corrigé.",
      p_reference: "2026.10",
      p_shipped_on: "2026-10-16",
      p_actor_user_id: "max-owner",
      p_operation_id: "operation-tracking-1",
    });
    expect(readLocalRecordStoreMock).not.toHaveBeenCalled();
  });

  it("computes real local follow-up metrics and never invents missing records", async () => {
    readLocalRecordStoreMock.mockResolvedValueOnce({
      updatedAt: "2026-10-16T12:00:00.000Z",
      records: [
        { ...ownerRecords[0], qualificationStatus: "pending", tracking: { status: "not_planned" } },
        { ...ownerRecords[1], qualificationStatus: "accepted", tracking: { status: "shipped" } },
        { ...ownerRecords[2], qualificationStatus: "duplicate", tracking: { status: "planned" } },
      ],
    });
    canUseSupabaseServerPersistenceMock.mockReturnValue(false);

    const { loadCommunityBugReportFollowUpMetrics } = await import("./bug-reports-store");
    await expect(loadCommunityBugReportFollowUpMetrics()).resolves.toEqual({
      received: 3,
      pendingQualification: 1,
      accepted: 1,
      duplicate: 1,
      rejected: 0,
      shipped: 1,
      period: "all_time",
      scope: "community_bug_reports",
    });
  });

  it("writes, lists, reads, updates and deletes local reports without leaking other owners", async () => {
    const { appendCommunityBugReport, listCommunityBugReports, getCommunityBugReportById, updateCommunityBugReportStatus, deleteCommunityBugReport } = await import("./bug-reports-store");
    readLocalRecordStoreMock.mockResolvedValue({ updatedAt: "2026-08-27T12:00:00.000Z", records: [...ownerRecords] });
    writeLocalRecordStoreMock.mockResolvedValue(undefined);
    deleteAndPersistRecordMock.mockImplementation(async (records, predicate, persist) => {
      const remaining = records.filter((record: typeof ownerRecords[number]) => !predicate(record));
      await persist(remaining);
      return remaining.length !== records.length;
    });

    const created = await appendCommunityBugReport({
      submittedByUserId: "owner-3",
      input: {
        reportType: "bug",
        title: "Nouveau retour",
        description: "Description suffisamment détaillée.",
        pagePath: "/carte",
      },
    });
    expect(created).toMatchObject({
      submittedByUserId: "owner-3",
      submittedByDisplayName: "owner-3",
      submittedByEmail: null,
      source: "discussion_form",
      status: "open",
      creatorState: "new",
    });
    expect(writeLocalRecordStoreMock).toHaveBeenCalled();

    await expect(listCommunityBugReports(1, { createdAt: "2026-08-27T10:00:00.000Z", id: "treated" }))
      .resolves.toEqual([ownerRecords[2]]);
    findRecordInListMock.mockReturnValue(ownerRecords[0]);
    await expect(getCommunityBugReportById("responded")).resolves.toEqual(ownerRecords[0]);

    await expect(updateCommunityBugReportStatus({ reportId: "treated", status: "archived" }))
      .resolves.toMatchObject({ id: "treated", status: "archived", creatorState: "archived" });
    await expect(updateCommunityBugReportStatus({ reportId: "missing", status: "treated" })).resolves.toBeNull();
    expect(writeLocalRecordStoreMock).toHaveBeenCalled();

    await expect(deleteCommunityBugReport("treated")).resolves.toBe(true);
    expect(deleteAndPersistRecordMock).toHaveBeenCalled();
  });

  it("uses the transactional Supabase branches for lists and status updates", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    const readSupabaseRecords = vi.mocked((await import("@/lib/persistence/runtime-store")).readSupabaseRecords);
    const readSupabaseRecord = vi.mocked((await import("@/lib/persistence/runtime-store")).readSupabaseRecord);
    readSupabaseRecords.mockResolvedValue([]);
    readSupabaseRecord.mockResolvedValue(null);
    const query = {
      select: vi.fn(() => query),
      update: vi.fn(() => query),
      order: vi.fn(() => query),
      eq: vi.fn(() => query),
      or: vi.fn(() => query),
      limit: vi.fn(async () => ({ data: [], error: null })),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    };
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn(() => query) });
    const { listCommunityBugReports, getCommunityBugReportById, updateCommunityBugReportStatus } = await import("./bug-reports-store");

    await expect(listCommunityBugReports(0, { createdAt: "2026-08-27T10:00:00.000Z", id: "treated" })).resolves.toEqual([]);
    await expect(getCommunityBugReportById("missing")).resolves.toBeNull();
    await expect(updateCommunityBugReportStatus({ reportId: "missing", status: "open" })).resolves.toBeNull();
    expect(query.or).toHaveBeenCalled();
    expect(query.limit).toHaveBeenCalledWith(1);
  });
});
