// @vitest-environment jsdom
import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

const { workflowState } = vi.hoisted(() => ({
  workflowState: {
    importState: "idle" as "idle" | "pending" | "success" | "error",
    moderationState: "idle" as "idle" | "pending" | "success" | "error",
    csvExportUrl: "/api/admin/actions/export?format=csv",
    jsonExportUrl: "/api/admin/actions/export?format=json",
    lastSuccessMessage: null as string | null,
    errorMessage: null as string | null,
  },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
    [key: string]: unknown;
  }) => React.createElement("a", { href, onClick, ...rest }, children),
}));

vi.mock("@/components/reports/admin-workflow/use-admin-workflow", () => ({
  useAdminWorkflow: () => workflowState,
}));
vi.mock("@/components/reports/admin-workflow/step-filter", () => ({
  StepFilter: () => null,
}));
vi.mock("@/components/reports/admin-workflow/step-preview", () => ({
  StepPreview: () => null,
}));
vi.mock("@/components/reports/admin-workflow/step-confirm", () => ({
  StepConfirm: () => null,
}));
vi.mock("@/components/reports/admin-workflow/step-journal", () => ({
  StepJournal: () => null,
}));
vi.mock("@/components/admin/admin-panel-shell", () => ({
  AdminPanelShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement("section", null, children),
}));

import { AdminCockpitTabs } from "./admin-cockpit-tabs";
import { ActionsReportPanel } from "@/components/reports/actions-report-panel";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("AdminCockpitTabs mutation guard", () => {
  afterEach(() => {
    workflowState.importState = "idle";
    workflowState.moderationState = "idle";
    document.body.innerHTML = "";
  });

  it("exposes pending mutation state from ActionsReportPanel and blocks tab switching while pending", () => {
    workflowState.moderationState = "pending";
    let panelRenderer: ReactTestRenderer | undefined;
    let tabsRenderer: ReactTestRenderer | undefined;

    try {
      act(() => {
        panelRenderer = create(<ActionsReportPanel />);
      });

      const panelNode = panelRenderer!.root.findByProps({
        "data-admin-pending-mutation": "true",
      });
      expect(panelNode).toBeDefined();

      // Mirror DOM attribute for document.querySelector in AdminCockpitTabs
      const marker = document.createElement("div");
      marker.setAttribute("data-admin-pending-mutation", "true");
      document.body.appendChild(marker);

      act(() => {
        tabsRenderer = create(
          <AdminCockpitTabs activeTab="moderation" isMax={false} locale="fr" />,
        );
      });

      const summaryLink = tabsRenderer!.root
        .findAllByType("a")
        .find((node) => node.props.href === "/admin");
      expect(summaryLink).toBeDefined();

      const preventDefault = vi.fn();
      act(() => {
        summaryLink!.props.onClick({ preventDefault });
      });

      expect(preventDefault).toHaveBeenCalledTimes(1);
      const alert = tabsRenderer!.root.findByProps({ role: "alert" });
      expect(alert.children.join("")).toContain("mutation de modération ou d’import est en cours");

      // Clear pending mutation and verify navigation is allowed
      marker.setAttribute("data-admin-pending-mutation", "false");
      const preventDefaultAfter = vi.fn();
      act(() => {
        summaryLink!.props.onClick({ preventDefault: preventDefaultAfter });
      });
      expect(preventDefaultAfter).not.toHaveBeenCalled();
    } finally {
      panelRenderer?.unmount();
      tabsRenderer?.unmount();
    }
  });
});
