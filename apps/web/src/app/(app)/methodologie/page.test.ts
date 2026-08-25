import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EnvironmentalImpactSnapshotRecord } from "@/lib/environmental-impact-estimator/types";

const snapshotOnlyMock = vi.hoisted(() => vi.fn());
const liveDashboardMock = vi.hoisted(() => vi.fn());
const githubStatsMock = vi.hoisted(() => vi.fn());
const clientCalls = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock("@/lib/environmental-impact-estimator/dashboard-capture", () => ({
  loadEnvironmentalImpactDashboardSnapshotOnly: snapshotOnlyMock,
  loadEnvironmentalImpactDashboard: liveDashboardMock,
}));

vi.mock("@/lib/github/github-repository-stats", () => ({
  loadGitHubRepositoryStats: githubStatsMock,
}));

vi.mock("@/components/sections/rubriques/methodologie-page-client", () => ({
  MethodologiePageClient: (props: Record<string, unknown>) => {
    clientCalls.push(props);
    return React.createElement("div", { "data-testid": "methodologie-client" });
  },
}));

import MethodologiePage from "./page";

const emptyImpactTotals = {
  monthlyKgCo2eProxy: null,
  annualKgCo2eProxy: null,
  totalKgCo2eProxy: null,
  generatedAt: null,
};

describe("/methodologie public page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientCalls.length = 0;
  });

  it("renders a partial state when no snapshot is available", async () => {
    snapshotOnlyMock.mockResolvedValueOnce(null);
    const githubStats = { repository: "maxd4/CleanmyMap" };
    githubStatsMock.mockResolvedValueOnce(githubStats);

    const page = await MethodologiePage();
    const markup = renderToStaticMarkup(page);
    const props = clientCalls[0];

    expect(markup).toContain("data-testid=\"methodologie-client\"");
    expect(snapshotOnlyMock).toHaveBeenCalledWith({ historyLimit: 24 });
    expect(props.impactTotals).toEqual(emptyImpactTotals);
    expect(props.impactSnapshots).toEqual([]);
    expect(props.githubStats).toBe(githubStats);
    expect(props.impactElectricity).toMatchObject({
      factorKgCo2ePerKwh: 0.35,
      calculation: "missing",
    });
    expect(liveDashboardMock).not.toHaveBeenCalled();
  });

  it("maps the latest public snapshot into the existing page props", async () => {
    const snapshot = {
      version: "snapshot-version",
      model: {
        generatedAt: "2026-06-26T08:00:00.000Z",
        infrastructure: {
          services: [{ name: "Vercel", monthlyKgCo2eProxy: 1.2 }],
          monthlyKgCo2eProxy: 1.2,
          annualKgCo2eProxy: 14.4,
          totalKgCo2eProxy: 2.4,
          generatedAt: "2026-06-26T08:00:00.000Z",
          launchedAt: "2026-01-01T00:00:00.000Z",
        },
      },
      signals: {
        generatedAt: "2026-06-26T08:00:00.000Z",
        launchedAt: "2026-01-01T00:00:00.000Z",
      },
    } as unknown as EnvironmentalImpactSnapshotRecord;
    const dashboard = {
      status: "ok" as const,
      model: snapshot.model,
      signals: snapshot.signals,
      snapshots: [snapshot],
      version: snapshot.version,
    };
    snapshotOnlyMock.mockResolvedValueOnce(dashboard);
    githubStatsMock.mockResolvedValueOnce(null);

    const page = await MethodologiePage();
    renderToStaticMarkup(page);
    const props = clientCalls[0];

    expect(props.freePlanServices).toEqual(snapshot.model.infrastructure.services);
    expect(props.impactTotals).toEqual({
      monthlyKgCo2eProxy: 1.2,
      annualKgCo2eProxy: 14.4,
      totalKgCo2eProxy: 2.4,
      generatedAt: "2026-06-26T08:00:00.000Z",
    });
    expect(props.impactSnapshots).toEqual([snapshot]);
    expect(props.impactGeneratedAt).toBe("2026-06-26T08:00:00.000Z");
    expect(props.impactLaunchedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(props.impactElectricity).toMatchObject({
      factorKgCo2ePerKwh: 0.35,
      calculation: "missing",
    });
    expect(liveDashboardMock).not.toHaveBeenCalled();
  });

  it("keeps the page renderable when impact snapshots are unavailable", async () => {
    snapshotOnlyMock.mockRejectedValueOnce(new Error("snapshot store unavailable"));
    const githubStats = { repository: "maxd4/CleanmyMap" };
    githubStatsMock.mockResolvedValueOnce(githubStats);

    const page = await MethodologiePage();
    renderToStaticMarkup(page);

    expect(clientCalls[0].impactTotals).toEqual(emptyImpactTotals);
    expect(clientCalls[0].githubStats).toBe(githubStats);
    expect(liveDashboardMock).not.toHaveBeenCalled();
  });
});
