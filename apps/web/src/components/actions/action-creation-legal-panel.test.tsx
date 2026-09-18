import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActionCreationLegalPanel } from "./action-creation-legal-panel";

vi.mock("./action-formalities-workflow-panel", () => ({
  ActionFormalitiesWorkflowPanel: ({ actionId }: { actionId?: string | null }) => (
    <div data-testid="qualification-panel">qualification:{actionId}</div>
  ),
}));

vi.mock("./administrative-requirements-status", () => ({
  AdministrativeRequirementsStatus: ({ actionId }: { actionId?: string | null }) => (
    <div data-testid="administrative-status">workflow:{actionId}</div>
  ),
}));

describe("ActionCreationLegalPanel", () => {
  it("keeps qualification and administrative validation as separate panel states", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ActionCreationLegalPanel, { actionId: "action-42" }),
    );

    expect(markup).toContain('data-testid="qualification-panel"');
    expect(markup).toContain("qualification:action-42");
    expect(markup).toContain('data-testid="administrative-status"');
    expect(markup).toContain("workflow:action-42");
  });
});
