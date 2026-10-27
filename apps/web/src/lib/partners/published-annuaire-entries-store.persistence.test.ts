import { beforeEach, describe, expect, it, vi } from "vitest";

const canUseSupabaseServerPersistenceMock = vi.hoisted(() => vi.fn(() => true));
const assertPersistenceAvailableMock = vi.hoisted(() => vi.fn());
const readSupabaseRecordsMock = vi.hoisted(() => vi.fn(async () => []));
const readSupabaseRecordMock = vi.hoisted(() => vi.fn(async () => null));
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const readLocalRecordStoreMock = vi.hoisted(() => vi.fn());
const writeLocalRecordStoreMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({
  assertPersistenceAvailable: assertPersistenceAvailableMock,
  canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock,
  readSupabaseRecords: readSupabaseRecordsMock,
  readSupabaseRecord: readSupabaseRecordMock,
  readLocalRecordStore: vi.fn(),
  writeLocalRecordStore: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/persistence/local-record-store", () => ({
  readLocalRecordStore: readLocalRecordStoreMock,
  writeLocalRecordStore: writeLocalRecordStoreMock,
}));

import {
  getPublishedPartnerAnnuaireEntryById,
  listPublishedPartnerAnnuaireEntries,
  updatePublishedPartnerAnnuaireEntryPublicationStatus,
} from "./published-annuaire-entries-store";

function queryBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(async () => ({ data: [], error: null })),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  };
  return builder;
}

describe("published partner annuaire Supabase routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    const builder = queryBuilder();
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn(() => builder) });
    readSupabaseRecordsMock.mockResolvedValue([]);
    readSupabaseRecordMock.mockResolvedValue(null);
  });

  it("keeps list and lookup filters on the server owner", async () => {
    await expect(listPublishedPartnerAnnuaireEntries()).resolves.toEqual([]);
    await expect(listPublishedPartnerAnnuaireEntries({ publicationStatus: "accepted" })).resolves.toEqual([]);
    await expect(getPublishedPartnerAnnuaireEntryById("missing")).resolves.toBeNull();
    expect(readSupabaseRecordsMock).toHaveBeenCalledTimes(2);
    expect(readSupabaseRecordMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed on malformed review RPC responses and preserves status defaults", async () => {
    const rpc = vi.fn();
    getSupabaseServerClientMock.mockReturnValue({ rpc });
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(updatePublishedPartnerAnnuaireEntryPublicationStatus({ entryId: "entry-1", publicationStatus: "accepted", reviewedByUserId: "admin" })).resolves.toBeNull();
    rpc.mockResolvedValue({ data: null, error: { message: "review failed" } });
    await expect(updatePublishedPartnerAnnuaireEntryPublicationStatus({ entryId: "entry-1", publicationStatus: "rejected", reviewedByUserId: "admin" })).rejects.toThrow("review failed");
    rpc.mockResolvedValue({ malformed: true });
    await expect(updatePublishedPartnerAnnuaireEntryPublicationStatus({ entryId: "entry-1", publicationStatus: "accepted", reviewedByUserId: "admin" })).rejects.toThrow("invalid partner review response");
    rpc.mockResolvedValue({ data: { data: null }, error: null });
    await expect(updatePublishedPartnerAnnuaireEntryPublicationStatus({ entryId: "entry-1", publicationStatus: "accepted", reviewedByUserId: "admin" })).resolves.toBeNull();
  });

  it("deduplicates local publication requests and applies accepted or rejected review transitions", async () => {
    const existing = {
      id: "entry-existing",
      sourceRequestId: "request-existing",
      source: "partner_onboarding" as const,
      publishedAt: "2026-10-22T00:00:00.000Z",
      publicationStatus: "pending_admin_review" as const,
      name: "Structure locale",
      legalIdentity: "Structure locale",
      kind: "association",
      types: [],
      description: "Description",
      location: "Paris",
      lat: null,
      lng: null,
      coordinatesSource: "derived_coverage" as const,
      coveredArrondissements: [],
      contributionTypes: [],
      availability: "Sur demande",
      verificationStatus: "en_cours",
      qualificationStatus: "contact_non_qualifie",
      lastUpdatedAt: "2026-10-22T00:00:00.000Z",
      provenance: "published_partner" as const,
    };
    canUseSupabaseServerPersistenceMock.mockReturnValue(false);
    readLocalRecordStoreMock.mockResolvedValue({ updatedAt: "2026-10-22T00:00:00.000Z", records: [existing] });
    writeLocalRecordStoreMock.mockResolvedValue(undefined);
    const { appendPublishedPartnerAnnuaireEntry, listPublishedPartnerAnnuaireEntries, getPublishedPartnerAnnuaireEntryById, updatePublishedPartnerAnnuaireEntryPublicationStatus } = await import("./published-annuaire-entries-store");

    await expect(appendPublishedPartnerAnnuaireEntry({
      requestId: "request-existing",
      request: {
        organizationName: "Structure locale",
        organizationType: "association",
        partnerScope: "local",
        legalIdentity: "Structure locale",
        coverage: { arrondissements: [11], quartiers: [] },
        contributionTypes: ["communication"],
        relayActions: "Relais local",
        availability: { slots: [{ day: "mon", start: "09:00", end: "12:00" }] },
        contactName: "Contact",
        contactChannel: "Email",
        contactDetails: "contact@example.com",
        motivation: "Motivation",
      },
    }))
      .resolves.toEqual(existing);
    expect(writeLocalRecordStoreMock).not.toHaveBeenCalled();
    await expect(listPublishedPartnerAnnuaireEntries({ publicationStatus: "accepted" })).resolves.toEqual([]);
    await expect(getPublishedPartnerAnnuaireEntryById("entry-existing")).resolves.toEqual(existing);

    await expect(updatePublishedPartnerAnnuaireEntryPublicationStatus({
      entryId: "entry-existing",
      publicationStatus: "accepted",
      reviewedByUserId: "admin-1",
    })).resolves.toMatchObject({
      id: "entry-existing",
      publicationStatus: "accepted",
      verificationStatus: "verifie",
      reviewedByUserId: "admin-1",
    });
    await expect(updatePublishedPartnerAnnuaireEntryPublicationStatus({
      entryId: "missing",
      publicationStatus: "rejected",
      reviewedByUserId: "admin-1",
    })).resolves.toBeNull();
    expect(writeLocalRecordStoreMock).toHaveBeenCalledTimes(1);
  });
});
