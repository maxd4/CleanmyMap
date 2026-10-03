import { describe, expect, it } from "vitest";
import {
  buildStorageBusinessContributionMimeSubtypesByDomain,
  buildStorageBusinessContributionTopFilesByDomain,
} from "./storage-business-contribution-analysis";

describe("storage business contribution object analysis", () => {
  it("keeps the three largest known-size files per domain in deterministic order", () => {
    const result = buildStorageBusinessContributionTopFilesByDomain([
      object("photos/zeta.jpg", 100),
      object("photos/alpha.jpg", 300),
      object("photos/beta.jpg", 200),
      object("photos/gamma.jpg", 50),
      object("photos/no-size.jpg"),
    ]);

    expect(result.get("pieces_jointes_photo")?.map((file) => [file.name, file.bytes])).toEqual([
      ["photos/alpha.jpg", 300],
      ["photos/beta.jpg", 200],
      ["photos/zeta.jpg", 100],
    ]);
  });

  it("limits MIME subtypes to five while retaining known and unknown sizes", () => {
    const result = buildStorageBusinessContributionMimeSubtypesByDomain([
      object("photos/a.jpg", 300, "image/jpeg"),
      object("photos/b.png", 200, "image/png"),
      object("photos/c.webp", 100, "image/webp"),
      object("photos/d.gif", 50, "image/gif"),
      object("photos/e.avif", 25, "image/avif"),
      object("photos/f.svg", 10, "image/svg+xml"),
      object("photos/no-size.jpg", undefined, "image/jpeg"),
    ]);

    const subtypes = result.get("pieces_jointes_photo") ?? [];
    expect(subtypes).toHaveLength(5);
    expect(subtypes[0]).toMatchObject({
      key: "image/jpeg",
      bytes: 300,
      count: 2,
      knownSizeCount: 1,
      averageBytes: 300,
    });
    expect(subtypes.every((subtype) => subtype.sharePercent !== null)).toBe(true);
  });

  it("returns null share and average when every size in a subtype is unknown", () => {
    const result = buildStorageBusinessContributionMimeSubtypesByDomain([
      object("photos/no-size.jpg", undefined, "image/jpeg"),
    ]);

    expect(result.get("pieces_jointes_photo")).toEqual([
      expect.objectContaining({
        key: "image/jpeg",
        bytes: 0,
        count: 1,
        knownSizeCount: 0,
        sharePercent: null,
        averageBytes: null,
      }),
    ]);
  });
});

function object(name: string, size?: number, mimetype = "image/jpeg") {
  return {
    bucket_id: "photos",
    name,
    metadata: {
      mimetype,
      ...(size === undefined ? {} : { size }),
    },
  };
}
