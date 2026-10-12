import { describe, expect, it } from "vitest";
import { parseSpogomiGalleryPhoto, resolvePublicSpogomiGallery } from "./photo-gallery";

const authorizedPhoto = {
  id: "photo-1",
  url: "https://cdn.example.test/spogomi/photo-1.jpg",
  alt: "Équipe SPOGOMI sur la zone de collecte",
  sourceUrl: "https://organizer.example.test/photos/photo-1",
  ownerName: "Organisateur local",
  rightsStatus: "authorized",
  approvedForPublication: true,
  subjectProtectionReviewed: true,
  minorProtectionReviewed: true,
  status: "published",
  approvedAt: "2026-10-12T08:00:00.000Z",
  publishedAt: "2026-10-12T09:00:00.000Z",
  withdrawnAt: null,
};

describe("SPOGOMI public photo gallery contract", () => {
  it("publishes only explicitly authorized photos and keeps withdrawn photos out", () => {
    expect(resolvePublicSpogomiGallery([authorizedPhoto, { ...authorizedPhoto, id: "withdrawn", status: "withdrawn", withdrawnAt: "2026-10-12T10:00:00.000Z" }])).toHaveLength(1);
    expect(resolvePublicSpogomiGallery([{ ...authorizedPhoto, id: "not-approved", approvedForPublication: false }])).toEqual([]);
  });

  it("requires owner, source, rights and minor-protection evidence", () => {
    expect(parseSpogomiGalleryPhoto({ ...authorizedPhoto, ownerName: "" })).toBeNull();
    expect(parseSpogomiGalleryPhoto({ ...authorizedPhoto, minorProtectionReviewed: false })).toBeNull();
    expect(parseSpogomiGalleryPhoto({ ...authorizedPhoto, sourceUrl: "https://example.test" })).not.toBeNull();
  });
});
