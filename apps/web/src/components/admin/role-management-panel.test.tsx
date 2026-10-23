import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";
import { RoleManagementPanel } from "./role-management-panel";
import type { RoleAccountRecord } from "@/lib/admin/role-management";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function account(userId: string, roleLabel: RoleAccountRecord["roleLabel"]): RoleAccountRecord {
  return { userId, displayName: userId, handle: userId, avatarUrl: null, roleLabel, parisArrondissement: null, updatedAt: null };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

function renderPanel(locale: "fr" | "en" = "fr") {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(React.createElement(SitePreferencesProvider, { initialLocale: locale } as React.ComponentProps<typeof SitePreferencesProvider>, React.createElement(RoleManagementPanel, {
      currentUserId: "self",
      initialAccounts: [account("self", "admin"), account("other", "benevole")],
    })));
  });
  return renderer;
}

function button(renderer: ReactTestRenderer, label: string) {
  return renderer.root.findAllByType("button").find((item) => item.props.children === label);
}

function textContent(renderer: ReactTestRenderer) {
  return renderer.root.findAll((node) => typeof node.children[0] === "string").map((node) => node.children.join(" ")).join(" ");
}

describe("RoleManagementPanel controller", () => {
  it("rejects short searches and role mutations without a reason", async () => {
    const renderer = renderPanel();
    const input = renderer.root.findByType("input");
    const form = renderer.root.findByType("form");
    await act(() => input.props.onChange({ target: { value: "x" } }));
    await act(async () => form.props.onSubmit({ preventDefault: vi.fn() }));
    expect(textContent(renderer)).toContain("Tape au moins 2 caractères");
    const assign = button(renderer, "Attribuer admin");
    await act(async () => assign?.props.onClick());
    expect(textContent(renderer)).toContain("Indiquez la raison");
  });

  it("searches successfully, handles refusal, then clears results", async () => {
    const renderer = renderPanel();
    const input = renderer.root.findByType("input");
    const form = renderer.root.findByType("form");
    const response = { ok: true, json: async () => ({ accounts: [account("found", "elu")] }) };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response));
    await act(() => input.props.onChange({ target: { value: "found" } }));
    await act(async () => form.props.onSubmit({ preventDefault: vi.fn() }));
    expect(textContent(renderer)).toContain("1 résultat(s)");
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Recherche refusée" }) } as Response);
    await act(async () => form.props.onSubmit({ preventDefault: vi.fn() }));
    expect(textContent(renderer)).toContain("Recherche refusée");
    const clear = button(renderer, "Effacer");
    await act(() => clear?.props.onClick());
    expect(renderer.root.findAllByType("table").length).toBe(1);
  });

  it("disables the action during persistence, updates the account, and reports non-Error failures", async () => {
    const pending = deferred<Response>();
    const renderer = renderPanel("en");
    const reason = renderer.root.findByType("textarea");
    await act(() => reason.props.onChange({ target: { value: "Valid role change reason" } }));
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(pending.promise));
    const assign = button(renderer, "Assign admin");
    await act(() => assign?.props.onClick());
    expect(assign?.props.disabled).toBe(true);
    pending.resolve({ ok: true, json: async () => ({ account: account("other", "admin") }) } as Response);
    await act(async () => { await pending.promise; });
    expect(textContent(renderer)).toContain("Administrator");

    vi.mocked(fetch).mockRejectedValueOnce("network failure");
    await act(() => renderer.root.findByType("textarea").props.onChange({ target: { value: "Another valid reason" } }));
    const revoke = button(renderer, "Revoke");
    await act(async () => { revoke?.props.onClick(); await Promise.resolve(); });
    expect(textContent(renderer)).toContain("An unexpected error occurred.");
  });
});
