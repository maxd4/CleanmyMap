import * as React from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";
import { RoleManagementPanel } from "./role-management-panel";
import type { RoleAccountRecord } from "@/lib/admin/role-management";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type ButtonProps = { children?: React.ReactNode; disabled?: boolean; onClick?: () => void };
type InputProps = { onChange: (event: React.ChangeEvent<HTMLInputElement>) => void };
type TextareaProps = { onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void };
type FormProps = { onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void> };

function propsOf<Props>(node: ReactTestInstance): Props {
  return node.props as unknown as Props;
}

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
  return renderer.root.findAllByType("button").find((item) => propsOf<ButtonProps>(item).children === label);
}

function textContent(renderer: ReactTestRenderer) {
  return renderer.root.findAll((node) => typeof node.children[0] === "string").map((node) => node.children.join(" ")).join(" ");
}

describe("RoleManagementPanel controller", () => {
  it("rejects short searches and role mutations without a reason", async () => {
    const renderer = renderPanel();
    const input = renderer.root.findByType("input");
    const form = renderer.root.findByType("form");
    await act(async () => { propsOf<InputProps>(input).onChange({ target: { value: "x" } } as React.ChangeEvent<HTMLInputElement>); });
    await act(async () => { await propsOf<FormProps>(form).onSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>); });
    expect(textContent(renderer)).toContain("Tape au moins 2 caractères");
    const assign = button(renderer, "Attribuer admin");
    await act(async () => { propsOf<ButtonProps>(assign!).onClick?.(); });
    expect(textContent(renderer)).toContain("Indiquez la raison");
  });

  it("searches successfully, handles refusal, then clears results", async () => {
    const renderer = renderPanel();
    const input = renderer.root.findByType("input");
    const form = renderer.root.findByType("form");
    const response = { ok: true, json: async () => ({ accounts: [account("found", "elu")] }) };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response));
    await act(async () => { propsOf<InputProps>(input).onChange({ target: { value: "found" } } as React.ChangeEvent<HTMLInputElement>); });
    await act(async () => { await propsOf<FormProps>(form).onSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>); });
    expect(textContent(renderer)).toContain("1 résultat(s)");
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Recherche refusée" }) } as Response);
    await act(async () => { await propsOf<FormProps>(form).onSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>); });
    expect(textContent(renderer)).toContain("Recherche refusée");
    const clear = button(renderer, "Effacer");
    await act(async () => { if (clear) propsOf<ButtonProps>(clear).onClick?.(); });
    expect(renderer.root.findAllByType("table").length).toBe(1);
  });

  it("disables the action during persistence, updates the account, and reports non-Error failures", async () => {
    const pending = deferred<Response>();
    const renderer = renderPanel("en");
    const reason = renderer.root.findByType("textarea");
    await act(async () => { propsOf<TextareaProps>(reason).onChange({ target: { value: "Valid role change reason" } } as React.ChangeEvent<HTMLTextAreaElement>); });
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(pending.promise));
    const assign = button(renderer, "Assign admin");
    await act(async () => { propsOf<ButtonProps>(assign!).onClick?.(); });
    expect(propsOf<ButtonProps>(assign!).disabled).toBe(true);
    pending.resolve({ ok: true, json: async () => ({ account: account("other", "admin") }) } as Response);
    await act(async () => { await pending.promise; });
    expect(textContent(renderer)).toContain("Administrator");

    vi.mocked(fetch).mockRejectedValueOnce("network failure");
    await act(async () => { propsOf<TextareaProps>(renderer.root.findByType("textarea")).onChange({ target: { value: "Another valid reason" } } as React.ChangeEvent<HTMLTextAreaElement>); });
    const revoke = button(renderer, "Revoke");
    await act(async () => { propsOf<ButtonProps>(revoke!).onClick?.(); await Promise.resolve(); });
    expect(textContent(renderer)).toContain("An unexpected error occurred.");
  });
});
