import { describe, expect, it } from "vitest";
import {
  buildStorageUsageSnapshot,
  formatStorageBytes,
  inferStorageFileTypeLabel,
} from "./storage-usage-calculations";

describe("storage usage calculations", () => {
  it("handles non-positive and non-finite byte values without exposing invalid labels", () => {
    expect(formatStorageBytes(-1)).toBe("0 B");
    expect(formatStorageBytes(Number.NaN)).toBe("0 B");
    expect(formatStorageBytes(Number.POSITIVE_INFINITY)).toBe("0 B");
    expect(formatStorageBytes(1025)).toBe("1 KB");
    expect(formatStorageBytes(1024 ** 3)).toBe("1 GB");
  });

  it("classifies explicit MIME types before falling back to safe extensions", () => {
    const mimeCases: Array<[string, string]> = [
      ["image/png", "Image"],
      ["video/webm", "Vidéo"],
      ["audio/mpeg", "Audio"],
      ["text/csv", "Données"],
      ["text/plain", "Texte"],
      ["application/pdf", "Document"],
      ["application/zip", "Archive"],
      ["image/svg+xml", "Image"],
    ];
    for (const [mime, expected] of mimeCases) {
      expect(inferStorageFileTypeLabel("unknown", mime)).toBe(expected);
    }
    expect(inferStorageFileTypeLabel("jpg", null)).toBe("Image");
    expect(inferStorageFileTypeLabel("csv", null)).toBe("Données");
    expect(inferStorageFileTypeLabel("pptx", null)).toBe("Présentation");
    expect(inferStorageFileTypeLabel("rar", null)).toBe("Archive");
    expect(inferStorageFileTypeLabel("mov", null)).toBe("Vidéo");
    expect(inferStorageFileTypeLabel("", null)).toBe("Sans extension");
    expect(inferStorageFileTypeLabel("bin", null)).toBe("BIN");
  });

  it("preserves zero-size and malformed metadata while keeping quota warnings exact", () => {
    const snapshot = buildStorageUsageSnapshot([
      { bucket_id: "misc", name: "empty.bin", metadata: { size: 0, mimetype: "application/octet-stream" } },
      { bucket_id: "misc", name: "invalid.bin", metadata: { size: "not-a-size" } },
    ], {
      bytes: 0,
      label: "0 B",
      source: "default_free",
      configuredValue: null,
    }, "2026-10-27T12:00:00.000Z");

    expect(snapshot.totalBytes).toBe(0);
    expect(snapshot.remainingBytes).toBe(0);
    expect(snapshot.usagePercent).toBe(0);
    expect(snapshot.bucketBreakdown[0]).toMatchObject({ bytes: 0, count: 2, sharePercent: 0, averageBytes: 0 });
    expect(snapshot.largestFiles).toHaveLength(2);
    expect(snapshot.warnings).toEqual([]);
  });

  it("covers exact unit boundaries, MIME mappings and quota warning thresholds", () => {
    expect(formatStorageBytes(1024 ** 2)).toBe("1 MB");
    expect(formatStorageBytes(10 * 1024 ** 2 + 512 * 1024)).toContain("MB");
    expect(inferStorageFileTypeLabel("unknown", "application/vnd.ms-excel")).toBe("Document");
    expect(inferStorageFileTypeLabel("unknown", "application/octet-stream")).toBe("UNKNOWN");
    expect(inferStorageFileTypeLabel("doc", null)).toBe("Document");
    expect(inferStorageFileTypeLabel("xlsx", null)).toBe("Données");

    const atWarning = buildStorageUsageSnapshot([
      { bucket_id: "documents", name: "report.pdf", metadata: { size: 80, mimetype: "application/pdf" } },
    ], { bytes: 100, label: "100 B", source: "configured_bytes", configuredValue: "100" }, "2026-10-27T12:00:00.000Z");
    expect(atWarning.warnings).toEqual(["Le quota Supabase Storage approche de la limite."]);
    const exceeded = buildStorageUsageSnapshot([
      { bucket_id: "documents", name: "report.pdf", metadata: { size: 100, mimetype: "application/pdf" } },
    ], { bytes: 100, label: "100 B", source: "configured_bytes", configuredValue: "100" }, "2026-10-27T12:00:00.000Z");
    expect(exceeded.warnings).toEqual([
      "Le quota Supabase Storage approche de la limite.",
      "Le quota Supabase Storage est dépassé.",
    ]);
    expect(exceeded.remainingLabel).toBe("0 B");
  });
});
