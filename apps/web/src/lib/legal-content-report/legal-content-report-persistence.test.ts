import { beforeEach, describe, expect, it, vi } from "vitest";

const canUseSupabaseServerPersistenceMock = vi.hoisted(() => vi.fn());
const allowLocalFileStoreFallbackMock = vi.hoisted(() => vi.fn());
const assertPersistenceAvailableMock = vi.hoisted(() => vi.fn());
const readFileMock = vi.hoisted(() => vi.fn());
const writeFileMock = vi.hoisted(() => vi.fn());
const mkdirMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({
  allowLocalFileStoreFallback: allowLocalFileStoreFallbackMock,
  assertPersistenceAvailable: assertPersistenceAvailableMock,
  canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock,
}));
vi.mock("node:fs/promises", () => ({
  mkdir: mkdirMock,
  readFile: readFileMock,
  writeFile: writeFileMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

type SupabaseResult = {
  data: unknown;
  error: { message: string } | null;
};

function makeQuery(result: SupabaseResult) {
  const query: Record<string, unknown> & {
    then: (resolve: (value: SupabaseResult) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
  } = {
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

function configureSupabase(responses: Record<string, SupabaseResult[]>) {
  getSupabaseServerClientMock.mockReturnValue({
    from: vi.fn((table: string) => {
      const result = responses[table]?.shift();
      if (!result) {
        throw new Error(`Unexpected Supabase table access: ${table}`);
      }
      return makeQuery(result);
    }),
  });
}

const reportRow = {
  id: "report-1",
  created_at: "2026-08-28T10:00:00.000Z",
  submitted_by_user_id: null,
  notifier_name: "Smoke reporter",
  notifier_email: "contact@cleanmymap.fr",
  identity_exception_reason: null,
  content_url: "https://cleanmymap.fr/smoke/report-1",
  content_type: "synthetic-smoke",
  content_id: "report-1",
  allegation_reason: "Un motif circonstancié de test technique contrôlé.",
  good_faith_confirmed: true,
  status: "open",
  creator_state: "new",
};

const decisionRow = {
  id: "decision-1",
  report_id: "report-1",
  created_at: "2026-08-28T10:01:00.000Z",
  actor_admin_user_id: "admin-1",
  action: "reviewing",
  decision_origin: "received_notification",
  reason: "Examen administratif de test.",
  automated_means_used: false,
  legal_basis: null,
  terms_basis: null,
  content_url: reportRow.content_url,
  content_id: reportRow.content_id,
  before_state: {},
  after_state: {},
  execution_status: "not_applicable",
  execution_error_code: null,
  audit_operation_id: "00000000-0000-0000-0000-000000000001",
  notifier_notification_status: "not_requested",
  author_notification_status: "not_requested",
  notification_error: null,
};

describe("legal content report Supabase persistence routing", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    allowLocalFileStoreFallbackMock.mockReturnValue(false);
    assertPersistenceAvailableMock.mockImplementation((storeName: string) => {
      if (!canUseSupabaseServerPersistenceMock() && !allowLocalFileStoreFallbackMock()) {
        throw new Error(`Persistence unavailable for ${storeName}`);
      }
    });
    readFileMock.mockRejectedValue(new Error("local file access must not occur"));
    writeFileMock.mockResolvedValue(undefined);
    mkdirMock.mockResolvedValue(undefined);
  });

  it("uses Supabase directly for report append, list, get, update, and delete", async () => {
    configureSupabase({
      legal_content_reports: [
        { data: reportRow, error: null },
        { data: [reportRow], error: null },
        { data: reportRow, error: null },
        { data: { ...reportRow, creator_state: "reviewing" }, error: null },
        { data: [{ id: reportRow.id }], error: null },
      ],
      legal_content_report_decisions: [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ],
    });
    const {
      appendLegalContentReport,
      listLegalContentReports,
      getLegalContentReportById,
      updateLegalContentReportState,
      deleteLegalContentReport,
    } = await import("./legal-content-report-store");

    await expect(appendLegalContentReport({
      submittedByUserId: null,
      notifierName: reportRow.notifier_name,
      notifierEmail: reportRow.notifier_email,
      identityExceptionReason: null,
      contentUrl: reportRow.content_url,
      contentType: reportRow.content_type,
      contentId: reportRow.content_id,
      allegationReason: reportRow.allegation_reason,
      goodFaithConfirmed: true,
    })).resolves.toMatchObject({ id: reportRow.id });
    await expect(listLegalContentReports()).resolves.toHaveLength(1);
    await expect(getLegalContentReportById(reportRow.id)).resolves.toMatchObject({ id: reportRow.id });
    await expect(updateLegalContentReportState({
      reportId: reportRow.id,
      creatorState: "reviewing",
    })).resolves.toMatchObject({ creatorState: "reviewing" });
    await expect(deleteLegalContentReport(reportRow.id)).resolves.toBe(true);

    expect(readFileMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(mkdirMock).not.toHaveBeenCalled();
  });

  it("uses Supabase directly for decision append and both update operations", async () => {
    configureSupabase({
      legal_content_report_decisions: [
        { data: decisionRow, error: null },
        { data: decisionRow, error: null },
        { data: { ...decisionRow, notifier_notification_status: "sent" }, error: null },
        { data: decisionRow, error: null },
        { data: { ...decisionRow, after_state: { reviewed: true } }, error: null },
        { data: [decisionRow], error: null },
      ],
    });
    const {
      appendLegalContentReportDecision,
      listLegalContentReportDecisions,
      updateLegalContentReportDecisionNotifications,
      updateLegalContentReportDecisionStates,
    } = await import("./legal-content-report-decisions-store");

    await expect(appendLegalContentReportDecision({
      reportId: decisionRow.report_id,
      actorAdminUserId: decisionRow.actor_admin_user_id,
      action: "reviewing",
      origin: "received_notification",
      reason: decisionRow.reason,
      automatedMeansUsed: false,
      legalBasis: null,
      termsBasis: null,
      contentUrl: decisionRow.content_url,
      contentId: decisionRow.content_id,
      beforeState: {},
      afterState: {},
      executionStatus: "not_applicable",
      executionErrorCode: null,
      auditOperationId: decisionRow.audit_operation_id,
    })).resolves.toMatchObject({ id: decisionRow.id });
    await expect(updateLegalContentReportDecisionNotifications({
      decisionId: decisionRow.id,
      notifierNotificationStatus: "sent",
    })).resolves.toMatchObject({ notifierNotificationStatus: "sent" });
    await expect(updateLegalContentReportDecisionStates({
      decisionId: decisionRow.id,
      afterState: { reviewed: true },
    })).resolves.toMatchObject({
      executionStatus: "not_applicable",
      afterState: { reviewed: true },
    });
    await expect(listLegalContentReportDecisions(decisionRow.report_id)).resolves.toHaveLength(1);

    expect(readFileMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(mkdirMock).not.toHaveBeenCalled();
  });

  it("does not convert Supabase errors into successful report or decision writes", async () => {
    configureSupabase({
      legal_content_reports: [{ data: null, error: { message: "report insert failed" } }],
      legal_content_report_decisions: [{ data: null, error: { message: "decision insert failed" } }],
    });
    const { appendLegalContentReport } = await import("./legal-content-report-store");
    const { appendLegalContentReportDecision } = await import("./legal-content-report-decisions-store");

    await expect(appendLegalContentReport({
      submittedByUserId: null,
      notifierName: null,
      notifierEmail: null,
      identityExceptionReason: "Exception de test autorisée.",
      contentUrl: reportRow.content_url,
      contentType: null,
      contentId: null,
      allegationReason: reportRow.allegation_reason,
      goodFaithConfirmed: true,
    })).rejects.toThrow("report insert failed");
    await expect(appendLegalContentReportDecision({
      reportId: decisionRow.report_id,
      actorAdminUserId: decisionRow.actor_admin_user_id,
      action: "reviewing",
      origin: "received_notification",
      reason: decisionRow.reason,
      automatedMeansUsed: false,
      legalBasis: null,
      termsBasis: null,
      contentUrl: decisionRow.content_url,
      contentId: decisionRow.content_id,
      beforeState: {},
      afterState: {},
      executionStatus: "not_applicable",
      executionErrorCode: null,
      auditOperationId: decisionRow.audit_operation_id,
    })).rejects.toThrow("decision insert failed");
    expect(readFileMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("keeps the local fallback when Supabase is unavailable and explicitly allowed", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(false);
    allowLocalFileStoreFallbackMock.mockReturnValue(true);
    readFileMock.mockResolvedValue(JSON.stringify({ updatedAt: "2026-08-28T10:00:00.000Z", records: [] }));
    const { appendLegalContentReport } = await import("./legal-content-report-store");

    await expect(appendLegalContentReport({
      submittedByUserId: null,
      notifierName: null,
      notifierEmail: null,
      identityExceptionReason: "Exception de test autorisée.",
      contentUrl: reportRow.content_url,
      contentType: null,
      contentId: null,
      allegationReason: reportRow.allegation_reason,
      goodFaithConfirmed: true,
    })).resolves.toMatchObject({ contentUrl: reportRow.content_url });
    expect(readFileMock).toHaveBeenCalledTimes(1);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("does not use the local fallback when it is not explicitly allowed", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(false);
    allowLocalFileStoreFallbackMock.mockReturnValue(false);
    const { appendLegalContentReport } = await import("./legal-content-report-store");

    await expect(appendLegalContentReport({
      submittedByUserId: null,
      notifierName: null,
      notifierEmail: null,
      identityExceptionReason: "Exception de test autorisée.",
      contentUrl: reportRow.content_url,
      contentType: null,
      contentId: null,
      allegationReason: reportRow.allegation_reason,
      goodFaithConfirmed: true,
    })).rejects.toThrow("Persistence unavailable");
    expect(readFileMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
  });
});
