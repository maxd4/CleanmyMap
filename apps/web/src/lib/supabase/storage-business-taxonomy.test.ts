import { describe, expect, it } from "vitest";
import { classifyStorageBusinessDomain, listStorageBusinessDomains } from "./storage-business-taxonomy";

describe("storage business taxonomy", () => {
  it("exposes the stable business domains", () => {
    expect(listStorageBusinessDomains().map((domain) => domain.id)).toEqual([
      "socle_estimateur_impact",
      "emails",
      "messages",
      "pieces_jointes_photo",
      "pieces_jointes_document",
      "actions_terrain",
      "donnees_utilisateur",
      "badges_gamification",
      "autres",
    ]);
  });

  it("classifies storage objects by the strongest business signal", () => {
    expect(
      classifyStorageBusinessDomain({
        bucketId: "prints",
        name: "reports/rapport-mensuel.pdf",
        mimeType: "application/pdf",
      }).id,
    ).toBe("socle_estimateur_impact");

    expect(
      classifyStorageBusinessDomain({
        bucketId: "chat-attachments",
        name: "dm/report.pdf",
        mimeType: "application/pdf",
      }).id,
    ).toBe("pieces_jointes_document");

    expect(
      classifyStorageBusinessDomain({
        bucketId: "chat-attachments",
        name: "dm/photo.jpg",
        mimeType: "image/jpeg",
      }).id,
    ).toBe("pieces_jointes_photo");

    expect(
      classifyStorageBusinessDomain({
        bucketId: "action-photos",
        name: "action-1/photo-1.jpg",
        mimeType: "image/jpeg",
      }).id,
    ).toBe("pieces_jointes_photo");

    expect(
      classifyStorageBusinessDomain({
        bucketId: "mission-assets",
        name: "mission-99/video.mp4",
        mimeType: "video/mp4",
      }).id,
    ).toBe("actions_terrain");

    expect(
      classifyStorageBusinessDomain({
        bucketId: "avatars",
        name: "profiles/user-1.png",
        mimeType: "image/png",
      }).id,
    ).toBe("donnees_utilisateur");

    expect(
      classifyStorageBusinessDomain({
        bucketId: "badges",
        name: "badges/welcome.svg",
        mimeType: "image/svg+xml",
      }).id,
    ).toBe("badges_gamification");

    expect(
      classifyStorageBusinessDomain({
        bucketId: "unknown",
        name: "misc/file.bin",
        mimeType: "application/octet-stream",
      }).id,
    ).toBe("autres");
  });
});
