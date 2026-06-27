import { describe, expect, it } from "vitest";
import {
  buildStorageUsageComparison,
  buildStorageUsageHistory,
  buildStorageUsageSnapshot,
  formatStorageBytes,
  type StorageQuotaInfo,
  type StorageUsageObjectRow,
  type StorageUsageSnapshot,
} from "./storage-usage";

const quotaInfo: StorageQuotaInfo = {
  bytes: 10_000,
  label: "9.77 KB",
  source: "configured_bytes",
  configuredValue: "10000",
};

const sampleObjects: StorageUsageObjectRow[] = [
  {
    bucket_id: "prints",
    name: "reports/rapport-mensuel.pdf",
    metadata: { size: 500, mimetype: "application/pdf" },
  },
  {
    bucket_id: "chat-attachments",
    name: "dm/report.pdf",
    metadata: { size: 3_000, mimetype: "application/pdf" },
  },
  {
    bucket_id: "action-photos",
    name: "action-1/photo-1.jpg",
    metadata: { size: 2_000, mimetype: "image/jpeg" },
  },
  {
    bucket_id: "mission-assets",
    name: "mission-99/video.mp4",
    metadata: { size: 4_500, mimetype: "video/mp4" },
  },
];

describe("storage usage monitoring", () => {
  it("formats bytes with human readable units", () => {
    expect(formatStorageBytes(0)).toBe("0 B");
    expect(formatStorageBytes(1_024)).toBe("1 KB");
    expect(formatStorageBytes(1_048_576)).toBe("1 MB");
  });

  it("builds a usable snapshot from storage objects", () => {
    const snapshot = buildStorageUsageSnapshot(sampleObjects, quotaInfo, "2026-05-20T12:00:00.000Z");

    expect(snapshot.snapshotMonth).toBe("2026-05-01");
    expect(snapshot.totalBytes).toBe(10_000);
    expect(snapshot.remainingBytes).toBe(0);
    expect(snapshot.usagePercent).toBe(100);
    expect(snapshot.objectCount).toBe(4);
    expect(snapshot.bucketBreakdown[0]?.label).toBe("mission-assets");
    expect(snapshot.businessBreakdown[0]?.label).toBe("Actions terrain");
    expect(snapshot.businessBreakdown[1]?.label).toBe("Pièces jointes document");
    expect(snapshot.businessBreakdown[2]?.label).toBe("Pièces jointes photo");
    expect(snapshot.businessBreakdown[3]?.label).toBe("Socle d’estimateur d’impact");
    expect(snapshot.extensionBreakdown[0]?.label).toBe("Vidéo");
    expect(snapshot.largestFiles[0]?.name).toBe("mission-99/video.mp4");
    expect(snapshot.largestFiles[0]?.businessLabel).toBe("Actions terrain");
    expect(snapshot.warnings).toContain("Le quota Supabase Storage est dépassé.");
  });

  it("compares monthly breakdowns", () => {
    const current = buildStorageUsageSnapshot(sampleObjects, quotaInfo, "2026-05-20T12:00:00.000Z");
    const previous: StorageUsageSnapshot = {
      ...current,
      snapshotMonth: "2026-04-01",
      generatedAt: "2026-04-20T12:00:00.000Z",
      totalBytes: 7_000,
      totalLabel: "6.84 KB",
      remainingBytes: 3_000,
      remainingLabel: "2.93 KB",
      usagePercent: 70,
      bucketBreakdown: [
        { key: "mission-assets", label: "mission-assets", bytes: 2_000, count: 1, sharePercent: 28.57, averageBytes: 2_000 },
        { key: "chat-attachments", label: "chat-attachments", bytes: 2_000, count: 1, sharePercent: 28.57, averageBytes: 2_000 },
        { key: "action-photos", label: "action-photos", bytes: 2_000, count: 1, sharePercent: 28.57, averageBytes: 2_000 },
        { key: "prints", label: "prints", bytes: 1_000, count: 1, sharePercent: 14.29, averageBytes: 1_000 },
      ],
      extensionBreakdown: [
        { key: "mp4", label: "Vidéo", bytes: 2_000, count: 1, sharePercent: 28.57, averageBytes: 2_000 },
        { key: "pdf", label: "Document", bytes: 3_000, count: 1, sharePercent: 42.86, averageBytes: 3_000 },
        { key: "jpg", label: "Image", bytes: 2_000, count: 1, sharePercent: 28.57, averageBytes: 2_000 },
      ],
      businessBreakdown: [
        { key: "actions_terrain", label: "Actions terrain", bytes: 2_000, count: 1, sharePercent: 28.57, averageBytes: 2_000 },
        { key: "pieces_jointes_document", label: "Pièces jointes document", bytes: 2_000, count: 1, sharePercent: 28.57, averageBytes: 2_000 },
        { key: "pieces_jointes_photo", label: "Pièces jointes photo", bytes: 2_000, count: 1, sharePercent: 28.57, averageBytes: 2_000 },
        { key: "socle_estimateur_impact", label: "Socle d’estimateur d’impact", bytes: 1_000, count: 1, sharePercent: 14.29, averageBytes: 1_000 },
      ],
      largestFiles: current.largestFiles,
      source: current.source,
      warnings: [],
    };

    const comparison = buildStorageUsageComparison(current, previous);

    expect(comparison.previousSnapshotMonth).toBe("2026-04-01");
    expect(comparison.deltaBytes).toBe(3_000);
    expect(comparison.bucketGrowth[0]?.label).toBe("mission-assets");
    expect(comparison.extensionGrowth[0]?.label).toBe("Vidéo");
  });

  it("orders history newest first", () => {
    const history = buildStorageUsageHistory([
      {
        snapshot_month: "2026-03-01",
        generated_at: "2026-03-20T12:00:00.000Z",
        quota_bytes: 10_000,
        total_bytes: 2_000,
        remaining_bytes: 8_000,
        usage_percent: 20,
        object_count: 1,
        bucket_breakdown: [],
        extension_breakdown: [],
        business_breakdown: [],
        largest_files: [],
        business_contributions: {},
        warnings: [],
      },
      {
        snapshot_month: "2026-05-01",
        generated_at: "2026-05-20T12:00:00.000Z",
        quota_bytes: 10_000,
        total_bytes: 4_000,
        remaining_bytes: 6_000,
        usage_percent: 40,
        object_count: 2,
        bucket_breakdown: [],
        extension_breakdown: [],
        business_breakdown: [],
        largest_files: [],
        business_contributions: {},
        warnings: [],
      },
    ]);

    expect(history[0]?.snapshotMonth).toBe("2026-05-01");
    expect(history[1]?.snapshotMonth).toBe("2026-03-01");
  });
});
