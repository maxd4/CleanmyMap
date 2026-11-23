// @vitest-environment jsdom

import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createReactDomHarness } from "@/__tests__/support/action-behavior-test-helpers";
import type { ActionAttendanceEntryRow } from "@/types/database";
import { ActionAttendanceRegistryEntryPoint, ActionAttendanceRegistryPanel } from "./action-attendance-registry-panel";

function entry(id: string, display_label: string, status: ActionAttendanceEntryRow["attendance_status"] = "unknown", clerk_user_id: string | null = null): ActionAttendanceEntryRow {
  return {
    id, action_id: "action-1", display_label, clerk_user_id, provenance: clerk_user_id ? "organizer_link" : "organizer_entry",
    attendance_status: status, observed_at: status === "present" || status === "absent" ? "2026-10-21T09:00:00.000Z" : null,
    created_by: "clerk-owner", created_at: "2026-10-20T09:00:00.000Z", updated_at: "2026-10-20T09:00:00.000Z",
    updated_by: "clerk-owner", revision: 1, deleted_at: null, deleted_by: null,
  };
}

let active = [entry("entry-1", "Alex Martin"), entry("entry-2", "Alex Martin", "present"), entry("entry-3", "Sam", "absent")];
let requests: Array<Record<string, unknown>> = [];
const harness = createReactDomHarness();
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function setInput(input: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
}

function fieldInput(host: HTMLElement, labelText: string): HTMLInputElement | null {
  return [...host.querySelectorAll<HTMLElement>(".cmm-field")]
    .find((field) => field.querySelector("label")?.textContent?.includes(labelText))
    ?.querySelector("input") ?? null;
}

afterEach(() => {
  harness.cleanup();
  active = [entry("entry-1", "Alex Martin"), entry("entry-2", "Alex Martin", "present"), entry("entry-3", "Sam", "absent")];
  requests = [];
  vi.restoreAllMocks();
});

describe("ActionAttendanceRegistryPanel with the real registry hook", () => {
  it("waits for a persisted actionId, then reuses the same roster through preparation, day, and bilan", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.method === "POST") return response({ entry: active[0] });
      return response({
        actionId: "action-1", entries: active, teams: [{
          id: "team-1", action_id: "action-1", name: "Équipe berge", normalized_name: "équipe berge",
          leader_entry_id: "entry-1", revision: 2, created_by: "clerk-owner", created_at: "2026-10-20T09:00:00.000Z",
          updated_by: "clerk-owner", updated_at: "2026-10-20T09:00:00.000Z", member_entry_ids: ["entry-1", "entry-2"],
        }], declared: { total: 4, adults: 2, retired: 1, children: 1 }, canMarkPresent: false,
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const mounted = harness.mount(<ActionAttendanceRegistryEntryPoint actionId={null} mode="preparation" />);
    expect(mounted.textContent).toContain("accessible après l’enregistrement de l’action");
    expect(mounted.querySelector('[data-testid="action-attendance-registry-preparation"]')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    harness.render(<ActionAttendanceRegistryEntryPoint actionId="action-1" mode="preparation" />);
    await harness.flush();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(mounted.querySelector('[data-testid="action-attendance-registry-preparation"]')).not.toBeNull();
    expect(mounted.textContent).toContain("Les inscriptions confirmées apparaissent ici");
    expect(mounted.textContent).toContain("Saisissez un libellé minimal.");
    expect(mounted.textContent).toContain("Évitez les données médicales, coordonnées ou informations inutiles, surtout pour les mineurs.");
    expect(mounted.querySelectorAll("ul.divide-y > li")).toHaveLength(3);
    expect(mounted.textContent).toContain("Présent");
    expect([...mounted.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Présent")?.disabled).toBe(true);
    expect(mounted.querySelector('[data-testid="action-attendance-teams"]')?.textContent).toContain("Équipe berge");
    expect(mounted.querySelector('[data-testid="action-attendance-teams"]')?.textContent).toContain("2 personnes attendues");

    harness.render(<ActionAttendanceRegistryPanel actionId="action-1" mode="day" />);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(mounted.querySelector('[data-testid="action-attendance-registry-day"]')).not.toBeNull();
    expect(mounted.querySelectorAll("ul.divide-y > li")).toHaveLength(3);
    expect(mounted.querySelector('[data-testid="action-attendance-teams"]')?.textContent).toContain("Équipe berge");
    harness.render(<ActionAttendanceRegistryPanel actionId="action-1" mode="bilan" />);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(mounted.querySelector('[data-testid="action-attendance-registry-bilan"]')).not.toBeNull();
    expect(mounted.querySelectorAll("ul.divide-y > li")).toHaveLength(3);
    expect(mounted.querySelector('[data-testid="action-attendance-teams"]')?.textContent).toContain("Équipe berge");
    expect(mounted.textContent).toContain("Écart non rapproché : 3");
    const registryReads = fetchMock.mock.calls.filter(([, init]) => init?.method !== "POST");
    expect(registryReads).toHaveLength(2);
    expect(registryReads.every(([url]) => String(url).includes("/api/actions/action-1/attendance-registry"))).toBe(true);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });

  it("keeps the preparation entry point unavailable when the organizer cannot access the registry", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ error: "Accès refusé." }, 403)));
    const mounted = harness.mount(<ActionAttendanceRegistryEntryPoint actionId="action-1" mode="preparation" />);
    await harness.flush();
    expect(mounted.querySelector('[data-testid="action-attendance-registry-preparation"]')).toBeNull();
    expect(mounted.textContent).not.toContain("Alex Martin");
  });

  it("shows a server read error and retry affordance in preparation mode", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ error: "Indisponible" }, 500)));
    const mounted = harness.mount(<ActionAttendanceRegistryEntryPoint actionId="action-1" mode="preparation" />);
    await harness.flush();
    expect(mounted.textContent).toContain("Le registre privé est indisponible.");
    expect(mounted.querySelector('[role="alert"]')).not.toBeNull();
    expect([...mounted.querySelectorAll("button")].some((button) => button.textContent === "Réessayer")).toBe(true);
  });

  it("keeps counters and bilan independent from the displayed search results", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("/api/chat/users")) return response({ users: [] });
      if (init?.method === "POST") return response({ entry: active[0] });
      return response({ actionId: "action-1", entries: active, declared: { total: 4, adults: 2, retired: 1, children: 1 }, canMarkPresent: true });
    }));
    const mounted = harness.mount(<ActionAttendanceRegistryPanel actionId="action-1" mode="bilan" />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(mounted.textContent).toContain("Écart non rapproché : 3");
    expect(mounted.textContent).toContain("Présents identifiés : 1");
    const panel = mounted.querySelector<HTMLElement>('[data-testid="action-attendance-registry-bilan"]');
    const filter = panel ? fieldInput(panel, "Rechercher dans la liste") : null;
    if (!filter) throw new Error("filter input missing");
    await setInput(filter, "Alex");
    expect(panel?.querySelectorAll("ul.divide-y > li")).toHaveLength(2);
    expect([...mounted.querySelectorAll("dl[aria-label='Compteurs de présence'] dd")].map((count) => count.textContent)).toEqual(["1", "1", "1"]);
    expect(mounted.textContent).toContain("Écart non rapproché : 3");
  });

  it("uses one free-form identity field and never links while only typing", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("/api/chat/users")) return response({ users: [] });
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        requests.push(body);
        const created = entry("entry-new", String(body.displayLabel)); active = [...active, created];
        return response({ entry: created });
      }
      return response({ actionId: "action-1", entries: active, declared: { total: 3, adults: 2, retired: 0, children: 1 }, canMarkPresent: true });
    }));
    const mounted = harness.mount(<ActionAttendanceRegistryPanel actionId="action-1" mode="day" />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const panel = mounted.querySelector<HTMLElement>('[data-testid="action-attendance-registry-day"]');
    if (!panel) throw new Error("attendance panel missing");
    const identity = fieldInput(panel, "Identité");
    if (!identity) throw new Error("identity input missing");
    expect([...panel.querySelectorAll(".cmm-field label")].map((label) => label.textContent)).toContain("Identité");
    expect(panel.querySelectorAll(".cmm-field label").length).toBeGreaterThanOrEqual(2);
    const row = panel.querySelector<HTMLElement>("ul.divide-y > li");
    expect(row?.className).toContain("flex-col");
    expect(row?.className).toContain("sm:flex-row");
    await setInput(identity, "Équipe du pont");
    expect(requests).toHaveLength(0);
    expect(mounted.textContent).toContain("Vous pouvez rechercher un compte Clerk (facultatif)");
    const addButton = [...panel.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Ajouter à la liste");
    await act(async () => { addButton?.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(requests[0]).toMatchObject({ operation: "add", displayLabel: "Équipe du pont", attendanceStatus: "unknown" });
    expect(requests[0]).not.toHaveProperty("clerkUserId");
  });

  it("exposes explicit account linking and preserves identity/status when the server accepts it", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("/api/chat/users")) return response({ users: [{ id: "user_123", handle: "alex", display_name: "Alex Martin" }] });
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        requests.push(body);
        const linked = { ...active[0], clerk_user_id: "user_123", provenance: "organizer_link" as const, revision: 2 };
        active = [linked, ...active.slice(1)];
        return response({ entry: linked });
      }
      return response({ actionId: "action-1", entries: active, declared: { total: 3, adults: 2, retired: 0, children: 1 }, canMarkPresent: true });
    }));
    const mounted = harness.mount(<ActionAttendanceRegistryPanel actionId="action-1" mode="day" />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const linkButtons = [...mounted.querySelectorAll<HTMLButtonElement>("button")].filter((button) => button.textContent === "Associer un compte");
    await act(async () => { linkButtons[0]?.click(); });
    const panel = mounted.querySelector<HTMLElement>('[data-testid="action-attendance-registry-day"]');
    const identity = panel ? fieldInput(panel, "Identité") : null;
    if (!identity) throw new Error("identity input missing");
    await setInput(identity, "alex");
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const result = [...panel!.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("associer"));
    await act(async () => { result?.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(requests[0]).toMatchObject({ operation: "link", entryId: "entry-1", expectedRevision: 1, clerkUserId: "user_123" });
    expect(active[0]).toMatchObject({ display_label: "Alex Martin", attendance_status: "unknown", observed_at: null, clerk_user_id: "user_123" });
    expect(active[1]).toMatchObject({ display_label: "Alex Martin", attendance_status: "present", clerk_user_id: null });
  });

  it("keeps the link target available after a 409 duplicate or a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("/api/chat/users")) return response({ users: [{ id: "user_123", handle: "alex", display_name: "Alex Martin" }] });
      if (init?.method === "POST") return response({ error: "Cette entrée a changé. Rechargez le registre." }, 409);
      return response({ actionId: "action-1", entries: active, declared: { total: 3, adults: 2, retired: 0, children: 1 }, canMarkPresent: true });
    }));
    const mounted = harness.mount(<ActionAttendanceRegistryPanel actionId="action-1" mode="day" />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const linkButton = [...mounted.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Associer un compte");
    await act(async () => { linkButton?.click(); });
    const panel = mounted.querySelector<HTMLElement>('[data-testid="action-attendance-registry-day"]');
    const identity = panel ? fieldInput(panel, "Identité") : null;
    if (!identity) throw new Error("identity input missing");
    await setInput(identity, "alex");
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const result = [...panel!.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("associer"));
    await act(async () => { result?.click(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(mounted.textContent).toContain("Cette entrée a changé. Rechargez le registre.");
    expect(mounted.textContent).toContain("Choisissez un compte");
  });

  it("announces network failures and retains the identity draft for retry", async () => {
    let postCount = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("/api/chat/users")) return response({ users: [] });
      if (init?.method === "POST") {
        postCount += 1;
        if (postCount === 1) throw new TypeError("network");
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        const created = entry("entry-new", String(body.displayLabel)); active = [...active, created];
        return response({ entry: created });
      }
      return response({ actionId: "action-1", entries: active, declared: { total: 3, adults: 2, retired: 0, children: 1 }, canMarkPresent: true });
    }));
    const mounted = harness.mount(<ActionAttendanceRegistryPanel actionId="action-1" mode="day" />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const panel = mounted.querySelector<HTMLElement>('[data-testid="action-attendance-registry-day"]');
    const identity = panel ? fieldInput(panel, "Identité") : null;
    if (!identity) throw new Error("identity input missing");
    await setInput(identity, "Équipe vélo");
    const addButton = [...mounted.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Ajouter à la liste");
    await act(async () => { addButton?.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(mounted.textContent).toContain("La sauvegarde a échoué");
    expect(identity.value).toBe("Équipe vélo");
  });

  it("supports the keyboard Enter shortcut on the identity field", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        requests.push(body);
        return response({ entry: entry("entry-keyboard", String(body.displayLabel)) });
      }
      return response({ actionId: "action-1", entries: active, declared: { total: 3, adults: 2, retired: 0, children: 1 }, canMarkPresent: true });
    }));
    const mounted = harness.mount(<ActionAttendanceRegistryPanel actionId="action-1" mode="day" />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const panel = mounted.querySelector<HTMLElement>('[data-testid="action-attendance-registry-day"]');
    const identity = panel ? fieldInput(panel, "Identité") : null;
    if (!identity) throw new Error("identity input missing");
    await setInput(identity, "Patrouille nord");
    await act(async () => {
      identity.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
      await Promise.resolve(); await Promise.resolve();
    });
    expect(requests[0]).toMatchObject({ operation: "add", displayLabel: "Patrouille nord", attendanceStatus: "unknown" });
  });
});
