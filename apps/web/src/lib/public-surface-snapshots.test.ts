import { describe, expect, it } from "vitest";
import {
  getPublicSurfaceSnapshotDate,
  isPublicSurfaceSnapshotFresh,
} from "./public-surface-snapshots";

describe("public surface snapshots", () => {
  it("formats the snapshot date from the generation timestamp", () => {
    expect(getPublicSurfaceSnapshotDate("2026-06-27T10:15:00.000Z")).toBe("2026-06-27");
  });

  it("detects freshness within the configured ttl", () => {
    const now = new Date("2026-06-27T10:30:00.000Z");

    expect(
      isPublicSurfaceSnapshotFresh(
        { generatedAt: "2026-06-27T10:20:00.000Z" },
        15,
        now,
      ),
    ).toBe(true);

    expect(
      isPublicSurfaceSnapshotFresh(
        { generatedAt: "2026-06-27T10:10:00.000Z" },
        15,
        now,
      ),
    ).toBe(false);
  });
});

