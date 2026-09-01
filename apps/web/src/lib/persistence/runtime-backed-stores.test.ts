import { beforeEach, describe, expect, it, vi } from "vitest";

const canUseSupabaseServerPersistenceMock = vi.hoisted(() => vi.fn());
const assertPersistenceAvailableMock = vi.hoisted(() => vi.fn());
const isVercelRuntimeMock = vi.hoisted(() => vi.fn());
const readFileMock = vi.hoisted(() => vi.fn());
const writeFileMock = vi.hoisted(() => vi.fn());
const mkdirMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const appendPublishedPartnerAnnuaireEntryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({
  assertPersistenceAvailable: assertPersistenceAvailableMock,
  canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock,
  isVercelRuntime: isVercelRuntimeMock,
}));
vi.mock("node:fs/promises", () => ({
  mkdir: mkdirMock,
  readFile: readFileMock,
  writeFile: writeFileMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/partners/published-annuaire-entries-store", () => ({
  appendPublishedPartnerAnnuaireEntry: appendPublishedPartnerAnnuaireEntryMock,
}));

type SupabaseResult = {
  data: unknown;
  error: { message: string } | null;
  count?: number | null;
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

const contactRow = {
  id: "contact-1",
  created_at: "2026-09-01T09:00:00.000Z",
  submitted_by_user_id: null,
  submitted_by_email: "contact@example.com",
  request_type: "other",
  subject: "Question",
  message: "Message de test suffisamment explicite.",
  page_path: "/contact",
  source: "contact_page",
  status: "queued",
  notification_error: null,
};

const bugReportRow = {
  id: "bug-1",
  created_at: "2026-09-01T09:00:00.000Z",
  submitted_by_user_id: "user-1",
  submitted_by_display_name: "Utilisateur test",
  submitted_by_email: null,
  submitted_by_role: "benevole",
  report_type: "bug",
  title: "Bug de test",
  description: "Description de test.",
  page_path: "/actions",
  source: "discussion_form",
  status: "open",
  creator_state: "new",
};

const promotionRow = {
  id: "promotion-1",
  created_at: "2026-09-01T09:00:00.000Z",
  submitted_by_user_id: "user-1",
  submitted_by_display_name: "Utilisateur test",
  submitted_by_email: null,
  submitted_by_role: "benevole",
  requested_role: "elu",
  motivation: "Motivation de test suffisamment explicite.",
  status: "pending_owner_review",
  reviewed_at: null,
  reviewed_by_user_id: null,
  reviewed_by_role: null,
  creator_state: "pending",
};

const partnerRow = {
  id: "partner-1",
  created_at: "2026-09-01T09:00:00.000Z",
  submitted_by_user_id: "user-1",
  submitted_by_email: "partner@example.com",
  organization_name: "Partenaire test",
  organization_type: "association",
  partner_scope: "local",
  legal_identity: "Partenaire Test Association",
  coverage: { arrondissements: [11], quartiers: [] },
  contribution_types: ["communication"],
  relay_actions: "Relais de test.",
  availability: { slots: [] },
  contact_name: "Contact test",
  contact_channel: "email",
  contact_details: "partner@example.com",
  motivation: "Motivation partenaire de test.",
  status: "pending_admin_review",
  creator_state: "pending",
};

describe("runtime-backed request stores", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    isVercelRuntimeMock.mockReturnValue(true);
    assertPersistenceAvailableMock.mockImplementation(() => undefined);
    readFileMock.mockRejectedValue(new Error("local file access must not occur"));
    writeFileMock.mockResolvedValue(undefined);
    mkdirMock.mockResolvedValue(undefined);
    appendPublishedPartnerAnnuaireEntryMock.mockResolvedValue(undefined);
  });

  it("uses Supabase without accessing local files on Vercel", async () => {
    configureSupabase({
      contact_requests: [{ data: contactRow, error: null }],
      community_bug_reports: [{ data: bugReportRow, error: null }],
      promotion_requests: [{ data: promotionRow, error: null }],
      partner_onboarding_requests: [{ data: partnerRow, error: null }],
    });

    const { appendContactRequest } = await import("@/lib/contact/contact-requests-store");
    const { appendCommunityBugReport } = await import("@/lib/community/bug-reports-store");
    const { appendPromotionRequest } = await import("@/lib/admin/promotion-requests-store");
    const { appendPartnerOnboardingRequest } = await import("@/lib/partners/onboarding-requests-store");

    await expect(appendContactRequest({
      submittedByUserId: null,
      input: {
        submittedByEmail: contactRow.submitted_by_email,
        requestType: "other",
        subject: contactRow.subject,
        message: contactRow.message,
        pagePath: contactRow.page_path,
      },
    })).resolves.toMatchObject({ id: contactRow.id });
    await expect(appendCommunityBugReport({
      submittedByUserId: bugReportRow.submitted_by_user_id,
      input: {
        reportType: "bug",
        title: bugReportRow.title,
        description: bugReportRow.description,
        pagePath: bugReportRow.page_path,
      },
    })).resolves.toMatchObject({ id: bugReportRow.id });
    await expect(appendPromotionRequest({
      submittedByUserId: promotionRow.submitted_by_user_id,
      input: {
        submittedByDisplayName: promotionRow.submitted_by_display_name,
        submittedByRole: "benevole",
        requestedRole: "elu",
        motivation: promotionRow.motivation,
      },
    })).resolves.toMatchObject({ id: promotionRow.id });
    await expect(appendPartnerOnboardingRequest({
      submittedByUserId: partnerRow.submitted_by_user_id,
      submittedByEmail: partnerRow.submitted_by_email,
      input: {
        organizationName: partnerRow.organization_name,
        organizationType: "association",
        partnerScope: "local",
        legalIdentity: partnerRow.legal_identity,
        coverage: partnerRow.coverage,
        contributionTypes: ["communication"],
        relayActions: partnerRow.relay_actions,
        availability: partnerRow.availability,
        contactName: partnerRow.contact_name,
        contactChannel: partnerRow.contact_channel,
        contactDetails: partnerRow.contact_details,
        motivation: partnerRow.motivation,
      },
    })).resolves.toMatchObject({ id: partnerRow.id });

    expect(readFileMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
    expect(mkdirMock).not.toHaveBeenCalled();
    expect(appendPublishedPartnerAnnuaireEntryMock).not.toHaveBeenCalled();
  });

  it("keeps the explicitly allowed local fallback", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(false);
    isVercelRuntimeMock.mockReturnValue(false);
    readFileMock.mockResolvedValue(JSON.stringify({ updatedAt: "2026-09-01T09:00:00.000Z", records: [] }));
    const { appendContactRequest } = await import("@/lib/contact/contact-requests-store");

    await expect(appendContactRequest({
      submittedByUserId: null,
      input: {
        submittedByEmail: "local@example.com",
        requestType: "other",
        subject: "Fallback local",
        message: "Fallback local autorisé.",
      },
    })).resolves.toMatchObject({ source: "contact_page" });

    expect(readFileMock).toHaveBeenCalledTimes(1);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
