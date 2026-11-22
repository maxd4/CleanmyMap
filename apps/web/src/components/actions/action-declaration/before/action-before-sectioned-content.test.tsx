import React, { type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./essential-action-section", () => ({ EssentialActionSection: () => <div data-testid="essential-fields" /> }));
vi.mock("./terrain-action-section", () => ({ TerrainActionSection: () => <div data-testid="terrain-fields" /> }));
vi.mock("./team-logistics-section", () => ({ TeamLogisticsSection: () => <div data-testid="team-fields" /> }));
vi.mock("./action-before-verification-section", () => ({ ActionBeforeVerificationSection: () => <div data-testid="verification-fields" /> }));

import { ActionBeforeSectionedContent } from "./action-before-sectioned-content";

const sharedProps = {
  form: {} as ComponentProps<typeof ActionBeforeSectionedContent>["form"],
  updateField: vi.fn(),
  updateFields: vi.fn(),
  userMetadata: { userId: "user-1" },
  showGroupJoinHelp: false,
  onToggleGroupJoinHelp: vi.fn(),
  invitationStatuses: [],
  validationIssues: [],
  validationIssueFields: [],
  submissionState: "idle" as const,
  errorMessage: null,
  guidedReadiness: "unknown" as const,
  isAuthenticated: false,
};

describe("action before two stage contents", () => {
  it("keeps the essential form isolated in Define the action", () => {
    const markup = renderToStaticMarkup(React.createElement(ActionBeforeSectionedContent, {
      ...sharedProps,
      activeSection: "definir",
    }));

    expect(markup).toContain('data-testid="essential-fields"');
    expect(markup).not.toContain('data-testid="terrain-fields"');
    expect(markup).not.toContain('data-testid="team-fields"');
    expect(markup).not.toContain('data-testid="verification-fields"');
  });

  it("renders terrain, team logistics and verification together in Prepare and publish", () => {
    const markup = renderToStaticMarkup(React.createElement(ActionBeforeSectionedContent, {
      ...sharedProps,
      activeSection: "preparer",
    }));

    expect(markup).toContain('data-testid="terrain-fields"');
    expect(markup).toContain('data-testid="team-fields"');
    expect(markup).toContain('data-testid="verification-fields"');
    expect(markup).not.toContain('data-testid="essential-fields"');
    expect(markup.indexOf('data-testid="terrain-fields"')).toBeLessThan(markup.indexOf('data-testid="team-fields"'));
    expect(markup.indexOf('data-testid="team-fields"')).toBeLessThan(markup.indexOf('data-testid="verification-fields"'));
  });
});
