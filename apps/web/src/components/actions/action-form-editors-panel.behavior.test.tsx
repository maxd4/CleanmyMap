// @vitest-environment jsdom

import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createReactDomHarness } from "@/__tests__/support/action-behavior-test-helpers";
import { ActionFormEditorsPanel } from "./action-form-editors-panel";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const harness = createReactDomHarness();

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  harness.cleanup();
  vi.restoreAllMocks();
});

describe("ActionFormEditorsPanel", () => {
  it("grants a searched Clerk account without changing attendance and links to the current form", async () => {
    let editorIds = ["user-existing"];
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      if (url.includes("/api/chat/users?")) {
        return response({ users: [{ id: "user-new", handle: "lea", display_name: "Léa Martin" }] });
      }
      if (init?.method === "POST") {
        editorIds = [...editorIds, "user-new"];
        return response({ result: { granted: true } });
      }
      return response({ actionId: "action-1", actionPhase: "post_action_draft", editorIds });
    }));

    const host = harness.mount(<ActionFormEditorsPanel actionId="action-1" />);
    await harness.flush();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(host.textContent).toContain("user-existing");
    expect(host.querySelector('a[href="/actions/new?tab=after&actionId=action-1"]')).not.toBeNull();

    const searchField = [...host.querySelectorAll<HTMLElement>(".cmm-field")]
      .find((field) => field.querySelector("label")?.textContent?.includes("Rechercher un compte Clerk à autoriser"));
    const search = searchField?.querySelector<HTMLInputElement>("input") ?? null;
    expect(search).not.toBeNull();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(search, "Lea");
      search?.dispatchEvent(new Event("input", { bubbles: true }));
      search?.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });
    const accountButton = [...host.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.includes("Léa Martin"));
    expect(accountButton).toBeDefined();
    await act(async () => { accountButton?.click(); });
    const grantButton = [...host.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Accorder le privilège");
    await act(async () => { grantButton?.click(); await Promise.resolve(); await Promise.resolve(); });

    const grantRequest = requests.find(({ init }) => init?.method === "POST");
    expect(JSON.parse(String(grantRequest?.init?.body))).toMatchObject({ operation: "grant", clerkUserId: "user-new" });
    expect(requests.some(({ url }) => url.includes("attendance-registry"))).toBe(false);
    expect(host.textContent).toContain("user-new");
  });

  it("requires confirmation before revoking an editor and refreshes the explicit state", async () => {
    let editorIds = ["user-editor"];
    let confirmed = false;
    vi.spyOn(window, "confirm").mockImplementation(() => { confirmed = true; return true; });
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      if (init?.method === "POST") {
        editorIds = [];
        return response({ result: { granted: false } });
      }
      return response({ actionId: "action-1", actionPhase: "pre_action", editorIds });
    }));

    const host = harness.mount(<ActionFormEditorsPanel actionId="action-1" />);
    await harness.flush();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    const revokeButton = [...host.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Révoquer");
    await act(async () => { revokeButton?.click(); await Promise.resolve(); await Promise.resolve(); });

    expect(confirmed).toBe(true);
    expect(JSON.parse(String(requests.find(({ init }) => init?.method === "POST")?.init?.body))).toMatchObject({ operation: "revoke", clerkUserId: "user-editor" });
    expect(host.textContent).toContain("Aucun éditeur délégué.");
  });
});
