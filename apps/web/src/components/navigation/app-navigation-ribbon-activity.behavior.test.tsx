// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  useRibbonActivityStatus,
  type RibbonActivityUser,
} from "./app-navigation-ribbon-activity";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function ActivityHarness({ user }: { user: RibbonActivityUser | null }) {
  const state = useRibbonActivityStatus(user);

  return (
    <div>
      <output data-testid="status">{state.activityStatus}</output>
      <output data-testid="updating">{String(state.isUpdatingActivityStatus)}</output>
      <button
        type="button"
        disabled={state.isUpdatingActivityStatus}
        onClick={() => void state.handleActivityStatusToggle()}
      >
        Toggle
      </button>
      {state.activityStatusError ? (
        <p role="alert">{state.activityStatusError}</p>
      ) : null}
    </div>
  );
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

function response(payload: unknown, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(payload),
  };
}

function flushAsyncWork() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe("useRibbonActivityStatus behavior", () => {
  let host: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function render(user: RibbonActivityUser | null) {
    host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(<ActivityHarness user={user} />);
    });
  }

  function status() {
    return host.querySelector("[data-testid=status]")?.textContent;
  }

  it("keeps a signed-out control inert", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(null);

    await act(async () => {
      host.querySelector("button")?.click();
    });

    expect(status()).toBe("active");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("optimistically toggles an active user and reloads after success", async () => {
    const fetchMock = vi.fn().mockReturnValue(response({ activityStatus: "inactive" }));
    const reload = vi.fn().mockRejectedValue(new Error("reload unavailable"));
    vi.stubGlobal("fetch", fetchMock);
    render({ id: "user-active", unsafeMetadata: {}, reload });

    await act(async () => {
      host.querySelector("button")?.click();
    });

    expect(status()).toBe("inactive");
    expect(host.querySelector("[data-testid=updating]")?.textContent).toBe("false");
    expect(reload).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account/activity-status",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ activityStatus: "inactive" }),
      }),
    );
  });

  it("blocks a second toggle while updating and accepts the active response", async () => {
    const pending = deferred<ReturnType<typeof response>>();
    const fetchMock = vi.fn().mockReturnValue(pending.promise);
    const reload = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("fetch", fetchMock);
    render({
      id: "user-inactive",
      unsafeMetadata: { activity_status: "inactive" },
      reload,
    });

    await act(async () => {
      host.querySelector("button")?.click();
      await flushAsyncWork();
    });
    act(() => {
      host.querySelector("button")?.click();
    });

    expect(status()).toBe("active");
    expect(host.querySelector("button")?.disabled).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve(response({}));
      await pending.promise;
    });

    expect(status()).toBe("active");
    expect(host.querySelector("button")?.disabled).toBe(false);
  });

  it("restores the previous status and reports a server error", async () => {
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(response({ error: "Statut refusé." }, false))
      .mockReturnValue(response({}, false));
    vi.stubGlobal("fetch", fetchMock);
    render({ id: "user-error", unsafeMetadata: {}, reload: vi.fn() });

    await act(async () => {
      host.querySelector("button")?.click();
      await flushAsyncWork();
    });

    expect(status()).toBe("active");
    expect(host.querySelector("[role=alert]")?.textContent).toBe("Statut refusé.");

    await act(async () => {
      host.querySelector("button")?.click();
    });
    expect(host.querySelector("[role=alert]")?.textContent).toBe(
      "Impossible de mettre à jour le statut.",
    );
  });

  it("uses the generic message for a non-Error rejection and tolerates invalid JSON", async () => {
    const json = vi.fn().mockRejectedValue(new Error("invalid JSON"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json }));
    render({
      id: "user-json",
      unsafeMetadata: { activity_status: "inactive" },
      reload: vi.fn().mockResolvedValue(undefined),
    });

    await act(async () => {
      host.querySelector("button")?.click();
      await flushAsyncWork();
    });

    expect(status()).toBe("active");
    expect(host.querySelector("[role=alert]")).toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue("network down"));
    await act(async () => {
      host.querySelector("button")?.click();
    });

    expect(status()).toBe("active");
    expect(host.querySelector("[role=alert]")?.textContent).toBe(
      "Impossible de mettre à jour le statut.",
    );
  });

  it("reconciles state when the authenticated identity changes", async () => {
    const fetchMock = vi.fn().mockReturnValue(response({ activityStatus: "inactive" }));
    vi.stubGlobal("fetch", fetchMock);
    render({ id: "first", unsafeMetadata: {}, reload: vi.fn().mockResolvedValue(undefined) });

    await act(async () => {
      host.querySelector("button")?.click();
      await flushAsyncWork();
    });
    expect(status()).toBe("inactive");

    act(() => {
      root.render(
        <ActivityHarness
          user={{
            id: "second",
            unsafeMetadata: { activity_status: "inactive" },
            reload: vi.fn().mockResolvedValue(undefined),
          }}
        />,
      );
    });

    expect(status()).toBe("inactive");
    expect(host.querySelector("[role=alert]")).toBeNull();
  });
});
