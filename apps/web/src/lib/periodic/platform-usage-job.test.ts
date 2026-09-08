import { describe, expect, it, vi } from "vitest";
import {
  PLATFORM_USAGE_JOB_VERSION,
  PLATFORM_USAGE_SNAPSHOT_KEY,
  runPlatformUsageJob,
} from "./platform-usage-job";

function snapshot(date: string) {
  return {
    id: `${PLATFORM_USAGE_SNAPSHOT_KEY}:${date}`,
    snapshotKey: PLATFORM_USAGE_SNAPSHOT_KEY,
    snapshotDate: date,
    generatedAt: `${date}T03:00:00.000Z`,
    version: PLATFORM_USAGE_JOB_VERSION,
    title: "Usage plateforme hebdomadaire",
    payload: {
      capturedAt: `${date}T03:00:00.000Z`,
      weekStart: date,
      storageUsage: {} as never,
      environmentalImpact: {} as never,
    },
    meta: {},
  };
}

describe("runPlatformUsageJob", () => {
  it("capture les deux sources et publie un snapshot hebdomadaire", async () => {
    const captureStorage = vi.fn(async () => ({ id: "storage" }) as never);
    const captureEnvironmentalImpact = vi.fn(async () => ({ id: "impact" }) as never);
    const writeSnapshot = vi.fn(async () => undefined);

    const result = await runPlatformUsageJob({
      now: new Date("2026-09-08T10:00:00.000Z"),
      captureStorage,
      captureEnvironmentalImpact,
      readSnapshot: async () => null,
      writeSnapshot,
    });

    expect(result.status).toBe("captured");
    expect(captureStorage).toHaveBeenCalledOnce();
    expect(captureEnvironmentalImpact).toHaveBeenCalledOnce();
    expect(writeSnapshot).toHaveBeenCalledOnce();
    expect(result.snapshot.snapshotDate).toBe("2026-09-07");
    expect(result.snapshot.payload.storageUsage).toEqual({ id: "storage" });
  });

  it("est idempotent dans la même semaine", async () => {
    const existing = snapshot("2026-09-07");
    const captureStorage = vi.fn();
    const captureEnvironmentalImpact = vi.fn();
    const writeSnapshot = vi.fn();

    const result = await runPlatformUsageJob({
      now: new Date("2026-09-08T10:00:00.000Z"),
      captureStorage,
      captureEnvironmentalImpact,
      readSnapshot: async () => existing,
      writeSnapshot,
    });

    expect(result).toEqual({ status: "reused", snapshot: existing });
    expect(captureStorage).not.toHaveBeenCalled();
    expect(captureEnvironmentalImpact).not.toHaveBeenCalled();
    expect(writeSnapshot).not.toHaveBeenCalled();
  });
});
