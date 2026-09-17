import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getNextActionTabId, JoinActionTabs } from "./rejoindre-une-action.tabs";

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

  it("uses the shared roving-tab keyboard order", () => {
    const tabs = [
      { id: "before", label: "Pré-formulaire" },
      { id: "after", label: "Formulaire" },
    ];

    expect(getNextActionTabId(tabs, "before", "ArrowRight")).toBe("after");
    expect(getNextActionTabId(tabs, "after", "ArrowLeft")).toBe("before");
    expect(getNextActionTabId(tabs, "after", "Home")).toBe("before");
    expect(getNextActionTabId(tabs, "before", "End")).toBe("after");
    expect(getNextActionTabId(tabs, "before", "PageDown")).toBeNull();
  });

  it("supports a second page without a second tab implementation", () => {
    const markup = renderToStaticMarkup(
      <JoinActionTabs
        activeTab="after"
        idPrefix="action-creation-tab"
        tabs={[
          { id: "before", label: "Pré-formulaire", panelId: "action-creation-tabpanel-before" },
          { id: "after", label: "Formulaire", panelId: "action-creation-tabpanel-after" },
        ]}
        buildHref={(tab) => `/actions/new?tab=${tab}&panel=meteo&actionId=action-42`}
      />,
    );

    expect(markup).toContain('id="action-creation-tab-after"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('aria-controls="action-creation-tabpanel-after"');
    expect(markup).toContain("/actions/new?tab=before&amp;panel=meteo&amp;actionId=action-42");
  });
});
