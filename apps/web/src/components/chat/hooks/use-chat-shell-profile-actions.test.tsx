import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChatShellProfileActions } from "./use-chat-shell-profile-actions";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function response(ok: boolean, status = ok ? 200 : 422): Response {
  return {
    ok,
    status,
    json: async () => (ok ? {} : { error: "Pseudo indisponible" }),
  } as Response;
}

type HookParams = Parameters<typeof useChatShellProfileActions>[0];

function renderHook(params: HookParams) {
  let action!: ReturnType<typeof useChatShellProfileActions>;
  let renderer!: ReactTestRenderer;

  function Harness(nextParams: HookParams) {
    action = useChatShellProfileActions(nextParams);
    return null;
  }

  act(() => {
    renderer = create(React.createElement(Harness, params));
  });

  return {
    get action() {
      return action;
    },
    unmount() {
      renderer.unmount();
    },
  };
}

describe("useChatShellProfileActions", () => {
  beforeEach(() => {
    vi.stubGlobal("alert", vi.fn());
    vi.stubGlobal("location", { reload: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends one PATCH when confirmation is activated twice before the first response", async () => {
    const pending = deferred<Response>();
    const fetchMock = vi.fn(() => pending.promise);
    vi.stubGlobal("fetch", fetchMock);
    const hook = renderHook({ newHandle: "nouveau", setIsEditingHandle: vi.fn() });

    let firstConfirmation!: Promise<void>;
    let secondConfirmation!: Promise<void>;
    act(() => {
      firstConfirmation = hook.action();
      secondConfirmation = hook.action();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/profile/handle",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ handle: "nouveau" }) }),
    );

    await act(async () => {
      pending.resolve(response(true));
      await firstConfirmation;
      await secondConfirmation;
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    hook.unmount();
  });

  it("releases the confirmation lock after a failed PATCH so an explicit retry can proceed", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(false))
      .mockResolvedValueOnce(response(true));
    vi.stubGlobal("fetch", fetchMock);
    const hook = renderHook({ newHandle: "nouveau", setIsEditingHandle: vi.fn() });

    await act(async () => {
      await hook.action();
    });
    await act(async () => {
      await hook.action();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(vi.mocked(alert)).toHaveBeenCalledOnce();
    hook.unmount();
  });
});
