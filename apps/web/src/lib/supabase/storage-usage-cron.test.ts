import { describe, expect, it } from "vitest";
import {
  buildStorageUsageCronStatus,
  getNextStorageUsageCronRun,
  STORAGE_USAGE_CRON_SCHEDULE,
} from "./storage-usage-cron";

describe("storage usage cron schedule", () => {
  it("keeps the next run on the first day at 03:00 UTC before the schedule fires", () => {
    const nextRun = getNextStorageUsageCronRun(
      new Date("2026-05-01T02:59:59.000Z"),
    );

    expect(nextRun.toISOString()).toBe("2026-05-01T03:00:00.000Z");
  });

  it("rolls the next run to the following month once the schedule has passed", () => {
    const nextRun = getNextStorageUsageCronRun(
      new Date("2026-05-01T03:00:00.000Z"),
    );

    expect(nextRun.toISOString()).toBe("2026-06-01T03:00:00.000Z");
  });

  it("handles the December rollover correctly", () => {
    const nextRun = getNextStorageUsageCronRun(
      new Date("2026-12-15T12:00:00.000Z"),
    );

    expect(nextRun.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });

  it("builds a readable cron status card payload", () => {
    const status = buildStorageUsageCronStatus(
      false,
      new Date("2026-05-20T12:00:00.000Z"),
    );

    expect(status.configured).toBe(false);
    expect(status.statusLabel).toBe("À configurer");
    expect(status.schedule).toBe(STORAGE_USAGE_CRON_SCHEDULE);
    expect(status.nextRunAt).toBe("2026-06-01T03:00:00.000Z");
    expect(status.nextRunLabel).toContain("1 juin 2026");
    expect(status.nextRunLabel).toContain("03:00");
  });
});
