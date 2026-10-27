import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ActionListItem } from "@/lib/actions/types";
import { ActionsHistoryListTable } from "./actions-history-list-table";

const item: ActionListItem = {
  id: "action-1",
  created_at: "2026-10-27T09:00:00.000Z",
  created_by_clerk_id: "user-1",
  actor_name: "Bénévole test",
  action_date: "2026-10-27",
  location_label: "Quai de test",
  latitude: 48.8566,
  longitude: 2.3522,
  waste_kg: 4.2,
  cigarette_butts: 12,
  volunteers_count: 2,
  duration_minutes: 60,
  notes: null,
  status: "approved",
  record_type: "action",
  contract: { metadata: { groupJoinEnabled: true } } as ActionListItem["contract"],
};

const qualityById = new Map([
  [
    item.id,
    {
      score: 90,
      grade: "A" as const,
      breakdown: { geoloc: 90, traceability: 90, freshness: 90 },
      flags: [],
    },
  ],
]);

function renderTable(overrides: Partial<React.ComponentProps<typeof ActionsHistoryListTable>> = {}) {
  return renderToStaticMarkup(
    <ActionsHistoryListTable
      filteredItems={[item]}
      qualityById={qualityById}
      limit={1}
      isLoading={false}
      error={null}
      isValidating={false}
      currentUserId="user-1"
      isAdminLikeUser={false}
      groupJoinActionId={null}
      onSelectItem={vi.fn()}
      onLoadMore={vi.fn()}
      onToggleGroupJoin={vi.fn()}
      {...overrides}
    />,
  );
}

describe("ActionsHistoryListTable state contracts", () => {
  it("announces structural loading without making each skeleton live", () => {
    const markup = renderTable({ isLoading: true });

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-label="Chargement de l’historique des actions"');
    expect(markup).toContain('data-skeleton-variant="rectangular"');
  });

  it("uses contextual alert feedback for a failed history load", () => {
    const markup = renderTable({ error: new Error("Historique indisponible") });

    expect(markup).toContain('data-feedback-tone="error"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Historique indisponible");
  });

  it("keeps navigation and quality visible for a normal approved action", () => {
    const markup = renderTable();

    expect(markup).toContain("Bénévole test");
    expect(markup).toContain("A (90 %)");
    expect(markup).toContain("/sections/rejoindre-une-action?actionId=action-1");
    expect(markup).toContain("Fermer");
  });

  it("hides the group mutation for a non-owner without admin permission", () => {
    const markup = renderTable({
      currentUserId: "another-user",
      isAdminLikeUser: false,
    });

    expect(markup).toContain("Rejoindre");
    expect(markup).not.toContain("Fermer");
    expect(markup).not.toContain("Rouvrir");
  });

  it("blocks the group mutation and pagination controls while they are pending", () => {
    const markup = renderTable({
      groupJoinActionId: item.id,
      isValidating: true,
    });

    expect(markup).toContain('data-cmm-button-loading="true"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Fermeture…");
    expect(markup).toContain("Actualisation…");
  });
});
