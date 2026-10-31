import { act, create, type ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type { ReferralSummary } from "@/lib/gamification/referrals/referrals";
import { ReferralInviteBadge } from "./referral-invite-badge";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type ButtonProps = { children?: unknown; disabled?: boolean; onClick?: () => void };

function textOf(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textOf).join("");
  if (value && typeof value === "object" && "children" in value) {
    return textOf((value as { children?: unknown }).children);
  }
  if (value && typeof value === "object" && "props" in value) {
    return textOf((value as { props?: { children?: unknown } }).props?.children);
  }
  return "";
}

function propsOf(node: ReactTestInstance): ButtonProps {
  return node.props as unknown as ButtonProps;
}

function button(renderer: ReturnType<typeof create>, label: string): ReactTestInstance {
  const found = renderer.root.findAllByType("button").find((node) => textOf(propsOf(node).children).includes(label));
  if (!found) throw new Error(`Button not found: ${label}`);
  return found;
}

function summary(overrides: Partial<ReferralSummary> = {}): ReferralSummary {
  return {
    referralCode: null,
    inviteUrl: null,
    invitedUsersCount: 0,
    invitedBy: null,
    badgeUnlocked: false,
    referralAwardedXp: 0,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe("ReferralInviteBadge behavior", () => {
  it("creates one invite at a time and renders the returned summary without awarding XP early", async () => {
    const request = deferred<Response>();
    const fetchMock = vi.fn(() => request.promise);
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<ReferralInviteBadge summary={summary()} />); });

    const createButton = button(renderer, "Créer mon lien d'invitation");
    act(() => {
      propsOf(createButton).onClick?.();
      propsOf(createButton).onClick?.();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(propsOf(button(renderer, "Création...")).disabled).toBe(true);

    await act(async () => {
      request.resolve(new Response(JSON.stringify({
        status: "ok",
        created: true,
        summary: summary({ referralCode: "ABCD1234", inviteUrl: "https://cleanmymap.fr/sign-up?ref=ABCD1234" }),
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
      await request.promise;
    });

    expect(textOf(renderer.toJSON())).toContain("ABCD1234");
    expect(textOf(renderer.toJSON())).toContain("+2");
    expect(textOf(renderer.toJSON())).not.toContain("XP attribués");
    renderer.unmount();
  });

  it("keeps the invite action retryable after invalid or failed responses", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "error" }), { status: 502 }))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<ReferralInviteBadge summary={summary()} />); });

    await act(async () => { propsOf(button(renderer, "Créer mon lien d'invitation")).onClick?.(); await Promise.resolve(); });
    expect(textOf(renderer.toJSON())).toContain("Impossible de créer le lien d'invitation");
    expect(button(renderer, "Créer mon lien d'invitation")).toBeTruthy();

    await act(async () => { propsOf(button(renderer, "Créer mon lien d'invitation")).onClick?.(); await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(textOf(renderer.toJSON())).toContain("Impossible de créer le lien d'invitation");
    renderer.unmount();
  });
});
