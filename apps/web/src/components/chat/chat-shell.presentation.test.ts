import { describe, expect, it } from "vitest";
import {
  getChatShellMobilePresentation,
  getChatShellPresentation,
} from "./chat-shell.presentation";

describe("chat shell presentation model", () => {
  it("keeps channel, action, topic and status metadata aligned", () => {
    const presentation = getChatShellPresentation({
      activeChannelType: "action",
      activeTopicId: null,
      selectedActionId: "action-42",
      selectedRecipient: null,
      effectiveZone: "11e arrondissement",
      territoryFocus: null,
      locale: "fr",
      isLive: true,
      actionItems: [
        {
          id: "action-42",
          action_date: "2026-09-27",
          location_label: "Parc central",
          actor_name: "Alex",
          association_name: "Collectif local",
          volunteers_count: 4,
          duration_minutes: 90,
          contract: {
            metadata: {
              preparationData: {
                actionTitle: "Collecte du samedi",
                volunteerParticipation: { participantsCount: 4 },
              },
            },
          },
        } as never,
      ],
    });

    expect(presentation.activeAction?.id).toBe("action-42");
    expect(presentation.activeChannelLabel).toBe("Collecte du samedi");
    expect(presentation.composerPlaceholder).toContain("coordination");
    expect(presentation.metaItems).toEqual(expect.arrayContaining([
      { label: "Canal", value: "Actions" },
      { label: "Participants prévus", value: "4" },
      { label: "Statut", value: "Direct" },
    ]));
  });

  it("preserves the mobile DM drill-down states", () => {
    expect(getChatShellMobilePresentation({
      messagerieMode: true,
      activeChannelType: "dm",
      selectedRecipient: null,
      isDmThreadOpen: false,
      isPublicThreadOpen: true,
    })).toEqual({
      isDmSurface: true,
      showDmThreadOnMobile: false,
      showPublicThreadOnMobile: true,
      showThreadOnMobile: false,
    });
  });
});
