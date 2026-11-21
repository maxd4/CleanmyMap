import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FutureActionsPanel } from "./rejoindre-un-formulaire-section.future-actions";
import type { ActionListItem } from "@/lib/actions/types";

describe("FutureActionsPanel", () => {
  it("affiche les prévisions publiques sans les confondre avec des observations", () => {
    const item = {
      id: "future-action",
      action_date: "2099-06-15",
      location_label: "Quai de Seine",
      actor_name: "Alex",
      association_name: null,
      volunteers_count: 99,
      duration_minutes: 62,
      geometry_kind: "polyline",
      notes: "[EVENT_REF]event-123",
      contract: {
        dates: { eventStartTime: "10:30", eventEndTime: "12:00" },
        metadata: {
          actionTitle: "Nettoyage des berges",
          groupJoinEnabled: true,
          preparationData: {
            volunteerParticipation: { participantsCount: 7 },
            accessibilityStatus: "to_confirm",
            accessibility: "Revêtement irrégulier près du rendez-vous.",
          },
        },
      },
    } as unknown as ActionListItem;

    const markup = renderToStaticMarkup(
      <FutureActionsPanel
        items={[item]}
        loading={false}
        error={null}
        authenticated
        fr
      />,
    );

    expect(markup).toContain("Actions futures");
    expect(markup).toContain("7 participants prévus");
    expect(markup).not.toContain("99 participants prévus");
    expect(markup).toContain("10:30");
    expect(markup).toContain("12:00");
    expect(markup).toContain("Événement associé : event-123");
    expect(markup).toContain("Rejoindre");
    expect(markup).toContain("estimés");
    expect(markup).toContain("Accessibilité — À confirmer");
    expect(markup).toContain("Revêtement irrégulier près du rendez-vous.");
    expect(markup).toContain("Conditions et accompagnement");
    expect(markup).toContain("Afficher uniquement les actions avec des informations d’accessibilité renseignées");
  });
});
