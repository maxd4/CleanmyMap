import { act, create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CommunitySubscriptionsSetting } from "./community-subscriptions-setting";
import type { CommunitySubscriptionRow } from "@/lib/community/subscriptions";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function subscription(id: string, kind: CommunitySubscriptionRow["kind"], label: string): CommunitySubscriptionRow {
  return {
    id,
    user_id: "user_1",
    kind,
    territory_zone_name: kind === "territory" ? label : null,
    topic_id: kind === "topic" ? "future_actions" : null,
    cadence: "weekly",
    enabled: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("CommunitySubscriptionsSetting", () => {
  it("exposes the initial network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<CommunitySubscriptionsSetting locale="fr" />);
      await settle();
    });

    expect(renderer.root.findAll((node) => node.props?.role === "alert")).not.toHaveLength(0);
    renderer.unmount();
  });

  it("disables every mutation while one subscription mutation is pending and restores them after success or failure", async () => {
    const first = subscription("subscription-a", "territory", "Bordeaux");
    const second = subscription("subscription-b", "topic", "future_actions");
    const firstMutation = deferred<ReturnType<typeof jsonResponse>>();
    const failedMutation = deferred<ReturnType<typeof jsonResponse>>();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ items: [first, second] }))
      .mockReturnValueOnce(firstMutation.promise)
      .mockReturnValueOnce(failedMutation.promise);
    vi.stubGlobal("fetch", fetchMock);

    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<CommunitySubscriptionsSetting locale="fr" />);
      await settle();
    });

    const mutationButtons = () => renderer.root.findAllByType("button").filter((node) => node.children.includes("Désactiver") || node.children.includes("Réactiver"));
    const deleteButtons = () => renderer.root.findAllByType("button").filter((node) => node.children.includes("Ne plus suivre"));
    const cadenceSelects = () => renderer.root.findAll((node) => node.type === "select" && typeof node.props["aria-label"] === "string");
    expect(mutationButtons()).toHaveLength(2);
    expect(deleteButtons()).toHaveLength(2);

    await act(async () => {
      mutationButtons()[0]?.props.onClick();
      await settle();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mutationButtons()[1]?.props.disabled).toBe(true);
    expect(deleteButtons()[1]?.props.disabled).toBe(true);
    expect(cadenceSelects()[1]?.props.disabled).toBe(true);

    await act(async () => {
      mutationButtons()[1]?.props.onClick({ preventDefault: vi.fn(), stopPropagation: vi.fn() });
      await settle();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      firstMutation.resolve(jsonResponse({ item: { ...first, enabled: false } }));
      await settle();
    });
    expect(Boolean(mutationButtons()[1]?.props.disabled)).toBe(false);
    expect(Boolean(deleteButtons()[1]?.props.disabled)).toBe(false);
    expect(Boolean(cadenceSelects()[1]?.props.disabled)).toBe(false);

    await act(async () => {
      mutationButtons()[0]?.props.onClick();
      await settle();
    });
    expect(mutationButtons()[1]?.props.disabled).toBe(true);
    expect(deleteButtons()[1]?.props.disabled).toBe(true);

    await act(async () => {
      failedMutation.reject(new Error("offline"));
      await settle();
    });
    expect(Boolean(mutationButtons()[1]?.props.disabled)).toBe(false);
    expect(Boolean(deleteButtons()[1]?.props.disabled)).toBe(false);
    expect(Boolean(cadenceSelects()[1]?.props.disabled)).toBe(false);
    expect(renderer.root.findAll((node) => node.props?.role === "alert")).not.toHaveLength(0);
    renderer.unmount();
  });
});
