import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OrganizationCollectionsPanel } from "./organization-collections-panel";

const action = {
  id: "00000000-0000-4000-8000-000000000051",
  action_date: "2026-04-03",
  title: "Collecte Alpha",
  status: "completed",
  action_phase: null,
  site_id: null,
  can_manage: false,
};
const base = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Entreprise Alpha",
  role: "member" as const,
  site_id: null,
  members: [],
  sites: [],
  campaigns: [],
  actions: [action],
  collections_available: true,
  actions_has_more: true,
  link_candidates: [],
  candidates_has_more: false,
};

describe("organization collection panel", () => {
  it("renders the shared collection and lets members page without showing preparation controls", () => {
    const onPage = vi.fn();
    const html = renderToStaticMarkup(<OrganizationCollectionsPanel workspace={base} locale="fr" busy={false} offset={100} onPage={onPage} />);
    expect(html).toContain("Collecte Alpha");
    expect(html).toContain("2026-04-03");
    expect(html).not.toContain("Préparer une collecte");
    expect(html).toContain("Pages de collectes");
  });

  it("offers preparation only to managers and renders the empty state", () => {
    const owner = { ...base, role: "owner" as const, actions: [], actions_has_more: false };
    const html = renderToStaticMarkup(<OrganizationCollectionsPanel workspace={owner} locale="en" busy={false} offset={0} onPage={() => undefined} />);
    expect(html).toContain("Prepare a collection");
    expect(html).toContain("No collections on this page.");
    expect(html).toContain("disabled");
  });

  it("states when the additive database projection is not deployed yet", () => {
    const html = renderToStaticMarkup(<OrganizationCollectionsPanel workspace={{ ...base, collections_available: false, actions: [] }} locale="fr" busy={false} offset={0} onPage={() => undefined} />);
    expect(html).toContain("temporairement indisponibles");
    expect(html).not.toContain("Aucune collecte sur cette page.");
  });
});
