import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportsLibrary } from "./reports-library";

function page(title: string) {
  return {
    rows: [{
      id: title,
      title,
      period: "Six mois",
      scope: "Global",
      theme: "impact" as const,
      publishedAt: "2026-08-27T12:30:00.000Z",
      authorLabel: null,
      viewUrl: `/reports/${title}`,
      downloadUrl: `/reports/${title}.pdf`,
    }],
    page: 1,
    pageSize: 12,
    total: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe("ReportsLibrary request lifecycle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps only the newest public filtered response", async () => {
    const first = deferred<{ ok: boolean; json: () => Promise<unknown> }>();
    const second = deferred<{ ok: boolean; json: () => Promise<unknown> }>();
    const fetchMock = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;

    try {
      act(() => {
        renderer = create(<ReportsLibrary initialPage={page("Initial")} />);
      });
      const form = renderer.root.findByType("form");
      act(() => { form.props.onSubmit({ preventDefault: vi.fn() }); });
      act(() => { form.props.onSubmit({ preventDefault: vi.fn() }); });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect((fetchMock.mock.calls[0]?.[1] as RequestInit).signal?.aborted).toBe(true);

      await act(async () => {
        first.resolve({ ok: true, json: async () => page("Obsolète") });
        second.resolve({ ok: true, json: async () => page("Récent") });
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(renderer.root.findAllByType("h3").map((heading) => heading.children.join(""))).toEqual(["Récent"]);
    } finally {
      renderer?.unmount();
      vi.unstubAllGlobals();
    }
  });
});
