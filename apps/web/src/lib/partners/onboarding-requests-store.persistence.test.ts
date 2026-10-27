import { beforeEach, describe, expect, it, vi } from "vitest";

const canUseSupabaseServerPersistenceMock = vi.hoisted(() => vi.fn(() => false));
const assertPersistenceAvailableMock = vi.hoisted(() => vi.fn());
const readLocalRecordStoreMock = vi.hoisted(() => vi.fn());
const writeLocalRecordStoreMock = vi.hoisted(() => vi.fn(async () => undefined));
const readSupabaseRecordMock = vi.hoisted(() => vi.fn(async () => null));
const readSupabaseRecordsMock = vi.hoisted(() => vi.fn(async () => []));
const persistSupabaseRecordMock = vi.hoisted(() => vi.fn(async () => ({ id: "request-1" })));
const deleteSupabaseRecordByIdMock = vi.hoisted(() => vi.fn(async () => true));
const deleteAndPersistRecordMock = vi.hoisted(() => vi.fn(async () => true));
const replaceAndPersistRecordMock = vi.hoisted(() => vi.fn(async () => ({ id: "request-1", creatorState: "treated" })));
const appendPublishedPartnerAnnuaireEntryMock = vi.hoisted(() => vi.fn(async () => undefined));
const buildPublishedPartnerAnnuaireEntryMock = vi.hoisted(() => vi.fn(() => ({ id: "entry-1", public_data: {}, private_admin_contact: {} })));
const serializePublishedPartnerAnnuaireEntryMock = vi.hoisted(() => vi.fn(() => ({ id: "entry-1", public_data: {}, private_admin_contact: {} })));
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({
  assertPersistenceAvailable: assertPersistenceAvailableMock,
  canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock,
  deleteAndPersistRecord: deleteAndPersistRecordMock,
  deleteSupabaseRecordById: deleteSupabaseRecordByIdMock,
  findRecordInList: (records: unknown[], predicate: (record: unknown) => boolean) => records.find(predicate) ?? null,
  persistSupabaseRecord: persistSupabaseRecordMock,
  readSupabaseRecord: readSupabaseRecordMock,
  readSupabaseRecords: readSupabaseRecordsMock,
  replaceAndPersistRecord: replaceAndPersistRecordMock,
}));
vi.mock("@/lib/persistence/local-record-store", () => ({
  readLocalRecordStore: readLocalRecordStoreMock,
  writeLocalRecordStore: writeLocalRecordStoreMock,
}));
vi.mock("./published-annuaire-entries-store", () => ({
  appendPublishedPartnerAnnuaireEntry: appendPublishedPartnerAnnuaireEntryMock,
  buildPublishedPartnerAnnuaireEntry: buildPublishedPartnerAnnuaireEntryMock,
  serializePublishedPartnerAnnuaireEntry: serializePublishedPartnerAnnuaireEntryMock,
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));

import {
  appendPartnerOnboardingRequestWithResult,
  countPartnerOnboardingRequests,
  deletePartnerOnboardingRequest,
  getPartnerOnboardingRequestById,
  listPartnerOnboardingRequests,
  updatePartnerOnboardingRequestCreatorState,
  updatePartnerOnboardingRequestStatus,
  type PartnerOnboardingRequestRecord,
} from "./onboarding-requests-store";

const request = {
  id: "request-1",
  createdAt: "2026-10-27T10:00:00.000Z",
  submittedByUserId: "user-1",
  submittedByEmail: null,
  idempotencyKey: "key-1",
  status: "pending_admin_review",
  creatorState: "pending",
  organizationName: "Structure",
  organizationType: "association",
  partnerScope: "local",
  legalIdentity: "Structure loi 1901",
  coverage: { arrondissements: [11], quartiers: [] },
  contributionTypes: ["communication"],
  engagementTypes: [],
  relayActions: "Relais locaux",
  availability: { slots: [] },
  contactName: "Contact",
  contactChannel: "Site public",
  contactDetails: "https://example.test",
  motivation: "Motivation suffisamment longue.",
  publicWebsiteUrl: "https://example.test",
  publicWebsiteConsent: true,
} as PartnerOnboardingRequestRecord;

function queryBuilder(result: unknown = { data: [request], error: null }) {
  const builder = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    or: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    update: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
  };
  return builder;
}

describe("partner onboarding request persistence branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canUseSupabaseServerPersistenceMock.mockReturnValue(false);
    readLocalRecordStoreMock.mockResolvedValue({ records: [request] });
  });

  it("covers local list, cursor, lookup, count, state transitions and deletion", async () => {
    await expect(listPartnerOnboardingRequests(0)).resolves.toEqual([request]);
    await expect(listPartnerOnboardingRequests(999, { createdAt: request.createdAt, id: "request-0" })).resolves.toEqual([]);
    await expect(getPartnerOnboardingRequestById("request-1")).resolves.toEqual(request);
    await expect(getPartnerOnboardingRequestById("missing")).resolves.toBeNull();
    await expect(countPartnerOnboardingRequests()).resolves.toBe(1);
    await expect(updatePartnerOnboardingRequestStatus({ requestId: "request-1", status: "accepted" })).resolves.toMatchObject({ status: "accepted", creatorState: "accepted" });
    await expect(updatePartnerOnboardingRequestStatus({ requestId: "missing", status: "rejected" })).resolves.toBeNull();
    await expect(updatePartnerOnboardingRequestCreatorState({ requestId: "request-1", creatorState: "treated" })).resolves.toMatchObject({ id: "request-1" });
    await expect(deletePartnerOnboardingRequest("request-1")).resolves.toBe(true);
    expect(appendPublishedPartnerAnnuaireEntryMock).toHaveBeenCalled();
  });

  it("replays the same local idempotency payload and rejects a different owner or payload", async () => {
    await expect(appendPartnerOnboardingRequestWithResult({ submittedByUserId: "user-1", input: request, idempotencyKey: "key-1" })).resolves.toMatchObject({ replayed: true });
    readLocalRecordStoreMock.mockResolvedValue({ records: [{ ...request, submittedByUserId: "other-user" }] });
    await expect(appendPartnerOnboardingRequestWithResult({ submittedByUserId: "user-1", input: request, idempotencyKey: "key-1" })).rejects.toMatchObject({ code: "partner_onboarding_idempotency_conflict" });
    readLocalRecordStoreMock.mockResolvedValue({ records: [{ ...request, organizationName: "Different", submittedByUserId: "user-1" }] });
    await expect(appendPartnerOnboardingRequestWithResult({ submittedByUserId: "user-1", input: request, idempotencyKey: "key-1" })).rejects.toMatchObject({ code: "partner_onboarding_idempotency_conflict" });
  });

  it("exercises Supabase query branches and count errors without local fallback", async () => {
    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    const builder = queryBuilder();
    getSupabaseServerClientMock.mockReturnValue({
      from: vi.fn(() => builder),
      rpc: vi.fn(async () => ({ data: [{ request_id: "request-1" }], error: null })),
    });
    readSupabaseRecordsMock.mockResolvedValue([request] as never);
    readSupabaseRecordMock.mockResolvedValue(request as never);
    await expect(listPartnerOnboardingRequests(600)).resolves.toEqual([request]);
    await expect(listPartnerOnboardingRequests(10, { createdAt: request.createdAt, id: "request-2" })).resolves.toEqual([request]);
    await expect(getPartnerOnboardingRequestById("request-1")).resolves.toEqual(request);
    await expect(updatePartnerOnboardingRequestStatus({ requestId: "request-1", status: "rejected" })).resolves.toEqual(request);
    await expect(updatePartnerOnboardingRequestCreatorState({ requestId: "request-1", creatorState: "archived" })).resolves.toEqual(request);
    await expect(deletePartnerOnboardingRequest("request-1")).resolves.toBe(true);
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn(() => ({ select: vi.fn(async () => ({ count: 3, error: null })) })) });
    await expect(countPartnerOnboardingRequests()).resolves.toBe(3);
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn(() => ({ select: vi.fn(async () => ({ count: null, error: { message: "count failed" } })) })) });
    await expect(countPartnerOnboardingRequests()).rejects.toThrow("count failed");
  });
});
