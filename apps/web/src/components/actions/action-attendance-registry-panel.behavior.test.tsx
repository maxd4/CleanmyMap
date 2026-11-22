// @vitest-environment jsdom

import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createReactDomHarness } from "@/__tests__/support/action-behavior-test-helpers";
import type { ActionAttendanceEntryRow } from "@/types/database";
import { ActionAttendanceRegistryPanel } from "./action-attendance-registry-panel";

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

afterEach(() => {
  harness.cleanup();
  active = [entry("entry-1", "Alex Martin"), entry("entry-2", "Alex Martin", "present"), entry("entry-3", "Sam", "absent")];
  requests = [];
  vi.restoreAllMocks();
});

describe("ActionAttendanceRegistryPanel with the real registry hook", () => {
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
    const filter = mounted.querySelectorAll<HTMLInputElement>("input")[1];
    if (!filter) throw new Error("filter input missing");
    await setInput(filter, "Alex");
    expect(mounted.querySelectorAll("ul.divide-y > li")).toHaveLength(2);
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
    const identity = mounted.querySelector<HTMLInputElement>('input[aria-describedby]');
    if (!identity) throw new Error("identity input missing");
    expect(mounted.querySelectorAll("input")).toHaveLength(2); // identité et filtre de liste
    const row = mounted.querySelector<HTMLElement>("ul.divide-y > li");
    expect(row?.className).toContain("flex-col");
    expect(row?.className).toContain("sm:flex-row");
    await setInput(identity, "Équipe du pont");
    expect(requests).toHaveLength(0);
    expect(mounted.textContent).toContain("recherchez un compte Clerk (facultatif)");
    await act(async () => { mounted.querySelector<HTMLButtonElement>("button")?.click(); await Promise.resolve(); await Promise.resolve(); });
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
    const identity = mounted.querySelector<HTMLInputElement>('input[aria-describedby]');
    if (!identity) throw new Error("identity input missing");
    await setInput(identity, "alex");
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const result = [...mounted.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("associer"));
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
    const identity = mounted.querySelector<HTMLInputElement>('input[aria-describedby]');
    if (!identity) throw new Error("identity input missing");
    await setInput(identity, "alex");
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const result = [...mounted.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("associer"));
    await act(async () => { result?.click(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(mounted.textContent).toContain("La liste a été actualisée");
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
    const identity = mounted.querySelector<HTMLInputElement>('input[aria-describedby]');
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
    const identity = mounted.querySelector<HTMLInputElement>("input");
    if (!identity) throw new Error("identity input missing");
    await setInput(identity, "Patrouille nord");
    await act(async () => {
      identity.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
      await Promise.resolve(); await Promise.resolve();
    });
    expect(requests[0]).toMatchObject({ operation: "add", displayLabel: "Patrouille nord", attendanceStatus: "unknown" });
  });
});
