import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { JoinableActionItem } from "@/lib/actions/participation/group-participation";
import { ActionCard } from "./rejoindre-un-formulaire-section.cards";

const joinDocumentation = readFileSync(
  new URL(
    "../../../../../../documentation/pages_site/routes/02-agir/rejoindre-une-action/rejoindre-une-action-README.md",
    import.meta.url,
  ),
  "utf8",
);
const groupActionDocumentation = readFileSync(
  new URL("../../../../../../documentation/features/group-action.md", import.meta.url),
  "utf8",
);

function buildItem(overrides: Partial<JoinableActionItem> = {}): JoinableActionItem {
  return {
    id: "future-action",
    created_at: "2026-09-01T10:00:00.000Z",
    action_date: "2026-09-20",
    location_label: "Quai de Seine",
    volunteers_count: 10,
    duration_minutes: 60,
    status: "approved",
    actionPhase: "pre_action",
    participantsCount: 4,
    joined: false,
    awaitingApproval: false,
    joinedAt: null,
    participationStatus: null,
    participationSource: null,
    participationUpdatedAt: null,
    groupJoinEnabled: true,
    pendingRequestsCount: 0,
    ...overrides,
  };
}

function renderCard(item: JoinableActionItem) {
  return renderToStaticMarkup(
    <ActionCard
      item={item}
      index={0}
      fr
      authenticated
      joining={false}
      leaving={false}
      onRequestJoin={() => undefined}
      onRequestLeave={() => undefined}
    />,
  );
}

describe("Rejoindre une action content contract", () => {
  it("uses registration vocabulary for a confirmed future registration", () => {
    const markup = renderCard(buildItem({ joined: true, participationStatus: "confirmed" }));

    expect(markup).toContain("Inscription confirmée");
    expect(markup).toContain("Inscriptions confirmées");
    expect(markup).not.toContain("Participation confirmée");
    expect(markup).not.toContain("Clean River Paris");
  });

  it("uses registration vocabulary for a pending future request", () => {
    const markup = renderCard(buildItem({ awaitingApproval: true, participationStatus: "pending" }));

    expect(markup).toContain("Demande d&#x27;inscription");
    expect(markup).not.toContain("Participation à confirmer");
  });

  it("keeps the canonical documentation aligned with the phase boundary", () => {
    expect(joinDocumentation).toContain("public.action_registrations");
    expect(joinDocumentation).toContain("public.action_participants");
    expect(joinDocumentation).toContain("participation_source = post_action_claim");
    expect(joinDocumentation).toContain("ACTIVE_ROLE=elu");
    expect(joinDocumentation).not.toContain("ne permet aucune participation rétroactive");

    expect(groupActionDocumentation).toContain("Rejoindre → Créer → Signaler");
    expect(groupActionDocumentation).toContain("pending` ou `approved");
    expect(groupActionDocumentation).not.toContain("valide par un admin");
    expect(groupActionDocumentation).not.toContain("status = approved");
  });
});
