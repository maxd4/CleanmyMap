import { describe, expect, it } from "vitest";
import {
  buildActionCreationTabHref,
  buildActionCreationPanelHref,
  normalizeActionCreationTab,
  normalizeActionCreationPanel,
  buildActionWorkflowStepHref,
  normalizeActionWorkflowStep,
} from "@/lib/actions/action-creation-routes";

describe("action creation panel routes", () => {
  it("keeps the four legacy panel aliases", () => {
    expect(normalizeActionCreationPanel("itineraire")).toBe("itineraire");
    expect(normalizeActionCreationPanel("meteo")).toBe("meteo");
    expect(normalizeActionCreationPanel("formalites")).toBe("formalites");
    expect(normalizeActionCreationPanel("unexpected")).toBe("pre-formulaire");
  });

  it("routes the four guided steps without dropping action context", () => {
    expect(normalizeActionWorkflowStep("preparation")).toBe("preparation");
    expect(normalizeActionWorkflowStep("unknown")).toBe("itineraire");
    expect(buildActionWorkflowStepHref("paris", { actionId: "action-42", from: "planner" })).toBe(
      "/actions/new?step=paris&actionId=action-42&from=planner",
    );
  });

  it("preserves useful legacy query parameters while selecting a panel", () => {
    expect(
      buildActionCreationPanelHref("meteo", {
        source: "guide",
        actionId: "action-42",
        tab: "after",
        panel: "itineraire",
        tag: ["terrain", "safety"],
      }),
    ).toBe(
      "/actions/new?panel=meteo&source=guide&actionId=action-42&tab=after&tag=terrain&tag=safety",
    );
  });

  it("defaults to the before tab and keeps deep-link context when selecting it", () => {
    expect(normalizeActionCreationTab(undefined)).toBe("before");
    expect(normalizeActionCreationTab(undefined, { actionId: "action-42" })).toBe("after");
    expect(
      normalizeActionCreationTab(undefined, {
        actionId: "action-42",
        panel: "formalites",
      }),
    ).toBe("before");
    expect(
      normalizeActionCreationTab(undefined, {
        actionId: "pre-action-42",
        actionPhase: "pre_action",
      }),
    ).toBe("before");
    expect(
      normalizeActionCreationTab(undefined, {
        actionId: "draft-42",
        actionPhase: "post_action_draft",
      }),
    ).toBe("after");
    expect(normalizeActionCreationTab("before", { actionId: "action-42" })).toBe("before");
    expect(
      normalizeActionCreationTab(undefined, {
        from: "before",
        actionPhase: "post_action_draft",
      }),
    ).toBe("after");
    expect(
      buildActionCreationTabHref("after", {
        tab: "before",
        panel: "meteo",
        actionId: "action-42",
        from: "planner",
        tag: ["terrain", "safety"],
      }),
    ).toBe(
      "/actions/new?tab=after&panel=meteo&actionId=action-42&from=planner&tag=terrain&tag=safety",
    );
  });
});
