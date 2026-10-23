import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRuntimeStoreModule } from "@/lib/persistence/__tests__/runtime-store-mock";
import {
  configureSupabaseTestClient,
  type SupabaseTestResult,
} from "@/lib/persistence/__tests__/supabase-test-harness";

const allowLocalFileStoreFallbackMock = vi.hoisted(() => vi.fn());
const assertPersistenceAvailableMock = vi.hoisted(() => vi.fn());
const canUseSupabaseServerPersistenceMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const readFileMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/persistence/runtime-store", () => ({
  ...createRuntimeStoreModule(),
  allowLocalFileStoreFallback: allowLocalFileStoreFallbackMock,
  assertPersistenceAvailable: assertPersistenceAvailableMock,
  canUseSupabaseServerPersistence: canUseSupabaseServerPersistenceMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  readFile: readFileMock,
  writeFile: vi.fn(),
}));

const configureSupabase = (responses: Record<string, SupabaseTestResult[]>) =>
  configureSupabaseTestClient(getSupabaseServerClientMock, responses);

const row = {
  user_id: "user-1",
  checklist_id: "action-preparation",
  checks: { gloves: true },
  updated_at: "2026-10-23T08:00:00.000Z",
};

describe("checklist progress persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    canUseSupabaseServerPersistenceMock.mockReturnValue(true);
    allowLocalFileStoreFallbackMock.mockReturnValue(false);
    assertPersistenceAvailableMock.mockImplementation(() => undefined);
    readFileMock.mockRejectedValue(new Error("local file access must not occur"));
  });

  it("returns an existing Supabase progression", async () => {
    configureSupabase({ checklist_progress: [{ data: row, error: null }] });
    const { getChecklistProgress } = await import("./checklist-progress-store");

    await expect(getChecklistProgress("user-1", "action-preparation")).resolves.toEqual({
      userId: row.user_id,
      checklistId: row.checklist_id,
      checks: row.checks,
      updatedAt: row.updated_at,
    });
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "returns null for a successful empty Supabase read when local fallback is %s",
    async (fallbackAllowed) => {
      allowLocalFileStoreFallbackMock.mockReturnValue(fallbackAllowed);
      configureSupabase({ checklist_progress: [{ data: null, error: null }] });
      const { getChecklistProgress } = await import("./checklist-progress-store");

      await expect(getChecklistProgress("user-1", "action-preparation")).resolves.toBeNull();
      expect(readFileMock).not.toHaveBeenCalled();
    },
  );

  it("raises a Supabase read error when local fallback is disabled", async () => {
    configureSupabase({ checklist_progress: [{ data: null, error: { message: "read failed" } }] });
    const { getChecklistProgress } = await import("./checklist-progress-store");

    await expect(getChecklistProgress("user-1", "action-preparation")).rejects.toThrow("read failed");
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it("uses the local store only after a Supabase read error when fallback is allowed", async () => {
    allowLocalFileStoreFallbackMock.mockReturnValue(true);
    readFileMock.mockResolvedValue(JSON.stringify({ entries: [{
      userId: "user-1",
      checklistId: "action-preparation",
      checks: { gloves: false },
      updatedAt: "2026-10-22T08:00:00.000Z",
    }] }));
    configureSupabase({ checklist_progress: [{ data: null, error: { message: "read failed" } }] });
    const { getChecklistProgress } = await import("./checklist-progress-store");

    await expect(getChecklistProgress("user-1", "action-preparation")).resolves.toEqual({
      userId: "user-1",
      checklistId: "action-preparation",
      checks: { gloves: false },
      updatedAt: "2026-10-22T08:00:00.000Z",
    });
    expect(readFileMock).toHaveBeenCalledTimes(1);
  });
});
