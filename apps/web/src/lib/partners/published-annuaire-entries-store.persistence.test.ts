import { beforeEach, describe, expect, it, vi } from "vitest";

const canUseSupabaseServerPersistenceMock = vi.hoisted(() => vi.fn(() => true));
const assertPersistenceAvailableMock = vi.hoisted(() => vi.fn());
const readSupabaseRecordsMock = vi.hoisted(() => vi.fn(async () => []));
const readSupabaseRecordMock = vi.hoisted(() => vi.fn(async () => null));
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({
  assertPersistenceAvailable: assertPersistenceAvailableMock,
  canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock,
  readSupabaseRecords: readSupabaseRecordsMock,
  readSupabaseRecord: readSupabaseRecordMock,
  readLocalRecordStore: vi.fn(),
  writeLocalRecordStore: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));

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
});
