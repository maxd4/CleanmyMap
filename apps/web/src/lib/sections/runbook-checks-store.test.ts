import { beforeEach, describe, expect, it, vi } from "vitest";

const fsMocks = vi.hoisted(() => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

const persistenceMocks = vi.hoisted(() => ({
  allowLocalFileStoreFallback: vi.fn(),
  assertPersistenceAvailable: vi.fn(),
  canUseSupabaseServerPersistence: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("node:fs/promises", () => fsMocks);
vi.mock("@/lib/persistence/runtime-store", () => persistenceMocks);
vi.mock("@/lib/supabase/server", () => supabaseMocks);

import {
  listRunbookChecks,
  RunbookCheckPersistenceError,
  upsertRunbookCheck,
} from "./runbook-checks-store";

const localStore = {
  version: "2026.04",
  checks: [
    {
      profile: "ops",
      status: "pass",
      durationSeconds: 90,
      lastRunAt: "2026-10-31T10:00:00.000Z",
      notes: ["local"],
    },
  ],
};

function selectResult(result: unknown) {
  return {
    select: vi.fn(() => ({
      order: vi.fn().mockResolvedValue(result),
    })),
  };
}

function upsertResult(result: unknown) {
  return {
    upsert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue(result),
      })),
    })),
  };
}

describe("runbook-checks-store", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    persistenceMocks.allowLocalFileStoreFallback.mockReturnValue(false);
    persistenceMocks.canUseSupabaseServerPersistence.mockReturnValue(false);
    fsMocks.mkdir.mockResolvedValue(undefined);
    fsMocks.writeFile.mockResolvedValue(undefined);
    fsMocks.readFile.mockRejectedValue(new Error("local store absent"));
  });

  it("returns the canonical local defaults when the ephemeral file is absent", async () => {
    await expect(listRunbookChecks({ allowFallback: true })).resolves.toEqual({
      version: "2026.04",
      checks: [
        expect.objectContaining({ profile: "ops", status: "pass" }),
        expect.objectContaining({ profile: "admin", status: "pass" }),
        expect.objectContaining({ profile: "dev", status: "pass" }),
      ],
    });
    expect(fsMocks.readFile).toHaveBeenCalledTimes(1);
  });

  it("projects Supabase rows into the stable profile order and filters note payloads", async () => {
    persistenceMocks.canUseSupabaseServerPersistence.mockReturnValue(true);
    const rows = [
      {
        profile: "dev",
        status: "fail",
        duration_seconds: 12,
        last_run_at: null,
        notes: ["api", 42, null],
      },
      {
        profile: "ops",
        status: "pass",
        duration_seconds: 8,
        last_run_at: "2026-10-31T10:00:00.000Z",
        notes: "not-an-array",
      },
    ];
    supabaseMocks.getSupabaseServerClient.mockReturnValue({
      from: vi.fn(() => selectResult({ data: rows, error: null })),
    });

    await expect(listRunbookChecks({ allowFallback: false })).resolves.toEqual({
      version: "2026.04",
      checks: [
        expect.objectContaining({ profile: "ops", notes: [] }),
        expect.objectContaining({ profile: "admin", notes: ["Import dry-run -> confirmer -> journal"] }),
        expect.objectContaining({ profile: "dev", notes: ["api"], lastRunAt: "" }),
      ],
    });
    expect(fsMocks.readFile).not.toHaveBeenCalled();
  });

  it("does not silently fall back when the caller forbids fallback", async () => {
    persistenceMocks.canUseSupabaseServerPersistence.mockReturnValue(true);
    supabaseMocks.getSupabaseServerClient.mockReturnValue({
      from: vi.fn(() => selectResult({ data: null, error: { message: "provider unavailable" } })),
    });

    await expect(listRunbookChecks({ allowFallback: false })).rejects.toThrow("provider unavailable");
    expect(fsMocks.readFile).not.toHaveBeenCalled();
  });

  it("uses the local file only when provider failure and fallback are both allowed", async () => {
    persistenceMocks.canUseSupabaseServerPersistence.mockReturnValue(true);
    fsMocks.readFile.mockResolvedValue(JSON.stringify(localStore));
    supabaseMocks.getSupabaseServerClient.mockReturnValue({
      from: vi.fn(() => selectResult({ data: null, error: { message: "temporary provider failure" } })),
    });

    await expect(listRunbookChecks({ allowFallback: true })).resolves.toEqual(localStore);
    expect(fsMocks.readFile).toHaveBeenCalledTimes(1);
  });

  it("stops before any read or provider call when persistence is unavailable", async () => {
    persistenceMocks.assertPersistenceAvailable.mockImplementation(() => {
      throw new Error("persistence unavailable");
    });

    await expect(listRunbookChecks()).rejects.toThrow("persistence unavailable");
    expect(fsMocks.readFile).not.toHaveBeenCalled();
    expect(supabaseMocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("replaces an existing local profile without duplicating the other checks", async () => {
    fsMocks.readFile.mockResolvedValue(JSON.stringify(localStore));

    const output = await upsertRunbookCheck({
      profile: "ops",
      status: "fail",
      durationSeconds: 123,
      notes: ["retry"],
    });

    expect(output.checks).toHaveLength(1);
    expect(output.checks[0]).toEqual(
      expect.objectContaining({ profile: "ops", status: "fail", durationSeconds: 123, notes: ["retry"] }),
    );
    expect(fsMocks.writeFile).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fsMocks.writeFile.mock.calls[0]?.[1] as string).checks).toHaveLength(1);
  });

  it("classifies a local write failure as a non-partial persistence failure", async () => {
    fsMocks.writeFile.mockRejectedValue(new Error("disk full"));

    const error = await upsertRunbookCheck({
      profile: "dev",
      status: "pass",
      durationSeconds: 3,
      notes: [],
    }).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(RunbookCheckPersistenceError);
    expect(error).toMatchObject({ stage: "persistence", partialMutation: false });
  });

  it("does not fall back after a provider write failure when fallback is disabled", async () => {
    persistenceMocks.canUseSupabaseServerPersistence.mockReturnValue(true);
    supabaseMocks.getSupabaseServerClient.mockReturnValue({
      from: vi.fn(() => upsertResult({ data: null, error: { message: "write rejected" } })),
    });

    const error = await upsertRunbookCheck({
      profile: "admin",
      status: "fail",
      durationSeconds: 4,
      notes: [],
    }).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(RunbookCheckPersistenceError);
    expect(error).toMatchObject({ stage: "persistence", partialMutation: false });
    expect(fsMocks.writeFile).not.toHaveBeenCalled();
  });

  it("classifies a successful provider write with failed readback as partial post-write", async () => {
    persistenceMocks.canUseSupabaseServerPersistence.mockReturnValue(true);
    const from = vi
      .fn()
      .mockReturnValueOnce(upsertResult({ data: {}, error: null }))
      .mockReturnValueOnce(selectResult({ data: null, error: { message: "readback failed" } }));
    supabaseMocks.getSupabaseServerClient.mockReturnValue({ from });

    const error = await upsertRunbookCheck({
      profile: "ops",
      status: "pass",
      durationSeconds: 5,
      notes: ["provider"],
    }).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(RunbookCheckPersistenceError);
    expect(error).toMatchObject({ stage: "post_write", partialMutation: true });
    expect(fsMocks.writeFile).not.toHaveBeenCalled();
  });
});
