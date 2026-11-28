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
    const html = renderToStaticMarkup(<OrganizationCollectionsPanel workspace={base} siteId={null} locale="fr" busy={false} offset={100} onPage={onPage} />);
    expect(html).toContain("Collecte Alpha");
    expect(html).toContain("2026-04-03");
    expect(html).not.toContain("Préparer une collecte");
    expect(html).toContain("Pages de collectes");
  });

  it("offers preparation only to managers and renders the empty state", () => {
    const owner = { ...base, role: "owner" as const, actions: [], actions_has_more: false };
    const html = renderToStaticMarkup(<OrganizationCollectionsPanel workspace={owner} siteId="site-selected" locale="en" busy={false} offset={0} onPage={() => undefined} />);
    expect(html).toContain("Prepare a collection");
    expect(html).toContain("organizationId=00000000-0000-4000-8000-000000000001&amp;siteId=site-selected");
    expect(html).toContain("No collections on this page.");
    expect(html).toContain("disabled");
  });

  it("states when the additive database projection is not deployed yet", () => {
    const html = renderToStaticMarkup(<OrganizationCollectionsPanel workspace={{ ...base, collections_available: false, actions: [] }} siteId={null} locale="fr" busy={false} offset={0} onPage={() => undefined} />);
    expect(html).toContain("temporairement indisponibles");
    expect(html).not.toContain("Aucune collecte sur cette page.");
  });

  it("keeps site managers scoped to their assigned site", () => {
    const html = renderToStaticMarkup(<OrganizationCollectionsPanel workspace={{ ...base, role: "site_manager", site_id: "site-assigned" }} siteId="site-other" locale="fr" busy={false} offset={0} onPage={() => undefined} />);
    expect(html).toContain("siteId=site-assigned");
    expect(html).not.toContain("siteId=site-other");
  });

  it("offers audited detach only when both the role and action rights allow it", () => {
    const manager = { ...base, role: "manager" as const, actions: [{ ...action, can_manage: true }] };
    const html = renderToStaticMarkup(<OrganizationCollectionsPanel workspace={manager} siteId={null} locale="fr" busy={false} offset={0} onPage={() => undefined} onUnlinkAction={() => undefined} />);
    expect(html).toContain("Retirer de l’organisation");
    expect(html).toContain("/actions/new?tab=after&amp;actionId=00000000-0000-4000-8000-000000000051");
    expect(html).toContain("/actions/new?tab=before&amp;duplicateFrom=00000000-0000-4000-8000-000000000051&amp;organizationId=00000000-0000-4000-8000-000000000001");

    const planned = renderToStaticMarkup(<OrganizationCollectionsPanel workspace={{ ...manager, actions: [{ ...action, can_manage: true, action_date: "2026-04-04", action_phase: "pre_action", status: "planned" }] }} siteId={null} locale="fr" busy={false} offset={0} onPage={() => undefined} onUnlinkAction={() => undefined} />);
    expect(planned).toContain("/actions/new?tab=before&amp;actionId=00000000-0000-4000-8000-000000000051");

    const noActionRights = renderToStaticMarkup(<OrganizationCollectionsPanel workspace={{ ...manager, actions: [{ ...action, can_manage: false }] }} siteId={null} locale="fr" busy={false} offset={0} onPage={() => undefined} onUnlinkAction={() => undefined} />);
    expect(noActionRights).not.toContain("Retirer de l’organisation");

    const member = renderToStaticMarkup(<OrganizationCollectionsPanel workspace={{ ...base, actions: [{ ...action, can_manage: true }] }} siteId={null} locale="fr" busy={false} offset={0} onPage={() => undefined} onUnlinkAction={() => undefined} />);
    expect(member).not.toContain("Retirer de l’organisation");
    expect(member).not.toContain("Gérer la collecte");
  });
});
