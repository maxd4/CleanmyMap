// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EnterpriseOrganizationWorkspace } from "./enterprise-organization-workspace";

const orgId = "00000000-0000-4000-8000-000000000001";
const betaId = "00000000-0000-4000-8000-000000000002";
const workspace = (role: "owner" | "member" | "manager" | "site_manager", id = orgId, name = "Entreprise Alpha", rich = false) => ({
  id, name, role, site_id: null,
  members: [
    { id: "00000000-0000-4000-8000-000000000011", member_role: "owner", state: "active", site_id: null, label: "Alice", is_self: role === "owner", expires_at: null },
    { id: "00000000-0000-4000-8000-000000000012", member_role: "member", state: "pending", site_id: null, label: "Compte invité", is_self: false, expires_at: "2026-12-01T00:00:00.000Z" },
    { id: "00000000-0000-4000-8000-000000000013", member_role: "manager", state: "active", site_id: null, label: "Gestionnaire", is_self: false, expires_at: null },
  ],
  sites: rich ? [
    { id: "00000000-0000-4000-8000-000000000031", name: "Site actif", archived_at: null },
    { id: "00000000-0000-4000-8000-000000000032", name: "Site archivé", archived_at: "2026-01-01T00:00:00.000Z" },
  ] : [],
  campaigns: rich ? [
    { id: "00000000-0000-4000-8000-000000000041", title: "Brouillon", starts_on: "2026-01-01", ends_on: "2026-12-31", target_actions: null, state: "draft", completed_actions: 0 },
    { id: "00000000-0000-4000-8000-000000000042", title: "Active", starts_on: "2026-01-01", ends_on: "2026-12-31", target_actions: 3, state: "active", completed_actions: 1 },
    { id: "00000000-0000-4000-8000-000000000043", title: "Terminée", starts_on: "2026-01-01", ends_on: "2026-12-31", target_actions: 2, state: "completed", completed_actions: 2 },
    { id: "00000000-0000-4000-8000-000000000044", title: "Archivée", starts_on: "2026-01-01", ends_on: "2026-12-31", target_actions: null, state: "archived", completed_actions: 1 },
  ] : [],
  actions: rich ? [{ id: "00000000-0000-4000-8000-000000000051", action_date: "2026-04-03", title: "Collecte Alpha", status: "completed", action_phase: null, site_id: null, can_manage: true }] : [],
  actions_has_more: rich, link_candidates: rich ? [{ id: "00000000-0000-4000-8000-000000000052", action_date: "2026-04-04", title: "Action à rattacher", status: "completed", action_phase: null }] : [], candidates_has_more: rich,
});

let root: Root;
let host: HTMLDivElement;
let apiWorkspace = workspace("owner");

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  apiWorkspace = workspace("owner");
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const data = url.includes("organizationId=")
      ? { workspace: apiWorkspace }
      : { memberships: [
        { organization_id: orgId, organization_name: "Entreprise Alpha", membership_id: "00000000-0000-4000-8000-000000000010", member_role: "owner", state: "active" },
        { organization_id: betaId, organization_name: "Entreprise Beta", membership_id: "00000000-0000-4000-8000-000000000020", member_role: "owner", state: "active" },
      ] };
    return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
  }));
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function renderWorkspace() {
  await act(async () => {
    root.render(<EnterpriseOrganizationWorkspace />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("enterprise organization workspace roster", () => {
  it("shows a minimized team and email invitation form to the owner", async () => {
    await renderWorkspace();
    expect(host.textContent).toContain("Mon équipe");
    expect(host.textContent).toContain("Compte invité");
    expect(host.querySelector('input[type="email"]')).not.toBeNull();
    expect(host.textContent).not.toContain("user_internal_clerk_id");
  });

  it("lets a regular member view the roster without owner controls", async () => {
    apiWorkspace = workspace("member");
    await renderWorkspace();
    expect(host.textContent).toContain("Mon équipe");
    expect(host.textContent).toContain("Alice");
    expect(host.querySelector('input[type="email"]')).toBeNull();
    expect(host.textContent).not.toContain("Transférer la responsabilité");
  });

  it("shows shared organization collections and aggregate reports to a member without mutation or detailed export controls", async () => {
    apiWorkspace = {
      ...workspace("member", orgId, "Entreprise Alpha", true),
      actions: [{ id: "00000000-0000-4000-8000-000000000051", action_date: "2026-04-03", title: "Collecte Alpha", status: "completed", action_phase: null, site_id: null, can_manage: false }],
    };
    await renderWorkspace();

    expect(host.textContent).toContain("Collectes de l’organisation");
    expect(host.textContent).toContain("Collecte Alpha");
    expect(host.textContent).toContain("Bilan privé");
    expect(host.textContent).toContain("Les exports détaillés sont réservés");
    expect([...host.querySelectorAll("button")].some((button) => button.textContent === "Préparer une collecte")).toBe(false);
    expect([...host.querySelectorAll("button")].find((button) => button.textContent === "Exporter CSV")?.disabled).toBe(true);
  });

  it("supports keyboard tabs and clears organization-scoped report state when switching organizations", async () => {
    apiWorkspace = workspace("owner", orgId, "Entreprise Alpha", true);
    await renderWorkspace();
    const tabs = [...host.querySelectorAll('[role="tab"]')] as HTMLButtonElement[];
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Équipe", "Collectes", "Établissements", "Campagnes", "Bilans RSE"]);
    await act(async () => {
      tabs[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(host.querySelector('[role="tablist"] [aria-selected="true"]')?.textContent).toBe("Collectes");
    await act(async () => { tabs[4]?.click(); });
    const from = host.querySelector('input[type="date"]') as HTMLInputElement;
    const setInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setInput?.call(from, "2026-01-01");
    await act(async () => { from.dispatchEvent(new Event("input", { bubbles: true })); });
    const organization = host.querySelector("select") as HTMLSelectElement;
    const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setSelect?.call(organization, betaId);
    await act(async () => { organization.dispatchEvent(new Event("change", { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 15)); });
    expect(host.querySelector('[role="tablist"]')).toBeNull();
    expect(host.querySelector('input[type="date"]')).toBeNull();
  });

  it("offers onboarding for an empty membership list and reports a safe membership lookup failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ memberships: [] }), { status: 200 })));
    await renderWorkspace();
    expect(host.textContent).toContain("Aucune adhésion active ou invitation.");
    expect(host.querySelector('a[href="/partners/onboarding"]')).not.toBeNull();
    expect(host.querySelector('input[type="email"]')).toBeNull();

    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("private provider detail"); }));
    const refresh = [...host.querySelectorAll("button")].find((button) => button.textContent === "Actualiser");
    await act(async () => { refresh?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("Impossible de charger les organisations.");
    expect(host.textContent).not.toContain("private provider detail");
  });

  it("shows an invitation-only account and submits acceptance against its own organization", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") return new Response("{}", { status: 200 });
      if (String(input).includes("organizationId=")) return new Response(JSON.stringify({ workspace: apiWorkspace }), { status: 200 });
      return new Response(JSON.stringify({ memberships: [
        { organization_id: orgId, organization_name: "Entreprise Alpha", membership_id: "00000000-0000-4000-8000-000000000010", member_role: "owner", state: "active" },
        { organization_id: betaId, organization_name: "Entreprise Beta", membership_id: "00000000-0000-4000-8000-000000000020", member_role: "member", state: "pending" },
      ] }), { status: 200 });
    }));
    await renderWorkspace();
    expect(host.textContent).toContain("Entreprise Beta : invitation (Membre)");
    const accept = [...host.querySelectorAll("button")].find((button) => button.textContent === "Accepter");
    await act(async () => { accept?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    const decline = [...host.querySelectorAll("button")].find((button) => button.textContent === "Refuser");
    await act(async () => { decline?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    const posted = vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST").map(([, init]) => JSON.parse(String(init?.body)));
    expect(posted).toContainEqual(expect.objectContaining({ organizationId: betaId, operation: "accept", membershipId: "00000000-0000-4000-8000-000000000020" }));
    expect(posted).toContainEqual(expect.objectContaining({ organizationId: betaId, operation: "decline", membershipId: "00000000-0000-4000-8000-000000000020" }));
  });

  it("clears the previous workspace and exposes only a safe error when the new scope fails", async () => {
    let workspaceReads = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (!String(input).includes("organizationId=")) return new Response(JSON.stringify({ memberships: [
        { organization_id: orgId, organization_name: "Entreprise Alpha", membership_id: "00000000-0000-4000-8000-000000000010", member_role: "owner", state: "active" },
        { organization_id: betaId, organization_name: "Entreprise Beta", membership_id: "00000000-0000-4000-8000-000000000020", member_role: "owner", state: "active" },
      ] }), { status: 200 });
      workspaceReads += 1;
      if (workspaceReads > 1) throw new Error("private scope failure");
      return new Response(JSON.stringify({ workspace: workspace("owner") }), { status: 200 });
    }));
    await renderWorkspace();
    expect(host.textContent).toContain("Entreprise Alpha");
    const organization = host.querySelector("select") as HTMLSelectElement;
    const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setSelect?.call(organization, betaId);
    await act(async () => { organization.dispatchEvent(new Event("change", { bubbles: true })); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(host.textContent).toContain("Périmètre indisponible.");
    expect(host.querySelector('input[type="email"]')).toBeNull();
    expect(host.textContent).not.toContain("private scope failure");
  });

  it("shows a controlled mutation failure instead of retaining private roster state", async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") return new Response("{}", { status: 409 });
      const url = String(input);
      return url.includes("organizationId=")
        ? new Response(JSON.stringify({ workspace: apiWorkspace }), { status: 200 })
        : new Response(JSON.stringify({ memberships: [{ organization_id: orgId, organization_name: "Entreprise Alpha", membership_id: "00000000-0000-4000-8000-000000000010", member_role: "owner", state: "active" }] }), { status: 200 });
    });
    await renderWorkspace();
    const revoke = [...host.querySelectorAll("button")].find((button) => button.textContent === "Révoquer");
    await act(async () => { revoke?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Modification refusée");
    expect(host.querySelector('input[type="email"]')).toBeNull();
  });

  it("discards a delayed private report after its scope changes and reports server failures safely", async () => {
    apiWorkspace = workspace("owner", orgId, "Entreprise Alpha", true);
    let resolveReport: ((response: Response) => void) | undefined;
    let rejectReports = false;
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/reports/organization")) {
        if (rejectReports) return new Response("{}", { status: 503 });
        return new Promise<Response>((resolve) => { resolveReport = resolve; });
      }
      return String(input).includes("organizationId=")
        ? new Response(JSON.stringify({ workspace: apiWorkspace }), { status: 200 })
        : new Response(JSON.stringify({ memberships: [{ organization_id: orgId, organization_name: "Entreprise Alpha", membership_id: "00000000-0000-4000-8000-000000000010", member_role: "owner", state: "active" }] }), { status: 200 });
    });
    await renderWorkspace();
    const setInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    const dates = [...host.querySelectorAll('input[type="date"]')];
    setInput?.call(dates[0], "2026-01-01");
    await act(async () => { dates[0]?.dispatchEvent(new Event("input", { bubbles: true })); });
    setInput?.call(dates[1], "2026-12-31");
    await act(async () => { dates[1]?.dispatchEvent(new Event("input", { bubbles: true })); });
    const calculate = [...host.querySelectorAll("button")].find((button) => button.textContent === "Calculer");
    await act(async () => { calculate?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    const reportSite = [...host.querySelectorAll("label")].find((label) => label.textContent?.startsWith("Établissement du bilan"))?.querySelector("select") as HTMLSelectElement;
    const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setSelect?.call(reportSite, "00000000-0000-4000-8000-000000000031");
    await act(async () => {
      reportSite.dispatchEvent(new Event("change", { bubbles: true }));
      resolveReport?.(new Response(JSON.stringify({ actions: 99 }), { status: 200 }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host.textContent).not.toContain("99");

    rejectReports = true;
    await act(async () => { calculate?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("Bilan indisponible ou périmètre invalide.");
  });

  it("offers transfer only to active managers", async () => {
    await renderWorkspace();
    const transferSelect = [...host.querySelectorAll("select")].find((element) => element.textContent?.includes("Gestionnaire actif"));
    expect(transferSelect?.textContent).toContain("Gestionnaire");
    expect(transferSelect?.textContent).not.toContain("Compte invité");
    expect(transferSelect?.querySelectorAll("option")).toHaveLength(2);
    const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setSelect?.call(transferSelect, "00000000-0000-4000-8000-000000000013");
    await act(async () => { transferSelect?.dispatchEvent(new Event("change", { bubbles: true })); });
    await act(async () => {
      transferSelect?.closest("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const posted = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(posted?.[1]?.body))).toMatchObject({ operation: "transfer_owner", membershipId: "00000000-0000-4000-8000-000000000013" });
  });

  it("lets an active member leave while hiding owner mutation controls", async () => {
    apiWorkspace = workspace("member");
    await renderWorkspace();
    const leave = [...host.querySelectorAll("button")].find((button) => button.textContent === "Quitter l’organisation");
    await act(async () => {
      leave?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const posted = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(posted?.[1]?.body))).toMatchObject({ operation: "leave" });
    expect(host.querySelector('input[type="email"]')).toBeNull();
  });

  it("renders campaign transitions, pages actions, and shows report coverage and unknown values", async () => {
    apiWorkspace = workspace("owner", orgId, "Entreprise Alpha", true);
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/reports/organization")) {
        return new Response(JSON.stringify({ actions: 1, massKg: { value: null, known: 0, total: 1 }, butts: 0, participations: 3, durationMinutes: null }), { status: 200 });
      }
      if (url.includes("organizationId=")) return new Response(JSON.stringify({ workspace: apiWorkspace }), { status: 200 });
      return new Response(JSON.stringify({ memberships: [
        { organization_id: orgId, organization_name: "Entreprise Alpha", membership_id: "00000000-0000-4000-8000-000000000010", member_role: "owner", state: "active" },
      ] }), { status: 200 });
    });
    await renderWorkspace();
    expect(host.textContent).toContain("Collecte Alpha");
    expect(host.textContent).toContain("Action à rattacher");
    expect(host.textContent).toContain("Site archivé (archivé)");
    expect(host.textContent).toContain("Brouillon");
    expect(host.textContent).toContain("Active");
    expect(host.textContent).toContain("Terminée");
    expect(host.querySelector('a[href="/actions/history"]')).not.toBeNull();
    expect([...host.querySelectorAll("button")].find((button) => button.textContent === "Précédent")?.disabled).toBe(true);

    for (const [title, state, label] of [["Brouillon", "active", "Activer"], ["Active", "completed", "Terminer"], ["Terminée", "archived", "Archiver"]]) {
      const listItem = [...host.querySelectorAll("li")].find((item) => item.textContent?.startsWith(`${title} ·`));
      const button = [...(listItem?.querySelectorAll("button") ?? [])].find((candidate) => candidate.textContent === label);
      expect(button).toBeDefined();
      await act(async () => {
        button?.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      const posted = vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST").at(-1);
      expect(JSON.parse(String(posted?.[1]?.body))).toMatchObject({ operation: "campaign", campaignId: expect.any(String), state });
    }

    const setInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    const dateInputs = [...host.querySelectorAll('input[type="date"]')];
    setInput?.call(dateInputs[0], "2026-01-01");
    await act(async () => { dateInputs[0]?.dispatchEvent(new Event("input", { bubbles: true })); });
    setInput?.call(dateInputs[1], "2026-12-31");
    await act(async () => { dateInputs[1]?.dispatchEvent(new Event("input", { bubbles: true })); });
    const calculate = [...host.querySelectorAll("button")].find((button) => button.textContent === "Calculer");
    await act(async () => {
      calculate?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host.textContent).toContain("Non renseigné (0/1)");
    expect(host.textContent).toContain("Participations3");

    const next = [...host.querySelectorAll("button")].find((button) => button.textContent === "Suivant");
    await act(async () => {
      next?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).includes("offset=100"))).toBe(true);
    const previous = [...host.querySelectorAll("button")].find((button) => button.textContent === "Précédent");
    await act(async () => { previous?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).includes("offset=0"))).toBe(true);
  });

  it("lets a manager revise a draft campaign", async () => {
    apiWorkspace = workspace("owner", orgId, "Entreprise Alpha", true);
    await renderWorkspace();
    const campaignsTab = [...host.querySelectorAll('[role="tab"]')].find((tab) => tab.textContent === "Campagnes");
    await act(async () => { campaignsTab?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    const edit = [...host.querySelectorAll("button")].find((button) => button.textContent === "Modifier");
    expect(edit).toBeDefined();
    await act(async () => { edit?.click(); });
    const form = [...host.querySelectorAll("form")].find((candidate) => [...candidate.querySelectorAll("button")].some((button) => button.textContent === "Enregistrer la campagne"));
    const setInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    const title = form?.querySelector('input:not([type="date"]):not([type="number"])') as HTMLInputElement;
    const dates = [...(form?.querySelectorAll('input[type="date"]') ?? [])] as HTMLInputElement[];
    const target = form?.querySelector('input[type="number"]') as HTMLInputElement;
    setInput?.call(title, "Campagne révisée");
    await act(async () => { title.dispatchEvent(new Event("input", { bubbles: true })); });
    setInput?.call(dates[0], "2026-02-01");
    await act(async () => { dates[0]?.dispatchEvent(new Event("input", { bubbles: true })); });
    setInput?.call(dates[1], "2026-11-30");
    await act(async () => { dates[1]?.dispatchEvent(new Event("input", { bubbles: true })); });
    setInput?.call(target, "8");
    await act(async () => { target.dispatchEvent(new Event("input", { bubbles: true })); });
    await act(async () => { form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await new Promise((resolve) => setTimeout(resolve, 0)); });
    const posted = vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST").map(([, init]) => JSON.parse(String(init?.body)));
    expect(posted).toContainEqual(expect.objectContaining({ operation: "campaign", campaignId: "00000000-0000-4000-8000-000000000041", title: "Campagne révisée", startsOn: "2026-02-01", endsOn: "2026-11-30", targetActions: 8, state: "draft" }));

  });

  it("does not expose campaign editing to members", async () => {
    apiWorkspace = workspace("member", orgId, "Entreprise Alpha", true);
    await renderWorkspace();
    const memberCampaignsTab = [...host.querySelectorAll('[role="tab"]')].find((tab) => tab.textContent === "Campagnes");
    await act(async () => { memberCampaignsTab?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    expect([...host.querySelectorAll("button")].some((button) => button.textContent === "Modifier")).toBe(false);
  });

  it("links only selected actions, creates a campaign, and exports a private CSV", async () => {
    apiWorkspace = workspace("owner", orgId, "Entreprise Alpha", true);
    const originalCreate = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
    const originalRevoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:enterprise") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/reports/organization")) return new Response("actions,massKg\n1,0", { status: 200 });
      const url = String(input);
      if (url.includes("organizationId=")) return new Response(JSON.stringify({ workspace: apiWorkspace }), { status: 200 });
      return new Response(JSON.stringify({ memberships: [{ organization_id: orgId, organization_name: "Entreprise Alpha", membership_id: "00000000-0000-4000-8000-000000000010", member_role: "owner", state: "active" }] }), { status: 200 });
    });
    try {
      await renderWorkspace();
      const linkForm = [...host.querySelectorAll("form")].find((form) => [...form.querySelectorAll("button")].some((button) => button.textContent === "Rattacher"));
      const action = linkForm?.querySelector("select") as HTMLSelectElement;
      const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      setSelect?.call(action, "00000000-0000-4000-8000-000000000052");
      await act(async () => { action.dispatchEvent(new Event("change", { bubbles: true })); });
      await act(async () => { linkForm?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await new Promise((resolve) => setTimeout(resolve, 0)); });

      const setInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      const dateInputs = [...host.querySelectorAll('input[type="date"]')];
      setInput?.call(dateInputs[0], "2026-01-01");
      await act(async () => { dateInputs[0]?.dispatchEvent(new Event("input", { bubbles: true })); });
      setInput?.call(dateInputs[1], "2026-12-31");
      await act(async () => { dateInputs[1]?.dispatchEvent(new Event("input", { bubbles: true })); });
      const campaignForm = [...host.querySelectorAll("form")].find((form) => [...form.querySelectorAll("button")].some((button) => button.textContent === "Créer un brouillon"));
      const title = campaignForm?.querySelector('input:not([type="number"])') as HTMLInputElement;
      setInput?.call(title, "Campagne Alpha");
      await act(async () => { title.dispatchEvent(new Event("input", { bubbles: true })); });
      await act(async () => { campaignForm?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await new Promise((resolve) => setTimeout(resolve, 0)); });

      const newSiteForm = [...host.querySelectorAll("form")].find((form) => form.textContent?.includes("Nouvel établissement"));
      const newSiteName = newSiteForm?.querySelector("input") as HTMLInputElement;
      setInput?.call(newSiteName, "Site Beta");
      await act(async () => { newSiteName.dispatchEvent(new Event("input", { bubbles: true })); });
      await act(async () => { newSiteForm?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await new Promise((resolve) => setTimeout(resolve, 0)); });

      const renameButton = [...host.querySelectorAll("button")].find((button) => button.textContent === "Renommer");
      const siteEditor = renameButton?.parentElement;
      const editSite = siteEditor?.querySelector("select") as HTMLSelectElement;
      setSelect?.call(editSite, "00000000-0000-4000-8000-000000000031");
      await act(async () => { editSite.dispatchEvent(new Event("change", { bubbles: true })); });
      const renamedSite = siteEditor?.querySelector("input") as HTMLInputElement;
      setInput?.call(renamedSite, "Site renommé");
      await act(async () => { renamedSite.dispatchEvent(new Event("input", { bubbles: true })); });
      await act(async () => { renameButton?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
      const archiveButton = [...host.querySelectorAll("button")].find((button) => button.textContent === "Archiver");
      await act(async () => { archiveButton?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });

      const campaignSelector = [...host.querySelectorAll("label")].find((label) => label.textContent?.startsWith("Campagnes"))?.querySelector("select") as HTMLSelectElement;
      setSelect?.call(campaignSelector, "00000000-0000-4000-8000-000000000042");
      await act(async () => { campaignSelector.dispatchEvent(new Event("change", { bubbles: true })); });
      const campaignActionForm = [...host.querySelectorAll("form")].find((form) => [...form.querySelectorAll("button")].some((button) => button.textContent === "Ajouter à la campagne"));
      const campaignAction = campaignActionForm?.querySelector("select") as HTMLSelectElement;
      setSelect?.call(campaignAction, "00000000-0000-4000-8000-000000000051");
      await act(async () => { campaignAction.dispatchEvent(new Event("change", { bubbles: true })); });
      await act(async () => { campaignActionForm?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await new Promise((resolve) => setTimeout(resolve, 0)); });

      const reportSite = [...host.querySelectorAll("label")].find((label) => label.textContent?.startsWith("Établissement du bilan"))?.querySelector("select") as HTMLSelectElement;
      setSelect?.call(reportSite, "00000000-0000-4000-8000-000000000031");
      await act(async () => { reportSite.dispatchEvent(new Event("change", { bubbles: true })); });

      const exportButton = [...host.querySelectorAll("button")].find((button) => button.textContent === "Exporter CSV");
      await act(async () => { exportButton?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
      const requests = vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST").map(([, init]) => JSON.parse(String(init?.body)));
      expect(requests).toContainEqual(expect.objectContaining({ operation: "link_action", actionId: "00000000-0000-4000-8000-000000000052" }));
      expect(requests).toContainEqual(expect.objectContaining({ operation: "campaign", title: "Campagne Alpha", state: "draft", startsOn: "2026-01-01", endsOn: "2026-12-31" }));
      expect(requests).toContainEqual(expect.objectContaining({ operation: "site", name: "Site Beta", siteId: null, archive: false }));
      expect(requests).toContainEqual(expect.objectContaining({ operation: "site", name: "Site renommé", siteId: "00000000-0000-4000-8000-000000000031", archive: false }));
      expect(requests).toContainEqual(expect.objectContaining({ operation: "site", siteId: "00000000-0000-4000-8000-000000000031", archive: true }));
      expect(requests).toContainEqual(expect.objectContaining({ operation: "campaign_action", campaignId: "00000000-0000-4000-8000-000000000042", actionId: "00000000-0000-4000-8000-000000000051", remove: false }));
      expect(JSON.stringify(requests)).toContain('"format":"csv"');
      expect(URL.createObjectURL).toHaveBeenCalledOnce();
      expect(anchorClick).toHaveBeenCalledOnce();
    } finally {
      if (originalCreate) Object.defineProperty(URL, "createObjectURL", originalCreate);
      else Reflect.deleteProperty(URL, "createObjectURL");
      if (originalRevoke) Object.defineProperty(URL, "revokeObjectURL", originalRevoke);
      else Reflect.deleteProperty(URL, "revokeObjectURL");
    }
  });

  it("requires an active site before inviting a site manager and sends the email rather than a Clerk ID", async () => {
    apiWorkspace = workspace("owner", orgId, "Entreprise Alpha", true);
    await renderWorkspace();
    const selects = [...host.querySelectorAll("select")];
    const role = selects.find((element) => element.textContent?.includes("Gestionnaire de site")) as HTMLSelectElement;
    const email = host.querySelector('input[type="email"]') as HTMLInputElement;
    const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    const setInput = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setSelect?.call(role, "site_manager");
    await act(async () => { role.dispatchEvent(new Event("change", { bubbles: true })); });
    const inviteForm = email.closest("form");
    const site = [...(inviteForm?.querySelectorAll("select") ?? [])].find((element) => element !== role) as HTMLSelectElement;
    expect(site.textContent).toContain("Site actif");
    expect(site.textContent).not.toContain("Site archivé");
    expect([...host.querySelectorAll("button")].find((button) => button.textContent === "Inviter")?.disabled).toBe(true);

    setInput?.call(email, "collegue@example.test");
    await act(async () => { email.dispatchEvent(new Event("input", { bubbles: true })); });
    setSelect?.call(site, "00000000-0000-4000-8000-000000000031");
    await act(async () => { site.dispatchEvent(new Event("change", { bubbles: true })); });
    await act(async () => {
      email.closest("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const inviteRequest = vi.mocked(fetch).mock.calls.find(([input, init]) => String(input) === "/api/organizations" && init?.method === "POST");
    expect(JSON.parse(String(inviteRequest?.[1]?.body))).toMatchObject({
      operation: "invite", targetEmail: "collegue@example.test", role: "site_manager", siteId: "00000000-0000-4000-8000-000000000031",
    });
    expect(String(inviteRequest?.[1]?.body)).not.toContain("user_internal_clerk_id");
  });

  it("does not let a delayed response from the previous organization replace the selected organization", async () => {
    let resolveAlpha: ((value: Response) => void) | undefined;
    let membershipReads = 0;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (!url.includes("organizationId=")) {
        membershipReads += 1;
        const membership = membershipReads === 1
          ? { organization_id: orgId, organization_name: "Entreprise Alpha", membership_id: "00000000-0000-4000-8000-000000000010", member_role: "owner", state: "active" }
          : { organization_id: betaId, organization_name: "Entreprise Beta", membership_id: "00000000-0000-4000-8000-000000000020", member_role: "owner", state: "active" };
        return Promise.resolve(new Response(JSON.stringify({ memberships: [membership] }), { status: 200, headers: { "content-type": "application/json" } }));
      }
      if (url.includes(orgId)) return new Promise<Response>((resolve) => { resolveAlpha = resolve; });
      return Promise.resolve(new Response(JSON.stringify({ workspace: workspace("owner", betaId, "Entreprise Beta") }), { status: 200, headers: { "content-type": "application/json" } }));
    }));

    await renderWorkspace();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    const refreshButton = [...host.querySelectorAll("button")].find((button) => button.textContent === "Actualiser");
    expect(refreshButton).not.toBeUndefined();
    await act(async () => {
      refreshButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect([...host.querySelectorAll("h2")][1]?.textContent).toBe("Entreprise Beta");
    await act(async () => {
      resolveAlpha?.(new Response(JSON.stringify({ workspace: workspace("owner") }), { status: 200, headers: { "content-type": "application/json" } }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect([...host.querySelectorAll("h2")][1]?.textContent).toBe("Entreprise Beta");
  });
});
