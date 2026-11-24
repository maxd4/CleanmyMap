import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpogomiTeamRefereeSlot } from "./spogomi-team-referee-slot";
import { SpogomiDayReadinessChecklist } from "./spogomi-day-readiness-checklist";

describe("SpogomiTeamRefereeSlot UI & privacy", () => {
  it("renders orange border, shield-check icon, and all four statuses", () => {
    const cases = [
      ["to_assign", "À affecter"],
      ["pending_validation", "En attente de validation"],
      ["assigned", "Affecté"],
      ["unavailable", "Indisponible"],
    ] as const;

    for (const [status, label] of cases) {
      const html = renderToStaticMarkup(
        <SpogomiTeamRefereeSlot
          teamName="Équipe Alpha"
          divisionType="world_cup"
          status={status}
          showIdentity={false}
        />,
      );
      expect(html).toContain("border-orange-400");
      expect(html).toContain("lucide-shield-check");
      expect(html).toContain("Arbitre référent");
      expect(html).toContain(label);
    }
  });

  it("hides referee identity on public cards and reveals it only in private organizer mode", () => {
    const publicHtml = renderToStaticMarkup(
      <SpogomiTeamRefereeSlot
        teamName="Équipe Alpha"
        divisionType="world_cup"
        status="assigned"
        refereeDisplayName="Camille Secret"
        refereeClerkId="user_secret_123"
        showIdentity={false}
      />,
    );
    expect(publicHtml).toContain("Affecté");
    expect(publicHtml).not.toContain("Camille Secret");
    expect(publicHtml).not.toContain("user_secret_123");

    const privateHtml = renderToStaticMarkup(
      <SpogomiTeamRefereeSlot
        teamId="team-1"
        teamName="Équipe Alpha"
        divisionId="div-1"
        divisionType="world_cup"
        status="assigned"
        refereeDisplayName="Camille Arbitre"
        refereeClerkId="user_ref_1"
        showIdentity={true}
        editable={true}
        candidates={[
          { clerkId: "user_ref_1", displayName: "Camille Arbitre", divisionId: "div-1", assignedTeamId: "team-1", assignedTeamName: "Équipe Alpha" },
          { clerkId: "user_ref_2", displayName: "Léo Arbitre", divisionId: "div-1", assignedTeamId: "team-2", assignedTeamName: "Équipe Beta" },
        ]}
        onAssign={() => undefined}
        onRevoke={() => undefined}
      />,
    );
    expect(privateHtml).toContain("Référent : Camille Arbitre");
    expect(privateHtml).toContain("focus-visible:ring-orange-600");
    expect(privateHtml).toContain("Léo Arbitre (déjà affecté : Équipe Beta)");
    expect(privateHtml).toContain("Révoquer");
  });

  it("reflects referee coverage in SpogomiDayReadinessChecklist", () => {
    const incompleteHtml = renderToStaticMarkup(
      <SpogomiDayReadinessChecklist
        data={{
          event: { location_label: "Paris", starts_at: "2026-10-12T09:00:00Z", ends_at: null },
          divisions: [{ id: "d1", division_type: "world_cup", regulation_status: "complete", regulation_version: "reg-v1" }],
          participants: [],
          teams: [{ id: "t1", division_id: "d1", composition_state: "locked" }],
          teamReferees: [{ teamId: "t1", divisionId: "d1", status: "to_assign", refereeClerkId: null, refereeDisplayName: null, assignedAt: null, conflictReason: null }],
          route: { file_name: "parcours.gpx" },
          categoryRules: [],
          eventAccess: [],
        }}
      />,
    );
    expect(incompleteHtml).toContain("Arbitres référents : 0/1 affecté(s)");
    expect(incompleteHtml).toContain("Prêt au départ : non");

    const readyHtml = renderToStaticMarkup(
      <SpogomiDayReadinessChecklist
        data={{
          event: { location_label: "Paris", starts_at: "2026-10-12T09:00:00Z", ends_at: null },
          divisions: [{ id: "d1", division_type: "world_cup", regulation_status: "complete", regulation_version: "reg-v1" }],
          participants: [],
          teams: [{ id: "t1", division_id: "d1", composition_state: "locked" }],
          teamReferees: [{ teamId: "t1", divisionId: "d1", status: "assigned", refereeClerkId: "u1", refereeDisplayName: "Camille", assignedAt: "2026-10-12T08:00:00Z", conflictReason: null }],
          route: { file_name: "parcours.gpx" },
          categoryRules: [],
          eventAccess: [],
        }}
      />,
    );
    expect(readyHtml).toContain("Arbitres référents : 1/1 affecté(s)");
    expect(readyHtml).toContain("Prêt au départ : oui");
  });
});
