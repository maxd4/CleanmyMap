import { describe, expect, it } from "vitest";
import { buildSpogomiGalleryPhotoInput, parseSpogomiGalleryPhoto, resolvePublicSpogomiGallery } from "./photo-gallery";

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
  approvedByUserId: "organizer-1",
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

  it("never fabricates publication attestations and keeps incomplete drafts private", () => {
    const base = {
      id: "photo-2",
      url: "https://cdn.example.test/spogomi/photo-2.jpg",
      alt: "Photo de terrain",
      sourceUrl: "https://organizer.example.test/photos/photo-2",
      ownerName: "Organisateur local",
    };
    expect(() => buildSpogomiGalleryPhotoInput({ ...base, status: "published" }, { approvedByUserId: "organizer-1", approvedAt: "2026-10-12T08:00:00.000Z" })).toThrow(/attestations explicites/);
    const draft = buildSpogomiGalleryPhotoInput({ ...base, status: "draft" }, { approvedByUserId: "organizer-1", approvedAt: "2026-10-12T08:00:00.000Z" });
    expect(draft).toMatchObject({ status: "draft", approvedForPublication: false, subjectProtectionReviewed: false, minorProtectionReviewed: false, approvedAt: null, approvedByUserId: null });
    expect(resolvePublicSpogomiGallery([draft])).toEqual([]);
  });

  it("records the server validator and timestamps only for an explicitly authorized publication", () => {
    const photo = buildSpogomiGalleryPhotoInput({
      id: "photo-3",
      url: "https://cdn.example.test/spogomi/photo-3.jpg",
      alt: "Photo autorisée",
      sourceUrl: "https://organizer.example.test/photos/photo-3",
      ownerName: "Organisateur local",
      status: "published",
      rightsStatus: "authorized",
      approvedForPublication: true,
      subjectProtectionReviewed: true,
      minorProtectionReviewed: true,
    }, { approvedByUserId: "organizer-2", approvedAt: "2026-10-12T11:00:00.000Z" });
    expect(photo).toMatchObject({ status: "published", approvedByUserId: "organizer-2", approvedAt: "2026-10-12T11:00:00.000Z", publishedAt: "2026-10-12T11:00:00.000Z" });
    expect(resolvePublicSpogomiGallery([photo])).toEqual([{ id: "photo-3", url: "https://cdn.example.test/spogomi/photo-3.jpg", width: null, height: null, alt: "Photo autorisée", caption: null, credit: null, sourceUrl: "https://organizer.example.test/photos/photo-3", ownerName: "Organisateur local", publishedAt: "2026-10-12T11:00:00.000Z" }]);
    expect(resolvePublicSpogomiGallery([photo])[0]).not.toHaveProperty("approvedByUserId");
  });
});
