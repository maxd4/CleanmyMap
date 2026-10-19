import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useSWR: vi.fn(),
}));

vi.mock("swr", () => ({
  default: mocks.useSWR,
}));

vi.mock("next/dynamic", () => ({
  default: () => function DeferredStorageUsagePanelMock() {
    return React.createElement("div", { "data-storage-panel-mounted": "true" });
  },
}));

vi.mock("@/components/admin/admin-panel-shell", () => ({
  AdminPanelShell: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => React.createElement("section", { "data-title": title }, children),
}));

vi.mock("@/components/dashboard/storage-business-contribution-panel", () => ({
  StorageBusinessContributionPanel: () => React.createElement("div"),
}));

import { StorageUsagePanel } from "./storage-usage-panel";
import { DeferredStorageUsagePanel } from "./deferred-storage-usage-panel";

const current = {
  generatedAt: "2026-08-23T00:00:00.000Z",
  snapshotMonth: "2026-08",
  quotaBytes: 1024 * 1024 * 1024,
  quotaLabel: "1 GB",
  totalBytes: 512,
  totalLabel: "512 B",
  remainingBytes: 512,
  remainingLabel: "512 B",
  usagePercent: 50,
  objectCount: 2,
  bucketCount: 1,
  bucketBreakdown: [],
  extensionBreakdown: [],
  businessBreakdown: [],
  largestFiles: [],
  source: "default_free" as const,
  warnings: [],
};

describe("StorageUsagePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the loading state", () => {
    mocks.useSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: true,
      mutate: vi.fn(),
    });

    const markup = renderToStaticMarkup(React.createElement(StorageUsagePanel));

    expect(markup).toContain('data-title="Stockage Supabase"');
    expect(markup).toContain('data-skeleton-variant="card"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).not.toContain("animate-pulse");
    expect(markup).not.toContain("Impossible de charger le suivi");
  });

  it("keeps the error state", () => {
    mocks.useSWR.mockReturnValue({
      data: undefined,
      error: new Error("unavailable"),
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    });

    const markup = renderToStaticMarkup(React.createElement(StorageUsagePanel));

    expect(markup).toContain('data-feedback-tone="error"');
    expect(markup).toContain("Impossible de charger le suivi du stockage Supabase");
    expect(markup).toContain("Réessayer");
    expect(markup).not.toContain("Aucun historique disponible");
  });

  it("keeps displayed data and empty history/comparison states", () => {
    mocks.useSWR.mockReturnValue({
      data: {
        status: "ok",
        current,
        history: [],
        warnings: [],
        cron: null,
      },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    });

    const markup = renderToStaticMarkup(React.createElement(StorageUsagePanel));

    expect(markup).toContain("Stockage utilisé");
    expect(markup).toContain("512 B");
    expect(markup).toContain("Aucun historique disponible pour le moment.");
    expect(markup).toContain("Aucune comparaison mensuelle encore disponible.");
  });

  it("does not mount the panel before explicit consultation", () => {
    const markup = renderToStaticMarkup(
      React.createElement(DeferredStorageUsagePanel),
    );

    expect(markup).toContain("Stockage Supabase");
    expect(markup).toContain("Consulter l&#x27;utilisation du stockage");
    expect(markup).not.toContain('aria-busy="true"');
    expect(markup).not.toContain("Stockage utilisé");
  });

  it("mounts the deferred panel only after the consultation button is clicked", () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(React.createElement(DeferredStorageUsagePanel));
    });

    expect(renderer!.root.findAllByProps({ "data-storage-panel-mounted": "true" })).toHaveLength(0);
    const consultationButton = renderer!.root
      .findAllByType("button")
      .find((button) => button.children.join("").includes("Consulter"));
    expect(consultationButton).toBeDefined();

    act(() => {
      consultationButton!.props.onClick();
    });

    expect(renderer!.root.findAllByProps({ "data-storage-panel-mounted": "true" })).toHaveLength(1);
  });
});
