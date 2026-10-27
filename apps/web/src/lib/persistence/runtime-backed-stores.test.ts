import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRuntimeStoreModule } from "./__tests__/runtime-store-mock";
import {
  configureSupabaseTestClient,
  type SupabaseTestResult,
} from "./__tests__/supabase-test-harness";

const canUseSupabaseServerPersistenceMock = vi.hoisted(() => vi.fn());
const assertPersistenceAvailableMock = vi.hoisted(() => vi.fn());
const isVercelRuntimeMock = vi.hoisted(() => vi.fn());
const readFileMock = vi.hoisted(() => vi.fn());
const writeFileMock = vi.hoisted(() => vi.fn());
const mkdirMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const appendPublishedPartnerAnnuaireEntryMock = vi.hoisted(() => vi.fn());
const buildPublishedPartnerAnnuaireEntryMock = vi.hoisted(() => vi.fn());
const serializePublishedPartnerAnnuaireEntryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({
  ...createRuntimeStoreModule(),
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
  buildPublishedPartnerAnnuaireEntry: buildPublishedPartnerAnnuaireEntryMock,
  serializePublishedPartnerAnnuaireEntry: serializePublishedPartnerAnnuaireEntryMock,
}));

const configureSupabase = (responses: Record<string, SupabaseTestResult[]>) =>
  configureSupabaseTestClient(getSupabaseServerClientMock, responses);

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

const partnerInput = {
  organizationName: "Partenaire test",
  organizationType: "association" as const,
  partnerScope: "local" as const,
  legalIdentity: "Partenaire Test Association",
  coverage: { arrondissements: [11], quartiers: [] },
  contributionTypes: ["communication" as const],
  engagementTypes: [],
  relayActions: "Relais de test.",
  availability: { slots: [] },
  contactName: "Contact test",
  contactChannel: "email",
  contactDetails: "partner@example.com",
  motivation: "Motivation partenaire de test.",
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
    buildPublishedPartnerAnnuaireEntryMock.mockReturnValue({ id: "onboarded-partner-1" });
    serializePublishedPartnerAnnuaireEntryMock.mockReturnValue({
      public_data: { id: "onboarded-partner-1" },
      private_admin_contact: {},
    });
  });

  it("uses Supabase without accessing local files on Vercel", async () => {
    configureSupabase({
      contact_requests: [{ data: contactRow, error: null }],
      community_bug_reports: [{ data: bugReportRow, error: null }],
      promotion_requests: [{ data: promotionRow, error: null }],
      partner_onboarding_requests: [{ data: partnerRow, error: null }],
      "rpc:create_partner_onboarding_request_with_annuaire": [{
        data: [{ request_id: partnerRow.id }],
        error: null,
      }],
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

  it("replays the same local intent without writing a second request", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(false);
    isVercelRuntimeMock.mockReturnValue(false);
    readFileMock.mockResolvedValue(JSON.stringify({
      updatedAt: "2026-09-01T09:00:00.000Z",
      records: [{
        id: "partner-existing",
        createdAt: "2026-09-01T09:00:00.000Z",
        submittedByUserId: "user-1",
        submittedByEmail: "partner@example.com",
        idempotencyKey: "partner-onboarding-retry-1",
        status: "pending_admin_review",
        creatorState: "pending",
        ...partnerInput,
        publicWebsiteConsent: false,
      }],
    }));

    const { appendPartnerOnboardingRequestWithResult } = await import("@/lib/partners/onboarding-requests-store");
    await expect(appendPartnerOnboardingRequestWithResult({
      submittedByUserId: "user-1",
      submittedByEmail: "partner@example.com",
      input: partnerInput,
      idempotencyKey: "partner-onboarding-retry-1",
    })).resolves.toMatchObject({ replayed: true, record: { id: "partner-existing" } });

    expect(writeFileMock).not.toHaveBeenCalled();
    expect(appendPublishedPartnerAnnuaireEntryMock).toHaveBeenCalledOnce();
  });

  it("rejects a local same-key payload change before any reconciliation write", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(false);
    isVercelRuntimeMock.mockReturnValue(false);
    readFileMock.mockResolvedValue(JSON.stringify({
      updatedAt: "2026-09-01T09:00:00.000Z",
      records: [{
        id: "partner-existing",
        createdAt: "2026-09-01T09:00:00.000Z",
        submittedByUserId: "user-1",
        submittedByEmail: "partner@example.com",
        idempotencyKey: "partner-onboarding-retry-1",
        status: "pending_admin_review",
        creatorState: "pending",
        ...partnerInput,
        publicWebsiteConsent: false,
      }],
    }));

    const { appendPartnerOnboardingRequestWithResult, PartnerOnboardingIdempotencyConflictError } = await import("@/lib/partners/onboarding-requests-store");
    await expect(appendPartnerOnboardingRequestWithResult({
      submittedByUserId: "user-1",
      submittedByEmail: "partner@example.com",
      input: { ...partnerInput, organizationName: "Autre organisation" },
      idempotencyKey: "partner-onboarding-retry-1",
    })).rejects.toBeInstanceOf(PartnerOnboardingIdempotencyConflictError);

    expect(writeFileMock).not.toHaveBeenCalled();
    expect(appendPublishedPartnerAnnuaireEntryMock).not.toHaveBeenCalled();
  });

  it("rejects the same key for another actor and accepts a new key", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(false);
    isVercelRuntimeMock.mockReturnValue(false);
    readFileMock.mockResolvedValue(JSON.stringify({
      updatedAt: "2026-09-01T09:00:00.000Z",
      records: [{
        id: "partner-existing",
        createdAt: "2026-09-01T09:00:00.000Z",
        submittedByUserId: "user-1",
        submittedByEmail: "partner@example.com",
        idempotencyKey: "partner-onboarding-retry-1",
        status: "pending_admin_review",
        creatorState: "pending",
        ...partnerInput,
        publicWebsiteConsent: false,
      }],
    }));

    const { appendPartnerOnboardingRequestWithResult } = await import("@/lib/partners/onboarding-requests-store");
    await expect(appendPartnerOnboardingRequestWithResult({
      submittedByUserId: "user-2",
      submittedByEmail: "other@example.com",
      input: partnerInput,
      idempotencyKey: "partner-onboarding-retry-1",
    })).rejects.toMatchObject({ code: "partner_onboarding_idempotency_conflict" });

    await expect(appendPartnerOnboardingRequestWithResult({
      submittedByUserId: "user-2",
      submittedByEmail: "other@example.com",
      input: partnerInput,
      idempotencyKey: "partner-onboarding-retry-2",
    })).resolves.toMatchObject({ replayed: false, record: { submittedByUserId: "user-2" } });

    expect(writeFileMock).toHaveBeenCalledOnce();
    expect(appendPublishedPartnerAnnuaireEntryMock).toHaveBeenCalledOnce();
  });
});
