import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const readLocalRecordStoreMock = vi.hoisted(() => vi.fn());
const runtimeState = vi.hoisted(() => ({ allowFallback: false }));

vi.mock("@/lib/persistence/runtime-store", () => ({
  canUseSupabaseServerPersistence: () => true,
  allowLocalFileStoreFallback: () => runtimeState.allowFallback,
  assertPersistenceAvailable: () => undefined,
}));

vi.mock("@/lib/persistence/local-record-store", () => ({
  readLocalRecordStore: readLocalRecordStoreMock,
  writeLocalRecordStore: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

function createAuditClientMock(params: {
  auditRows: Array<{ target_id?: string | null; [key: string]: unknown }>;
  profiles: Array<{
    id: string;
    display_name: string | null;
    handle: string | null;
  }>;
  profilesError?: unknown;
}) {
  const state = {
    targetId: null as string | null,
    profileIds: [] as string[],
  };

  type AuditChain = {
    select: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
  };

  const auditChain: AuditChain = {
    select: vi.fn(() => auditChain),
    order: vi.fn(() => auditChain),
    limit: vi.fn(async (limit: number) => {
      const rows = state.targetId
        ? params.auditRows.filter((row) => row.target_id === state.targetId)
        : params.auditRows;

      return {
        data: rows.slice(0, limit),
        error: null,
      };
    }),
    eq: vi.fn((field: string, value: string) => {
      if (field === "target_id") {
        state.targetId = value;
      }
      return auditChain;
    }),
  };

  type ProfilesChain = {
    select: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    then: (
      resolve: (value: {
        data: Array<{
          id: string;
          display_name: string | null;
          handle: string | null;
        }>;
        error: null;
      }) => void,
      reject: (reason: unknown) => void,
    ) => Promise<void>;
  };

  const profilesChain: ProfilesChain = {
    select: vi.fn(() => profilesChain),
    in: vi.fn((field: string, values: string[]) => {
      if (field === "id") {
        state.profileIds = values;
      }
      return profilesChain;
    }),
    limit: vi.fn(() => profilesChain),
    then: (resolve, reject) =>
      params.profilesError
        ? Promise.reject(params.profilesError).then(resolve, reject)
        : Promise.resolve({
            data: params.profiles.filter((profile) =>
              state.profileIds.length === 0 ? true : state.profileIds.includes(profile.id),
            ),
            error: null,
          }).then(resolve, reject),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "admin_operations_audit") {
        return auditChain;
      }
      if (table === "profiles") {
        return profilesChain;
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe("admin operation audit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    runtimeState.allowFallback = false;
    readLocalRecordStoreMock.mockResolvedValue({
      updatedAt: "2026-06-20T11:00:00Z",
      records: [
        {
          operationId: "local-op",
          at: "2026-06-20T11:00:00Z",
          actorUserId: "local-admin",
          operationType: "admin_operation",
          outcome: "success",
          targetId: "action-local",
          details: { source: "local" },
        },
      ],
    });
  });

  it("filters by targetId and resolves the admin pseudo", async () => {
    getSupabaseServerClientMock.mockReturnValue(
      createAuditClientMock({
        auditRows: [
          {
            operation_id: "op-1",
            at: "2026-06-20T10:00:00Z",
            actor_user_id: "admin-1",
            operation_type: "moderation",
            outcome: "success",
            target_id: "action-1",
            details: { editedFields: ["locationLabel", "notes"] },
          },
          {
            operation_id: "op-2",
            at: "2026-06-20T09:00:00Z",
            actor_user_id: "admin-2",
            operation_type: "moderation",
            outcome: "error",
            target_id: "action-2",
            details: {},
          },
        ],
        profiles: [
          {
            id: "admin-1",
            display_name: "Maxence Deroome",
            handle: "maxence_deroome",
          },
          {
            id: "admin-2",
            display_name: "Alice Admin",
            handle: "alice_admin",
          },
        ],
      }),
    );

    const { listAdminOperationAudit } = await import("./operation-audit");
    const items = await listAdminOperationAudit(10, "action-1");

    expect(items).toHaveLength(1);
    expect(items[0]?.operationId).toBe("op-1");
    expect(items[0]?.actorLabel).toBe("Maxence Deroome (@maxence_deroome)");
    expect(items[0]?.details["editedFields"]).toEqual(["locationLabel", "notes"]);
  });

  it("falls back to local records when Supabase normalization rejects an invalid row", async () => {
    runtimeState.allowFallback = true;
    getSupabaseServerClientMock.mockReturnValue(
      createAuditClientMock({
        auditRows: [{ operation_id: "invalid-row" }],
        profiles: [],
      }),
    );

    const { listAdminOperationAudit } = await import("./operation-audit");
    const items = await listAdminOperationAudit();

    expect(items).toHaveLength(1);
    expect(items[0]?.operationId).toBe("local-op");
    expect(readLocalRecordStoreMock).toHaveBeenCalledTimes(1);
  });

  it("propagates an invalid Supabase row when local fallback is forbidden", async () => {
    getSupabaseServerClientMock.mockReturnValue(
      createAuditClientMock({
        auditRows: [{ operation_id: "invalid-row" }],
        profiles: [],
      }),
    );

    const { listAdminOperationAudit } = await import("./operation-audit");

    await expect(listAdminOperationAudit()).rejects.toThrow(
      "Admin audit returned an invalid persisted row.",
    );
    expect(readLocalRecordStoreMock).not.toHaveBeenCalled();
  });

  it("returns an empty Supabase result without reading local records", async () => {
    getSupabaseServerClientMock.mockReturnValue(
      createAuditClientMock({
        auditRows: [],
        profiles: [],
      }),
    );

    const { listAdminOperationAudit } = await import("./operation-audit");
    await expect(listAdminOperationAudit()).resolves.toEqual([]);
    expect(readLocalRecordStoreMock).not.toHaveBeenCalled();
  });

  it("falls back when asynchronous actor label loading rejects", async () => {
    runtimeState.allowFallback = true;
    getSupabaseServerClientMock.mockReturnValue(
      createAuditClientMock({
        auditRows: [
          {
            operation_id: "op-1",
            at: "2026-06-20T10:00:00Z",
            actor_user_id: "admin-1",
            operation_type: "moderation",
            outcome: "success",
            target_id: "action-1",
            details: {},
          },
        ],
        profiles: [],
        profilesError: new Error("profile lookup failed"),
      }),
    );

    const { listAdminOperationAudit } = await import("./operation-audit");
    const items = await listAdminOperationAudit();

    expect(items[0]?.operationId).toBe("local-op");
    expect(readLocalRecordStoreMock).toHaveBeenCalledTimes(1);
  });
});
