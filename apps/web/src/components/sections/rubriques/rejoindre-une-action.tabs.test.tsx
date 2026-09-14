import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JoinActionTabs } from "./rejoindre-une-action.tabs";

describe("JoinActionTabs", () => {
  it("exposes URL-driven accessible tab semantics and preserves the target", () => {
    const markup = renderToStaticMarkup(
      <JoinActionTabs activeTab="past" focusActionId="a-target" fr />,
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('id="join-action-tab-future"');
    expect(markup).toContain('id="join-action-tab-past"');
    expect(markup).toContain('role="tab"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('aria-selected="false"');
    expect(markup).toContain('aria-controls="join-action-panel-future"');
    expect(markup).toContain('aria-controls="join-action-panel-past"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('tabindex="-1"');
    expect(markup).toContain("/sections/rejoindre-une-action?tab=past&amp;actionId=a-target");
  });
});
