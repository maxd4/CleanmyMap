import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ActionListItem } from "@/lib/actions/types";
import { PastActionsPanel } from "./rejoindre-une-action.past-actions";

describe("PastActionsPanel", () => {
  it("affiche uniquement les résultats finaux disponibles", () => {
    const item = {
      id: "past-action",
      created_at: "2026-08-01T10:00:00.000Z",
      actor_name: "Alex",
      association_name: "Clean River Paris",
      action_date: "2026-08-01",
      location_label: "Quai de Seine",
      latitude: null,
      longitude: null,
      waste_kg: 12,
      cigarette_butts: 34,
      volunteers_count: 99,
      duration_minutes: 62,
      notes: null,
      status: "approved",
      record_type: "action",
      geometry_kind: "polyline",
      contract: {
        geometry: { coordinates: [[2.3, 48.8]] },
        metadata: {
          preparationData: { actionTitle: "Nettoyage des berges" },
          volunteerParticipation: { participantsCount: 7 },
          actionPhase: "post_action_complete",
        },
      },
    } as unknown as ActionListItem;

    const markup = renderToStaticMarkup(
      <PastActionsPanel items={[item]} loading={false} error={null} fr />,
    );

    expect(markup).toContain("Actions passées");
    expect(markup).toContain("Nettoyage des berges");
    expect(markup).toContain("7 participants rattachés");
    expect(markup).toContain("12 kg collectés");
    expect(markup).toContain("34 mégots collectés");
    expect(markup).toContain("Parcours final/opérationnel disponible");
    expect(markup).not.toContain("participants prévus");
    expect(markup).not.toContain("Rejoindre");
  });
});
