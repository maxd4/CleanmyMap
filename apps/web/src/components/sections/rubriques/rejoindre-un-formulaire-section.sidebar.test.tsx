import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { JoinableActionHistoryItem } from "@/lib/actions/participation/group-participation";
import { JoinFormSidebar } from "./rejoindre-un-formulaire-section.sidebar";

function buildHistoryItem(
  id: string,
  actionPhase: JoinableActionHistoryItem["actionPhase"],
): JoinableActionHistoryItem {
  return {
    id,
    created_at: "2026-09-01T10:00:00.000Z",
    action_date: "2026-09-20",
    location_label: id === "registration" ? "Quai de Seine" : "Parc Nord",
    volunteers_count: 10,
    duration_minutes: 60,
    status: "approved",
    actionPhase,
    participantsCount: 4,
    joined: true,
    awaitingApproval: false,
    joinedAt: "2026-09-01T10:00:00.000Z",
    participationStatus: "confirmed",
    participationSource: actionPhase === "post_action_complete" ? "post_action_claim" : "group_form",
    participationUpdatedAt: "2026-09-01T10:00:00.000Z",
    groupJoinEnabled: true,
    pendingRequestsCount: 0,
  };
}

describe("JoinFormSidebar tracking vocabulary", () => {
  it("uses the phase-specific vocabulary and a neutral mixed-history shortcut", () => {
    const registration = buildHistoryItem("registration", "post_action_draft");
    const participation = buildHistoryItem("participation", "post_action_complete");
    const markup = renderToStaticMarkup(
      <JoinFormSidebar
        fr
        authenticated
        sortedHistoryItems={[registration, participation]}
        activeRegistrationItems={[registration]}
        activeParticipationItems={[participation]}
      />,
    );

    expect(markup).toContain("Inscription confirmée");
    expect(markup).toContain("Participation confirmée");
    expect(markup).toContain("Voir tout mon suivi");
    expect(markup).toContain("Mon suivi");
    expect(markup).not.toContain("Résumé");
    expect(markup).not.toContain("Demandes d'inscription");
    expect(markup).not.toContain("Mes inscriptions");
    expect(markup).not.toContain("Voir toutes mes participations");
  });
});
