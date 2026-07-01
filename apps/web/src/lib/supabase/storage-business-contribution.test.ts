import { describe, expect, it } from "vitest";
import { buildStorageBusinessContributions } from "./storage-business-contribution";
import {
  buildStorageUsageSnapshot,
  type StorageQuotaInfo,
  type StorageUsageObjectRow,
  type StorageUsageSnapshot,
} from "./storage-usage";

const quotaInfo: StorageQuotaInfo = {
  bytes: 20_000,
  label: "19.53 KB",
  source: "configured_bytes",
  configuredValue: "20000",
};

const currentObjects: StorageUsageObjectRow[] = [
  {
    bucket_id: "mission-assets",
    name: "mission-99/video.mp4",
    metadata: { size: 4_000, mimetype: "video/mp4" },
  },
  {
    bucket_id: "chat-attachments",
    name: "dm/report.pdf",
    metadata: { size: 3_000, mimetype: "application/pdf" },
  },
  {
    bucket_id: "prints",
    name: "reports/rapport-1.pdf",
    metadata: { size: 2_500, mimetype: "application/pdf" },
  },
  {
    bucket_id: "prints",
    name: "reports/rapport-2.pdf",
    metadata: { size: 1_500, mimetype: "application/pdf" },
  },
  {
    bucket_id: "chat-attachments",
    name: "dm/photo.jpg",
    metadata: { size: 1_200, mimetype: "image/jpeg" },
  },
  {
    bucket_id: "avatars",
    name: "profiles/user-1.png",
    metadata: { size: 800, mimetype: "image/png" },
  },
];

const previousBusinessBreakdown: StorageUsageSnapshot["businessBreakdown"] = [
  { key: "actions_terrain", label: "Actions terrain", bytes: 2_000, count: 1, sharePercent: 25, averageBytes: 2_000 },
  { key: "pieces_jointes_document", label: "Pièces jointes document", bytes: 1_000, count: 1, sharePercent: 12.5, averageBytes: 1_000 },
  { key: "socle_estimateur_impact", label: "Socle d’estimateur d’impact", bytes: 2_000, count: 1, sharePercent: 25, averageBytes: 2_000 },
  { key: "pieces_jointes_photo", label: "Pièces jointes photo", bytes: 1_000, count: 1, sharePercent: 12.5, averageBytes: 1_000 },
  { key: "donnees_utilisateur", label: "Données utilisateur", bytes: 800, count: 1, sharePercent: 10, averageBytes: 800 },
];

describe("storage business contributions", () => {
  it("builds per-domain contributions with monthly deltas and top files", () => {
    const current = buildStorageUsageSnapshot(currentObjects, quotaInfo, "2026-05-20T12:00:00.000Z");

    const previous: StorageUsageSnapshot = {
      ...current,
      snapshotMonth: "2026-04-01",
      generatedAt: "2026-04-20T12:00:00.000Z",
      totalBytes: 8_000,
      totalLabel: "7.81 KB",
      remainingBytes: 12_000,
      remainingLabel: "11.72 KB",
      usagePercent: 40,
      businessBreakdown: previousBusinessBreakdown,
    };

    const report = buildStorageBusinessContributions({
      objects: currentObjects,
      currentSnapshot: current,
      previousSnapshot: previous,
    });

    expectStorageBusinessContributionReport(report);
  });
});

function expectStorageBusinessContributionReport(
  report: ReturnType<typeof buildStorageBusinessContributions>,
): void {
  expectStorageBusinessContributionSummary(report);
  expectStorageBusinessContributionFiles(report);
  expectStorageBusinessContributionTail(report);
}

function expectStorageBusinessContributionSummary(
  report: ReturnType<typeof buildStorageBusinessContributions>,
): void {
  expect(report.previousSnapshotMonth).toBe("2026-04-01");
  expect(report.items[0]?.id).toBe("actions_terrain");
  expect(report.items[0]?.deltaBytes).toBe(2_000);
  expect(report.items[0]?.deltaPercent).toBe(100);
  expect(report.items[1]?.id).toBe("socle_estimateur_impact");
  expect(report.items[1]?.deltaCount).toBe(1);
}

function expectStorageBusinessContributionFiles(
  report: ReturnType<typeof buildStorageBusinessContributions>,
): void {
  expect(report.items[1]?.topFiles[0]?.name).toBe("reports/rapport-1.pdf");
  expect(report.items[1]?.topFiles[1]?.name).toBe("reports/rapport-2.pdf");
  expect(report.items[1]?.mimeSubtypes[0]?.label).toBe("application/pdf");
  expect(report.items[1]?.mimeSubtypes[0]?.count).toBe(2);
}

function expectStorageBusinessContributionTail(
  report: ReturnType<typeof buildStorageBusinessContributions>,
): void {
  expect(report.items[2]?.id).toBe("pieces_jointes_document");
  expect(report.items[2]?.currentBytes).toBe(3_000);
  expect(report.items[4]?.id).toBe("donnees_utilisateur");
  expect(report.items[4]?.deltaBytes).toBe(0);
}
