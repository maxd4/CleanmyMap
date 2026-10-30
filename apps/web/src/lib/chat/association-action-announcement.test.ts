import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  buildOfficialAssociationAnnouncementContent,
  isEligibleForOfficialAssociationAnnouncement,
} from "./association-action-announcement";

const baseAction = {
  id: "action-1",
  action_date: "2099-06-15",
  event_start_time: "09:30:00",
  event_end_time: "12:00:00",
  location_label: "Parc public",
  actor_name: "Membre",
  organizer_name: "Association propre",
  organizer_type: "association" as const,
  status: "approved" as const,
  review_state: "approved" as const,
  published_at: "2099-01-01T10:00:00.000Z",
  moderation_visibility: "visible" as const,
  action_phase: "pre_action" as const,
  access_mode: "public" as const,
  preparation_data: {
    actionTitle: "Nettoyage du parc",
    shortDescription: "Une présentation courte et publique.",
  },
};

describe("official association action announcement", () => {
  it("requires the approved, public, visible future publication contract", () => {
    const now = new Date("2099-01-01T09:00:00.000Z");
    expect(isEligibleForOfficialAssociationAnnouncement(baseAction, now)).toBe(true);
    expect(isEligibleForOfficialAssociationAnnouncement({ ...baseAction, review_state: "pending_review" }, now)).toBe(false);
    expect(isEligibleForOfficialAssociationAnnouncement({ ...baseAction, access_mode: "invite_link" }, now)).toBe(false);
    expect(isEligibleForOfficialAssociationAnnouncement({ ...baseAction, status: "cancelled" }, now)).toBe(false);
    expect(isEligibleForOfficialAssociationAnnouncement({ ...baseAction, moderation_visibility: "hidden" }, now)).toBe(false);
  });

  it("builds a bounded public presentation with the canonical action link", () => {
    const presentation = buildOfficialAssociationAnnouncementContent(baseAction);
    expect(presentation.content).toContain("Nettoyage du parc");
    expect(presentation.content).toContain("Une présentation courte et publique.");
    expect(presentation.content).toContain("Organisé par : Association propre");
    expect(presentation.content).toContain("/sections/rejoindre-une-action?actionId=action-1");
    expect(presentation.content).not.toContain("preparation_data");
    expect(presentation.href).toBe("/sections/rejoindre-une-action?actionId=action-1");
  });
});
