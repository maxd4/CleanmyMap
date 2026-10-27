import { describe, expect, it } from "vitest";
import {
  buildStorageBusinessContributionAlertId,
  buildStorageBusinessContributionAlerts,
  getAlertSeverityRank,
  getAlertSignalRank,
  pushStorageBusinessContributionAlert,
} from "./storage-business-contribution-alerts";
import { STORAGE_BUSINESS_CONTRIBUTION_POLICY as policy } from "./storage-business-contribution-policy";
import type { StorageBusinessContributionHistoryPoint, StorageBusinessContributionTopFile } from "./storage-business-contribution-contracts";

function historyPoint(overrides: Partial<StorageBusinessContributionHistoryPoint> = {}): StorageBusinessContributionHistoryPoint {
  return {
    snapshotMonth: "2026-10-01",
    monthLabel: "octobre 2026",
    currentBytes: 100,
    currentCount: 1,
    sharePercent: 10,
    deltaBytes: 100,
    deltaCount: 1,
    deltaPercent: 40,
    cumulative3MonthBytes: 100,
    cumulative3MonthPercent: 40,
    accelerationBytes: policy.accelerationWarningBytes,
    accelerationPercent: 10,
    ...overrides,
  };
}

function topFile(bytes: number): StorageBusinessContributionTopFile {
  return {
    bucketId: "prints",
    bucketLabel: "prints",
    name: "exports/impact.csv",
    extension: "csv",
    bytes,
    sizeLabel: `${bytes} B`,
    createdAt: null,
    updatedAt: null,
  };
}

function params(overrides: Partial<Parameters<typeof buildStorageBusinessContributionAlerts>[0]> = {}) {
  return {
    domainId: "actions_terrain" as const,
    label: "Actions terrain",
    history: [historyPoint()],
    currentBytes: 100,
    currentSharePercent: 10,
    topFiles: [],
    ...overrides,
  };
}

describe("storage business contribution alert decisions", () => {
  it("ranks all known severities and signals, and keeps alert ids deterministic", () => {
    expect(getAlertSeverityRank("critical")).toBeGreaterThan(getAlertSeverityRank("warning"));
    expect(getAlertSeverityRank("warning")).toBeGreaterThan(getAlertSeverityRank("info"));
    expect(getAlertSignalRank("growth")).toBeGreaterThan(getAlertSignalRank("quotaShare"));
    expect(getAlertSignalRank("photoDominance")).toBeGreaterThan(getAlertSignalRank("quotaShare"));
    expect(getAlertSignalRank("unknown" as never)).toBe(0);
    expect(buildStorageBusinessContributionAlertId("actions_terrain", "growth-warning", "2026-10-01"))
      .toBe("actions_terrain:growth-warning:2026-10-01");
  });

  it("does not invent alerts without a current history point", () => {
    expect(buildStorageBusinessContributionAlerts(params({ history: [], currentSharePercent: 90 }))).toEqual([]);
  });

  it("distinguishes quota, growth and acceleration warning from critical thresholds", () => {
    const alerts = buildStorageBusinessContributionAlerts(params({
      history: [historyPoint({ deltaPercent: policy.growthCriticalPercent, accelerationBytes: policy.accelerationCriticalBytes })],
      currentSharePercent: policy.shareCriticalPercent,
    }));
    expect(alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ signal: "quotaShare", severity: "critical", thresholdSharePercent: policy.shareCriticalPercent }),
      expect.objectContaining({ signal: "growth", severity: "critical" }),
      expect.objectContaining({ signal: "acceleration", severity: "critical", thresholdBytes: policy.accelerationCriticalBytes }),
    ]));
  });

  it("uses the current snapshot fallback for photo dominance and heavy exports", () => {
    const photoAlerts = buildStorageBusinessContributionAlerts(params({
      domainId: "pieces_jointes_photo",
      label: "Photos",
      history: [],
      currentSharePercent: policy.photoDominanceSharePercent,
    }));
    expect(photoAlerts).toContainEqual(expect.objectContaining({ signal: "photoDominance", snapshotMonth: "current" }));

    const heavyTopFile = buildStorageBusinessContributionAlerts(params({
      domainId: "socle_estimateur_impact",
      label: "Exports",
      topFiles: [topFile(policy.socleHeavyExportBytes)],
    }));
    expect(heavyTopFile).toContainEqual(expect.objectContaining({ signal: "heavyExports", severity: "critical" }));

    const heavyTotal = buildStorageBusinessContributionAlerts(params({
      domainId: "socle_estimateur_impact",
      currentBytes: policy.socleHeavyExportBytes,
      topFiles: [],
    }));
    expect(heavyTotal).toContainEqual(expect.objectContaining({ signal: "heavyExports", severity: "warning" }));
  });

  it("emits an acceleration anomaly only after three positive, increasing deltas", () => {
    const noAnomaly = buildStorageBusinessContributionAlerts(params({
      history: [historyPoint({ deltaBytes: 150 }), historyPoint({ deltaBytes: 100 })],
    }));
    expect(noAnomaly.some((alert) => alert.id.includes(":anomaly:"))).toBe(false);

    const anomaly = buildStorageBusinessContributionAlerts(params({
      history: [historyPoint({ deltaBytes: 160 }), historyPoint({ deltaBytes: 100 }), historyPoint({ deltaBytes: 80 })],
    }));
    expect(anomaly).toContainEqual(expect.objectContaining({ signal: "acceleration", title: "Accélération anormale détectée" }));
  });

  it("does not duplicate an alert with an already persisted id", () => {
    const alert = {
      id: "actions_terrain:growth-warning:2026-10-01",
      domainId: "actions_terrain" as const,
      label: "Actions terrain",
      title: "Croissance rapide",
      message: "déjà présent",
      severity: "warning" as const,
      signal: "growth" as const,
      snapshotMonth: "2026-10-01",
      currentBytes: 1,
      thresholdBytes: null,
      currentSharePercent: 1,
      thresholdSharePercent: null,
    };
    const alerts = [alert];
    pushStorageBusinessContributionAlert(alerts, alert);
    expect(alerts).toHaveLength(1);
  });
});
