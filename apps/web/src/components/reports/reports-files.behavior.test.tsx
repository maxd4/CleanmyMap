import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportsFiles } from "./reports-files";

const mocks = vi.hoisted(() => ({
  createHistoryActions: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/reports/reports-web-document-history-actions", () => ({
  createReportsWebDocumentHistoryActions: mocks.createHistoryActions,
}));

vi.mock("@/components/reports/web-document/reports-web-document-delivery", () => ({
  ReportsWebDocumentDeliveryHistory: ({
    recentRows,
    historyAvailability,
    onDerive,
    onPublish,
    onConfirmPublication,
    publicationPreviewById,
  }: {
    recentRows: Array<{ id: string; report: string }>;
    historyAvailability: string;
    onDerive: (id: string) => void;
    onPublish?: (id: string) => void;
    onConfirmPublication?: (id: string) => void;
    publicationPreviewById?: Record<string, { artifactReady: boolean }>;
  }) => React.createElement(
    "div",
    { "data-testid": "history-state", "data-history-availability": historyAvailability },
    recentRows.flatMap((row) => [
      React.createElement("button", { key: `${row.id}-derive`, type: "button", onClick: () => onDerive(row.id) }, row.report),
      React.createElement("button", { key: `${row.id}-publish`, type: "button", onClick: () => onPublish?.(row.id) }, `Publier ${row.id}`),
      publicationPreviewById?.[row.id]
        ? React.createElement("button", { key: `${row.id}-confirm`, type: "button", disabled: !publicationPreviewById[row.id]?.artifactReady, onClick: () => onConfirmPublication?.(row.id) }, `Confirmer ${row.id}`)
        : null,
    ]),
  ),
}));

function page(overrides: Record<string, unknown> = {}) {
  return {
    rows: [{
      id: "generation-2",
      report: "Rapport page 2",
      period: "Six mois",
      perimeter: "Global",
      detail: "Par défaut",
      generatedAt: "27/08/2026 12:30",
      theme: "scientific" as const,
    }],
    page: 2,
    pageSize: 12,
    total: 25,
    hasNextPage: true,
    hasPreviousPage: true,
    ...overrides,
  };
}

describe("ReportsFiles history state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createHistoryActions.mockImplementation((params: { refreshHistory: () => Promise<boolean> }) => ({
      handleHistoricalAction: vi.fn((_id: string, kind: string) => kind === "derive" ? params.refreshHistory() : undefined),
      handleHistoricalPrint: vi.fn(),
    }));
  });

  it("clears an initial outage after a successful filtered GET", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => page({ page: 1, total: 1, hasNextPage: false, hasPreviousPage: false }),
    });
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;

    try {
      act(() => {
        renderer = create(<ReportsFiles initialPage={page()} initialAvailability="unavailable" />);
      });
      expect(renderer.root.findByProps({ "data-history-availability": "unavailable" })).toBeTruthy();

      const form = renderer.root.findByType("form");
      await act(async () => {
        form.props.onSubmit({ preventDefault: vi.fn() });
        await Promise.resolve();
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(renderer.root.findByProps({ "data-history-availability": "available" })).toBeTruthy();
      const rowButton = renderer.root.findAllByType("button")
        .find((button) => button.children.includes("Rapport page 2"));
      expect(rowButton).toBeTruthy();
    } finally {
      renderer?.unmount();
      vi.unstubAllGlobals();
    }
  });

  it("reloads the active page with its filters after derivation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => page({
        total: 26,
        rows: [{
          id: "generation-3",
          report: "Rapport filtré serveur",
          period: "Six mois",
          perimeter: "Global",
          detail: "Par défaut",
          generatedAt: "27/08/2026 12:40",
          theme: "scientific" as const,
        }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;

    try {
      act(() => {
        renderer = create(<ReportsFiles initialPage={page()} />);
      });
      const inputs = renderer.root.findAllByType("input");
      const selects = renderer.root.findAllByType("select");
      act(() => {
        inputs[0]?.props.onChange({ target: { value: "Paris" } });
        selects[0]?.props.onChange({ target: { value: "six_months" } });
        selects[1]?.props.onChange({ target: { value: "scientific" } });
        selects[2]?.props.onChange({ target: { value: "asc" } });
      });

      const deriveButton = renderer.root.findAllByType("button")
        .find((button) => button.children.includes("Rapport page 2"));
      expect(deriveButton).toBeTruthy();
      await act(async () => {
        deriveButton?.props.onClick();
        await Promise.resolve();
      });

      const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
      expect(requestUrl).toContain("page=2");
      expect(requestUrl).toContain("search=Paris");
      expect(requestUrl).toContain("period=six_months");
      expect(requestUrl).toContain("theme=scientific");
      expect(requestUrl).toContain("sort=asc");
      expect(requestUrl).toContain("pageSize=12");
      const refreshedButton = renderer.root.findAllByType("button")
        .find((button) => button.children.includes("Rapport filtré serveur"));
      expect(refreshedButton).toBeTruthy();
      expect(renderer.root.findAllByType("button")
        .some((button) => button.children.includes("Rapport page 2"))).toBe(false);
    } finally {
      renderer?.unmount();
      vi.unstubAllGlobals();
    }
  });

  it("publishes from the historical row without creating a new generation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preview: { title: "Rapport public", period: "Six mois", scope: "Global", theme: "scientific", artifactReady: true, documentUrl: "/api/reports/library/pub-1/pdf", communicatedContent: "PDF uniquement" } }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ publication: { status: "published" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => page({ total: 25 }) });
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;

    try {
      act(() => {
        renderer = create(<ReportsFiles initialPage={page()} />);
      });
      const publishButton = renderer.root.findAllByType("button").find((button) => button.children.includes("Publier generation-2"));
      await act(async () => {
        publishButton?.props.onClick();
        await Promise.resolve();
      });
      const confirmButton = renderer.root.findAllByType("button").find((button) => button.children.includes("Confirmer generation-2"));
      expect(confirmButton?.props.disabled).toBe(false);

      await act(async () => {
        confirmButton?.props.onClick();
        await Promise.resolve();
      });

      expect(fetchMock.mock.calls.map(([url, init]) => [String(url), (init as RequestInit | undefined)?.method ?? "GET"])).toEqual([
        ["/api/reports/generations/generation-2/publication?theme=scientific", "GET"],
        ["/api/reports/generations/generation-2/publication", "POST"],
        [expect.stringContaining("/api/reports/generations?page=2"), "GET"],
      ]);
      expect(fetchMock.mock.calls.filter(([url, init]) => (init as RequestInit | undefined)?.method === "POST" && !String(url).endsWith("/publication")).length).toBe(0);
    } finally {
      renderer?.unmount();
      vi.unstubAllGlobals();
    }
  });
});
