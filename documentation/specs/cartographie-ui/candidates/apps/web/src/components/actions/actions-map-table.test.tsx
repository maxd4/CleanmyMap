import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ActionMapItem } from "@/lib/actions/types";
import { ActionsMapTable } from "./actions-map-table";

vi.mock("@/components/actions/map/scores/action-pollution-score-references-context", () => ({
  useActionPollutionScoreReferences: () => ({ references: null }),
}));

const item = {
  id: "action-without-assessments",
  action_date: "2026-09-10",
  location_label: "Rue de Test",
  latitude: 48.85,
  longitude: 2.35,
  waste_kg: null,
  cigarette_butts: null,
  status: "approved",
  record_type: "action",
} as ActionMapItem;

describe("ActionsMapTable public semantics", () => {
  it("keeps missing assessments explicit and uses a real action cell", () => {
    const markup = renderToStaticMarkup(
      <ActionsMapTable
        items={[item]}
        compact
        selectedActionId={item.id}
        onSelectAction={vi.fn()}
      />,
    );

    expect(markup).toContain("Indisponible");
    expect(markup).toContain("Non évalué");
    expect(markup).not.toContain(">faible<");
    expect(markup).not.toContain(">C<");
    expect(markup).not.toContain('role="button"');
    expect(markup).not.toContain("aria-pressed");
    expect(markup).toContain("Ouvrir");
  });

  it("distinguishes pending, unavailable and empty journal states", () => {
    const loading = renderToStaticMarkup(<ActionsMapTable items={[]} dataLoading />);
    const unavailable = renderToStaticMarkup(<ActionsMapTable items={[]} dataUnavailable />);
    const empty = renderToStaticMarkup(<ActionsMapTable items={[]} headerAction={<a href="/reports">Voir les rapports</a>} />);
    expect(loading).toContain("Chargement du journal");
    expect(loading).not.toContain("Aucun élément");
    expect(unavailable).toContain("Journal indisponible");
    expect(unavailable).not.toContain("Aucun élément");
    expect(empty).toContain("Aucun élément dans cette vue");
    expect(empty).toContain('href="/reports"');
    expect(empty.match(/<h2\b/g)).toHaveLength(1);
  });

  it("keeps technical coordinates and status out of the compact public columns", () => {
    const markup = renderToStaticMarkup(
      <ActionsMapTable items={[item]} compact selectedActionId={item.id} />,
    );

    expect(markup).not.toContain("Coordonnées");
    expect(markup).not.toContain(">Statut<");
    expect(markup).not.toContain("line-clamp");
  });
});
