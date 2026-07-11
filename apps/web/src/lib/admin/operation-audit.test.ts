import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({
  canUseSupabaseServerPersistence: () => true,
  allowLocalFileStoreFallback: () => false,
  assertPersistenceAvailable: () => undefined,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

function createAuditClientMock(params: {
  auditRows: Array<{
    operation_id: string;
    at: string;
    actor_user_id: string;
    operation_type: "moderation" | "import_dry_run" | "import_confirm";
    outcome: "success" | "error";
    target_id: string | null;
    details: Record<string, unknown>;
  }>;
  profiles: Array<{
    id: string;
    display_name: string | null;
    handle: string | null;
  }>;
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
      Promise.resolve({
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
});
