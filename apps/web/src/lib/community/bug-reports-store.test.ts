import { beforeEach, describe, expect, it, vi } from "vitest";

const canUseSupabaseServerPersistenceMock = vi.hoisted(() => vi.fn());
const readLocalRecordStoreMock = vi.hoisted(() => vi.fn());

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
  getSupabaseServerClient: vi.fn(),
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
});
