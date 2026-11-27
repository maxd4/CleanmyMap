// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: null as { id: string; reload: () => Promise<void> } | null,
  pathname: "/methodologie",
  routerReplace: vi.fn(),
  routerRefresh: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: mocks.user }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.routerReplace, refresh: mocks.routerRefresh }),
}));

vi.mock("swr", () => ({
  useSWRConfig: () => ({ mutate: mocks.mutate }),
}));

import { useActiveRoleMutation } from "./use-active-role-mutation";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("useActiveRoleMutation identity isolation", () => {
  let host: HTMLDivElement;
  let root: Root;
  let latestHook!: ReturnType<typeof useActiveRoleMutation>;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    mocks.user = null;
    mocks.routerReplace.mockReset();
    mocks.routerRefresh.mockReset();
    mocks.mutate.mockReset();
    vi.unstubAllGlobals();
  });

  function Harness({ identityUserId }: { identityUserId?: string | null }) {
    latestHook = useActiveRoleMutation(identityUserId);
    return <div data-error={latestHook.profileError ?? ""} />;
  }

  it("scopes SWR cache mutation to the active userId even when Clerk user is loading", async () => {
    mocks.user = null;
    mocks.mutate.mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ profilePath: "/parcours/coordinateur" }), { status: 200 }),
      ),
    );

    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(<Harness identityUserId="user-1" />);
    });

    await act(async () => {
      await latestHook.handleActiveRoleMutation("coordinateur");
    });

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    const keyMatcher = mocks.mutate.mock.calls[0][0] as (key: unknown) => boolean;
    expect(keyMatcher(["current-account-identity", "user-1"])).toBe(true);
    expect(keyMatcher(["current-account-identity", "user-2"])).toBe(false);
  });

  it("ignores late async responses after switching identity", async () => {
    let resolveFetch!: (value: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );

    mocks.user = { id: "user-1", reload: vi.fn().mockResolvedValue(undefined) };
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(<Harness identityUserId="user-1" />);
    });

    let pendingMutation!: Promise<void>;
    act(() => {
      pendingMutation = latestHook.handleActiveRoleMutation("coordinateur");
    });

    // Switch identity before fetch completes
    mocks.user = { id: "user-2", reload: vi.fn().mockResolvedValue(undefined) };
    act(() => {
      root.render(<Harness identityUserId="user-2" />);
    });

    await act(async () => {
      resolveFetch(new Response(JSON.stringify({ error: "Refus tardif" }), { status: 403 }));
      await pendingMutation;
    });

    expect(latestHook.profileError).toBeNull();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("rejects late async responses across an A -> B -> A session cycle", async () => {
    let resolveStaleA!: (value: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveStaleA = resolve;
        }),
      ),
    );

    mocks.user = { id: "user-A", reload: vi.fn().mockResolvedValue(undefined) };
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(<Harness identityUserId="user-A" />);
    });

    let pendingMutation!: Promise<void>;
    act(() => {
      pendingMutation = latestHook.handleActiveRoleMutation("coordinateur");
    });

    // A -> B -> A while A's request is still in flight
    mocks.user = { id: "user-B", reload: vi.fn().mockResolvedValue(undefined) };
    act(() => {
      root.render(<Harness identityUserId="user-B" />);
    });
    mocks.user = { id: "user-A", reload: vi.fn().mockResolvedValue(undefined) };
    act(() => {
      root.render(<Harness identityUserId="user-A" />);
    });

    await act(async () => {
      resolveStaleA(new Response(JSON.stringify({ error: "Ancien A" }), { status: 403 }));
      await pendingMutation;
    });

    expect(latestHook.profileError).toBeNull();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
