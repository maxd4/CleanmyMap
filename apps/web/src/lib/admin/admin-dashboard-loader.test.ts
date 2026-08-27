import { beforeEach, describe, expect, it, vi } from "vitest";

const runActionQueryMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadCreatorInboxItemsMock = vi.hoisted(() => vi.fn());
const listModeratableSignalementsMock = vi.hoisted(() => vi.fn());
const listPublishedPartnerAnnuaireEntriesMock = vi.hoisted(() => vi.fn());
const listAdminOperationAuditMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/query", () => ({ runActionQuery: runActionQueryMock }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/community/creator-inbox-loader", () => ({
  loadCreatorInboxItems: loadCreatorInboxItemsMock,
}));
vi.mock("@/lib/admin/signalement-moderation", () => ({
  listModeratableSignalements: listModeratableSignalementsMock,
}));
vi.mock("@/lib/partners/published-annuaire-entries-store", () => ({
  listPublishedPartnerAnnuaireEntries: listPublishedPartnerAnnuaireEntriesMock,
}));
vi.mock("@/lib/admin/operation-audit", () => ({
  listAdminOperationAudit: listAdminOperationAuditMock,
}));

function createSupabaseMock() {
  const actionCountChain = {
    select: vi.fn(() => actionCountChain),
    eq: vi.fn(async () => ({ count: 2, error: null })),
  };
  const groupJoinChain = {
    select: vi.fn(() => groupJoinChain),
    eq: vi.fn(async () => ({ count: 3, error: null })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "actions") return actionCountChain;
      if (table === "action_participants") return groupJoinChain;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe("loadAdminSources", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getSupabaseServerClientMock.mockReturnValue(createSupabaseMock());
    runActionQueryMock.mockResolvedValue([]);
    listModeratableSignalementsMock.mockResolvedValue({ items: [], count: 0 });
    loadCreatorInboxItemsMock.mockRejectedValue(new Error("creator inbox unavailable"));
    listPublishedPartnerAnnuaireEntriesMock.mockResolvedValue([]);
    listAdminOperationAuditMock.mockResolvedValue([]);
  });

  it("marks only the failed creator inbox source unavailable", async () => {
    const { loadAdminSources } = await import("./admin-dashboard-contract");

    const sources = await loadAdminSources();

    expect(sources.actions).toMatchObject({ status: "available" });
    expect(sources.groupJoin).toMatchObject({ status: "available" });
    expect(sources.signalements).toMatchObject({ status: "available" });
    expect(sources.creatorInbox).toEqual({ status: "unavailable" });
    expect(sources.publishedEntries).toMatchObject({ status: "available" });
    expect(sources.audit).toMatchObject({ status: "available" });
  });
});
