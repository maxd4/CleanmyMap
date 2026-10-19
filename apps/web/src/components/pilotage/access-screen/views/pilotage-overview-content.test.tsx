import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import type { PilotageOverviewCopy } from "./pilotage-overview-sections";

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: ({ children, href }: { children: React.ReactNode; href?: string }) =>
    React.createElement("a", { href }, children),
}));

vi.mock("./pilotage-overview-sections", () => ({
  PilotageOverviewMetrics: () => React.createElement("div", null, "metrics"),
  PilotageOverviewPriorities: () => React.createElement("div", null, "priorities"),
  PilotageOverviewSummary: () => React.createElement("div", null, "summary"),
}));

vi.mock("./pilotage-overview-support-sections", () => ({
  PilotageOverviewSupportSections: () => React.createElement("div", null, "support"),
}));

vi.mock("./pilotage-overview-surface-tabs", () => ({
  PilotageOverviewSurfaceTabs: () => React.createElement("div", null, "tabs"),
}));

vi.mock("@/components/pilotage/community-operations-panel", () => ({
  PilotageCommunityOperationsPanel: () => React.createElement("div", null, "operations-panel"),
}));

vi.mock("@/lib/reports/data-availability", () => ({
  buildReportDataAvailabilityNotices: () => [],
}));

import { PilotageOverviewContent } from "./pilotage-overview-content";

const copy = {
  scopeNotice: "scope",
  emptyScopeTitle: "empty",
  emptyScopeDescription: "empty description",
  summaryEyebrow: "summary",
  windowsEyebrow: "windows",
  methodsEyebrow: "methods",
  prioritiesEyebrow: "priorities",
  accessEyebrow: "access",
} as PilotageOverviewCopy;

const overview = {
  contracts: [],
  zones: [],
  priorities: [],
  dataAvailability: {},
} as unknown as PilotageOverview;

function renderOperations(
  state: "NOT_REQUESTED" | "AVAILABLE" | "PARTIAL" | "UNAVAILABLE",
  communityOperations: unknown = null,
) {
  return renderToStaticMarkup(
    <PilotageOverviewContent
      locale="fr"
      copy={copy}
      overview={overview}
      overviewLinks={[]}
      accessAllowed
      lastUpdatedAt={null}
      communityOperations={communityOperations as never}
      communityOperationsState={state}
      communityOperationsRetryHref="/pilotage?operations=1&retry=2"
      canExportCommunityFunnel={false}
    />,
  );
}

describe("Pilotage overview community operations states", () => {
  it("renders the explicit unavailable state with a real retry and close navigation", () => {
    const markup = renderOperations("UNAVAILABLE");

    expect(markup).toContain("Opérations détaillées indisponibles");
    expect(markup).toContain('href="/pilotage?operations=1&amp;retry=2"');
    expect(markup).toContain('href="/pilotage"');
    expect(markup).not.toContain("operations-panel");
  });

  it("keeps the initial disclosure lightweight and renders a successful result", () => {
    const initialMarkup = renderOperations("NOT_REQUESTED");
    expect(initialMarkup).toContain("Explorer les opérations détaillées");
    expect(initialMarkup).toContain('href="/pilotage?operations=1"');

    const availableMarkup = renderOperations("AVAILABLE", {
      staffingPlan: {},
      reminders: [],
      postEventLoop: {},
    });
    expect(availableMarkup).toContain("Masquer les opérations détaillées");
    expect(availableMarkup).toContain("operations-panel");
  });

  it("renders partial coverage without presenting exhaustive operations", () => {
    const markup = renderOperations("PARTIAL", {
      availability: "partial",
      staffingPlan: {},
      reminders: [],
      postEventLoop: {},
    });

    expect(markup).toContain("Opérations détaillées partiellement couvertes");
    expect(markup).toContain("Les indicateurs détaillés ne sont pas des totaux exhaustifs");
    expect(markup).toContain("operations-panel");
  });
});
