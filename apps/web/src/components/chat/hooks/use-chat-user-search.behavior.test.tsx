// @vitest-environment jsdom

import { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";
import { useChatUserSearch } from "./use-chat-user-search";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function Probe({
  mentionUsersKey,
  dmUsersKey,
}: {
  mentionUsersKey: string | null;
  dmUsersKey: string | null;
}) {
  useChatUserSearch({ mentionUsersKey, dmUsersKey });
  return null;
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useChatUserSearch request lifecycle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not cross-cancel mention and DM searches sharing the chat endpoint", async () => {
    const mention = deferred<Response>();
    const dm = deferred<Response>();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(mention.promise)
      .mockReturnValueOnce(dm.promise);
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;

    try {
      act(() => {
        renderer = create(
          <SWRConfig value={{ provider: () => new Map() }}>
            <Probe
              mentionUsersKey="/api/chat/users?q=al"
              dmUsersKey="/api/chat/users?q=bo"
            />
          </SWRConfig>,
        );
      });
      await flushPromises();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect((fetchMock.mock.calls[0]?.[1] as RequestInit).signal?.aborted).toBe(false);
      expect((fetchMock.mock.calls[1]?.[1] as RequestInit).signal?.aborted).toBe(false);

      await act(async () => {
        mention.resolve(new Response(JSON.stringify({ users: [] }), { status: 200 }));
        dm.resolve(new Response(JSON.stringify({ users: [] }), { status: 200 }));
        await flushPromises();
      });
    } finally {
      renderer?.unmount();
      vi.unstubAllGlobals();
    }
  });
});
