import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatorInboxItem } from "@/lib/community/creator-inbox";
import type { CreatorInboxPagePayload } from "./creator-inbox-service";

const fetchCreatorInboxPageMock = vi.hoisted(() => vi.fn());

vi.mock("./creator-inbox-service", () => ({
  fetchCreatorInboxPage: fetchCreatorInboxPageMock,
}));

import { useCreatorInboxPagination } from "./use-creator-inbox-pagination";

function item(id: string, source: CreatorInboxItem["source"] = "feedback"): CreatorInboxItem {
  return {
    id: `${source}-${id}`,
    source,
    sourceLabel: "Feedback",
    sourceRecordId: id,
    title: id,
    subtitle: null,
    authorName: "Utilisateur",
    authorEmail: null,
    authorRole: null,
    createdAt: "2026-10-16T10:00:00.000Z",
    pagePath: "/admin/creator-inbox",
    status: "new",
    sourceStatus: "open",
    priority: "normal",
    context: "Contexte",
    details: [],
    canDelete: true,
    canReview: false,
    hasReplyTarget: false,
  };
}

function page(
  items: CreatorInboxItem[],
  hasMore: boolean,
  nextCursor: string | null,
): CreatorInboxPagePayload {
  return { items, count: items.length, hasMore, nextCursor };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

type PaginationParams = Parameters<typeof useCreatorInboxPagination>[0];

function renderPagination(params: PaginationParams) {
  let result!: ReturnType<typeof useCreatorInboxPagination>;
  let renderer!: ReactTestRenderer;

  function Harness(nextParams: PaginationParams) {
    result = useCreatorInboxPagination(nextParams);
    return null;
  }

  act(() => {
    renderer = create(React.createElement(Harness, params));
  });

  return {
    get result() {
      return result;
    },
    update(nextParams: PaginationParams) {
      act(() => {
        renderer.update(React.createElement(Harness, nextParams));
      });
    },
  };
}

function initialParams(
  overrides: Partial<PaginationParams> = {},
): PaginationParams {
  return {
    initialItems: [item("first")],
    initialHasMore: true,
    initialNextCursor: "cursor-1",
    onError: vi.fn(),
    ...overrides,
  };
}

describe("useCreatorInboxPagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads one next page and advances its coherent page state", async () => {
    fetchCreatorInboxPageMock.mockResolvedValue(
      page([item("second"), item("first")], false, null),
    );
    const hook = renderPagination(initialParams());

    await act(async () => {
      await hook.result.loadNextPage();
    });

    expect(fetchCreatorInboxPageMock).toHaveBeenCalledTimes(1);
    expect(fetchCreatorInboxPageMock).toHaveBeenCalledWith({ cursor: "cursor-1" });
    expect(hook.result.items.map((entry) => entry.sourceRecordId)).toEqual([
      "first",
      "second",
    ]);
    expect(hook.result.hasMore).toBe(false);
    expect(hook.result.nextCursor).toBeNull();
  });

  it("ignores a next page that resolves after a successful replacement", async () => {
    const nextPage = deferred<CreatorInboxPagePayload>();
    fetchCreatorInboxPageMock.mockReturnValue(nextPage.promise);
    const hook = renderPagination(initialParams());

    act(() => {
      void hook.result.loadNextPage();
    });
    const replacementGeneration = hook.result.beginReplacement();
    act(() => {
      expect(
        hook.result.replacePage(
          page([item("fresh")], true, "fresh-cursor"),
          replacementGeneration,
        ),
      ).toBe(true);
    });

    await act(async () => {
      nextPage.resolve(page([item("stale")], false, null));
      await nextPage.promise;
    });

    expect(hook.result.items.map((entry) => entry.sourceRecordId)).toEqual(["fresh"]);
    expect(hook.result.hasMore).toBe(true);
    expect(hook.result.nextCursor).toBe("fresh-cursor");
  });

  it("blocks pagination while a replacement is in flight", async () => {
    const nextPage = deferred<CreatorInboxPagePayload>();
    fetchCreatorInboxPageMock.mockReturnValueOnce(nextPage.promise);
    const hook = renderPagination(initialParams());

    act(() => {
      void hook.result.loadNextPage();
      hook.result.beginReplacement();
      void hook.result.loadNextPage();
    });

    expect(fetchCreatorInboxPageMock).toHaveBeenCalledTimes(1);
    const replacementGeneration = 1;
    await act(async () => {
      nextPage.resolve(page([item("stale")], false, null));
      await nextPage.promise;
    });
    act(() => {
      hook.result.replacePage(
        page([item("refreshed")], false, null),
        replacementGeneration,
      );
    });

    expect(hook.result.items.map((entry) => entry.sourceRecordId)).toEqual([
      "refreshed",
    ]);
    expect(hook.result.nextCursor).toBeNull();
  });

  it("does not request the same cursor twice on rapid clicks", async () => {
    const nextPage = deferred<CreatorInboxPagePayload>();
    fetchCreatorInboxPageMock.mockReturnValue(nextPage.promise);
    const hook = renderPagination(initialParams());

    act(() => {
      void hook.result.loadNextPage();
      void hook.result.loadNextPage();
    });
    expect(fetchCreatorInboxPageMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      nextPage.resolve(page([item("second")], false, null));
      await nextPage.promise;
    });
  });

  it("synchronizes the list and metadata when initial props change", async () => {
    const nextPage = deferred<CreatorInboxPagePayload>();
    fetchCreatorInboxPageMock.mockReturnValue(nextPage.promise);
    const hook = renderPagination(initialParams());

    act(() => {
      void hook.result.loadNextPage();
    });
    hook.update(
      initialParams({
        initialItems: [item("replacement")],
        initialHasMore: false,
        initialNextCursor: null,
      }),
    );

    expect(hook.result.items.map((entry) => entry.sourceRecordId)).toEqual([
      "replacement",
    ]);
    expect(hook.result.hasMore).toBe(false);
    expect(hook.result.nextCursor).toBeNull();

    await act(async () => {
      nextPage.resolve(page([item("stale")], true, "stale-cursor"));
      await nextPage.promise;
    });
    expect(hook.result.items.map((entry) => entry.sourceRecordId)).toEqual([
      "replacement",
    ]);
  });

  it("preserves items on failure and permits a retry", async () => {
    const onError = vi.fn();
    fetchCreatorInboxPageMock
      .mockRejectedValueOnce(new Error("page unavailable"))
      .mockResolvedValueOnce(page([item("second")], false, null));
    const hook = renderPagination(initialParams({ onError }));

    await act(async () => {
      await hook.result.loadNextPage();
    });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(hook.result.items.map((entry) => entry.sourceRecordId)).toEqual(["first"]);
    expect(hook.result.hasMore).toBe(true);
    expect(hook.result.nextCursor).toBe("cursor-1");

    await act(async () => {
      await hook.result.loadNextPage();
    });
    expect(fetchCreatorInboxPageMock).toHaveBeenCalledTimes(2);
    expect(hook.result.items.map((entry) => entry.sourceRecordId)).toEqual([
      "first",
      "second",
    ]);
  });
});
