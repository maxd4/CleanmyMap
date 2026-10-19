import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { act, create } from "react-test-renderer";

const mocks = vi.hoisted(() => ({
  useSWR: vi.fn(),
}));

vi.mock("swr", () => ({
  default: mocks.useSWR,
}));

import {
  fetchPilotageOverview,
  type ElusOverviewIdentity,
  useElusOverview,
} from "./elus-section-overview";

const identity = (userId: string | null, overrides: Partial<ElusOverviewIdentity> = {}): ElusOverviewIdentity => ({
  isLoaded: true,
  isSignedIn: userId !== null,
  userId,
  ...overrides,
});

beforeEach(() => {
  mocks.useSWR.mockReturnValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ElusSection overview loader", () => {
  it("suspends periodic refresh while the methodology tab is active", () => {
    useElusOverview("methods", identity("user-a"));

    expect(mocks.useSWR).toHaveBeenCalledWith(
      ["/api/pilotage/overview", "user-a"],
      expect.any(Function),
      expect.objectContaining({
        refreshInterval: 0,
        revalidateIfStale: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        keepPreviousData: false,
      }),
    );
  });

  it("keeps the institutional refresh cadence on data tabs", () => {
    useElusOverview("zones", identity("user-a"));

    expect(mocks.useSWR).toHaveBeenCalledWith(
      ["/api/pilotage/overview", "user-a"],
      expect.any(Function),
      expect.objectContaining({ refreshInterval: 1_800_000 }),
    );
  });

  it("does not activate the private read before Clerk identity is resolved or when signed out", () => {
    const unresolved = useElusOverview("overview", identity(null, { isLoaded: false }));
    expect(unresolved.data).toBeUndefined();
    expect(unresolved.isLoading).toBe(true);
    expect(mocks.useSWR).toHaveBeenLastCalledWith(
      null,
      expect.any(Function),
      expect.any(Object),
    );

    const signedOut = useElusOverview("overview", identity(null));
    expect(signedOut.data).toBeUndefined();
    expect(signedOut.isLoading).toBe(false);
    expect(mocks.useSWR).toHaveBeenLastCalledWith(
      null,
      expect.any(Function),
      expect.any(Object),
    );
  });

  it("keeps the identity in the SWR cache key without sending it to the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    useElusOverview("overview", identity("user-a"));
    const [, fetcher] = mocks.useSWR.mock.calls.at(-1) as [
      readonly [string, string],
      (key: readonly [string, string]) => Promise<unknown>,
    ];

    await fetcher(["/api/pilotage/overview", "user-a"]);

    expect(fetchMock).toHaveBeenCalledWith("/api/pilotage/overview", {
      method: "GET",
      cache: "no-store",
    });
  });

  it("keeps snapshots isolated when the identity changes and reuses only the same identity cache", () => {
    const snapshots = new Map([
      ["user-a", { status: "ok", generatedAt: "snapshot-a" }],
      ["user-b", undefined],
    ]);
    mocks.useSWR.mockImplementation((key: readonly [string, string] | null) => {
      const currentIdentity = key?.[1];
      return {
        data: currentIdentity ? snapshots.get(currentIdentity) : undefined,
        error: currentIdentity === "user-b" ? new Error("forbidden") : undefined,
        isLoading: Boolean(currentIdentity && !snapshots.get(currentIdentity)),
      };
    });

    function IdentityProbe({ currentIdentity }: { currentIdentity: ElusOverviewIdentity }) {
      const result = useElusOverview("overview", currentIdentity);
      return React.createElement("output", null, result.data?.generatedAt ?? "empty");
    }

    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(IdentityProbe, { currentIdentity: identity("user-a") }));
    });
    expect(renderer!.root.findByType("output").props.children).toBe("snapshot-a");

    act(() => {
      renderer!.update(React.createElement(IdentityProbe, { currentIdentity: identity("user-b") }));
    });
    expect(renderer!.root.findByType("output").props.children).toBe("empty");

    snapshots.set("user-a", { status: "ok", generatedAt: "late-a-response" });
    act(() => {
      renderer!.update(React.createElement(IdentityProbe, { currentIdentity: identity("user-b") }));
    });
    expect(renderer!.root.findByType("output").props.children).toBe("empty");

    act(() => {
      renderer!.update(React.createElement(IdentityProbe, { currentIdentity: identity("user-a") }));
    });
    expect(renderer!.root.findByType("output").props.children).toBe("late-a-response");
  });

  it("keeps the no-store request and response contract", async () => {
    const payload = {
      status: "ok",
      generatedAt: "2026-10-03T00:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPilotageOverview("/api/pilotage/overview")).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("/api/pilotage/overview", {
      method: "GET",
      cache: "no-store",
    });
  });

  it("preserves the response status and body when loading fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPilotageOverview("/api/pilotage/overview")).rejects.toMatchObject({
      message: "forbidden",
      status: 403,
    });
  });
});
