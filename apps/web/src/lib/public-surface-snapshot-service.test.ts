import { beforeEach, describe, expect, it, vi } from "vitest";

const readLatestPublicSurfaceSnapshotMock = vi.hoisted(() => vi.fn());
const isPublicSurfaceSnapshotFreshMock = vi.hoisted(() => vi.fn());
const getPublicSurfaceSnapshotDateMock = vi.hoisted(() => vi.fn(() => "2026-08-26"));
const upsertPublicSurfaceSnapshotMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/public-surface-snapshots", () => ({
  getPublicSurfaceSnapshotDate: getPublicSurfaceSnapshotDateMock,
  isPublicSurfaceSnapshotFresh: isPublicSurfaceSnapshotFreshMock,
  readLatestPublicSurfaceSnapshot: readLatestPublicSurfaceSnapshotMock,
  upsertPublicSurfaceSnapshot: upsertPublicSurfaceSnapshotMock,
}));

import { loadOrRefreshPublicSurfaceSnapshot } from "./public-surface-snapshot-service";

const NOW = new Date("2026-08-26T12:00:00.000Z");

function existingSnapshot(version = "v1", payload = "old") {
  return {
    id: "existing-id",
    snapshotKey: "test-snapshot",
    snapshotDate: "2026-08-25",
    generatedAt: "2026-08-25T12:00:00.000Z",
    version,
    title: "Test snapshot",
    payload,
    meta: {},
  };
}

function params(overrides: Record<string, unknown> = {}) {
  return {
    snapshotKey: "test-snapshot",
    title: "Test snapshot",
    version: "v1",
    ttlMinutes: 15,
    buildPayload: vi.fn<() => Promise<string>>().mockResolvedValue("new"),
    now: NOW,
    ...overrides,
  };
}

describe("loadOrRefreshPublicSurfaceSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readLatestPublicSurfaceSnapshotMock.mockResolvedValue(existingSnapshot());
    isPublicSurfaceSnapshotFreshMock.mockReturnValue(false);
    upsertPublicSurfaceSnapshotMock.mockResolvedValue(undefined);
  });

  it("réutilise un snapshot frais de la même version", async () => {
    const existing = existingSnapshot("v1", "fresh");
    readLatestPublicSurfaceSnapshotMock.mockResolvedValue(existing);
    isPublicSurfaceSnapshotFreshMock.mockReturnValue(true);
    const options = params();

    await expect(loadOrRefreshPublicSurfaceSnapshot(options)).resolves.toBe(existing);

    expect(options.buildPayload).not.toHaveBeenCalled();
    expect(upsertPublicSurfaceSnapshotMock).not.toHaveBeenCalled();
  });

  it("reconstruit un snapshot stale de la même version", async () => {
    const options = params();

    const result = await loadOrRefreshPublicSurfaceSnapshot(options);

    expect(result.version).toBe("v1");
    expect(result.payload).toBe("new");
    expect(options.buildPayload).toHaveBeenCalledOnce();
    expect(upsertPublicSurfaceSnapshotMock).toHaveBeenCalledOnce();
  });

  it("autorise le fallback stale si la reconstruction de la même version échoue", async () => {
    const existing = existingSnapshot("v1", "stale");
    const options = params({
      buildPayload: vi.fn<() => Promise<string>>().mockRejectedValue(new Error("rebuild failed")),
    });
    readLatestPublicSurfaceSnapshotMock.mockResolvedValue(existing);

    await expect(loadOrRefreshPublicSurfaceSnapshot(options)).resolves.toBe(existing);

    expect(upsertPublicSurfaceSnapshotMock).not.toHaveBeenCalled();
  });

  it("crée le nouveau snapshot après une montée de version réussie", async () => {
    const options = params({ version: "v2" });

    const result = await loadOrRefreshPublicSurfaceSnapshot(options);

    expect(result.version).toBe("v2");
    expect(result.payload).toBe("new");
    expect(upsertPublicSurfaceSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({ version: "v2", payload: "new" }),
    );
  });

  it("propage l'erreur après une montée de version échouée sans fallback", async () => {
    const existing = existingSnapshot("v1", "old-version-payload");
    const error = new Error("v2 rebuild failed");
    const options = params({
      version: "v2",
      buildPayload: vi.fn<() => Promise<string>>().mockRejectedValue(error),
    });
    readLatestPublicSurfaceSnapshotMock.mockResolvedValue(existing);

    await expect(loadOrRefreshPublicSurfaceSnapshot(options)).rejects.toBe(error);
    expect(upsertPublicSurfaceSnapshotMock).not.toHaveBeenCalled();
  });

  it("propage l'erreur si aucun snapshot n'existe", async () => {
    const error = new Error("initial build failed");
    const options = params({
      buildPayload: vi.fn<() => Promise<string>>().mockRejectedValue(error),
    });
    readLatestPublicSurfaceSnapshotMock.mockResolvedValue(null);

    await expect(loadOrRefreshPublicSurfaceSnapshot(options)).rejects.toBe(error);
    expect(upsertPublicSurfaceSnapshotMock).not.toHaveBeenCalled();
  });
});
