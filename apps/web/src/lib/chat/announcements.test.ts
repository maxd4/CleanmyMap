import { describe, expect, it } from "vitest";
import {
  buildAnnouncementDraft,
  COMMUNITY_ANNOUNCEMENT_TEMPLATES,
  getAnnouncementTopicId,
  isCommunityAnnouncementTemplateKey,
} from "./announcements";

describe("community announcement contract", () => {
  it("maps every canonical template to its persisted topic", () => {
    expect(COMMUNITY_ANNOUNCEMENT_TEMPLATES.map((template) => template.key)).toEqual([
      "relais_associatif",
      "benevoles",
      "diffusion",
    ]);
    expect(getAnnouncementTopicId("relais_associatif")).toBe("relais_associatif");
    expect(getAnnouncementTopicId("benevoles")).toBe("appel_aux_benevoles");
    expect(getAnnouncementTopicId("diffusion")).toBe("demande_diffusion");
  });

  it("prepares an editable draft without publishing or trusting an event URL", () => {
    expect(buildAnnouncementDraft("diffusion")).toContain("Demande de diffusion");
    expect(buildAnnouncementDraft("diffusion")).not.toContain("eventId");
    expect(isCommunityAnnouncementTemplateKey("unknown")).toBe(false);
  });
});
