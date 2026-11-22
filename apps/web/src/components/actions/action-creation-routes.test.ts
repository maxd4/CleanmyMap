import { describe, expect, it } from "vitest";
import {
  buildActionCreationTabHref,
  buildActionCreationPanelHref,
  normalizeActionCreationTab,
  normalizeActionCreationPanel,
  buildActionWorkflowStepHref,
  normalizeActionWorkflowStep,
  buildActionCreationSectionHref,
  buildActionCreationSpaceHref,
  normalizeActionCreationSpace,
  normalizeActionCreationSection,
  normalizeActionCreationSubsection,
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

  it("maps historical section, step, panel and subsection links to the two stages", () => {
    expect(normalizeActionCreationSection("definir")).toBe("definir");
    expect(normalizeActionCreationSection("essentiel")).toBe("definir");
    expect(normalizeActionCreationSection("terrain")).toBe("preparer");
    expect(normalizeActionCreationSection("equipe")).toBe("preparer");
    expect(normalizeActionCreationSection("verification")).toBe("preparer");
    expect(normalizeActionCreationSection(undefined, { step: "itineraire" })).toBe("preparer");
    expect(normalizeActionCreationSection(undefined, { step: "preparation" })).toBe("preparer");
    expect(normalizeActionCreationSection(undefined, { step: "paris" })).toBe("preparer");
    expect(normalizeActionCreationSection(undefined, { step: "preformulaire" })).toBe("definir");
    expect(normalizeActionCreationSection(undefined, { panel: "formalites" })).toBe("preparer");
    expect(normalizeActionCreationSection(undefined, { panel: "pre-formulaire" })).toBe("definir");
    expect(normalizeActionCreationSection(undefined, { subsection: "formalites" })).toBe("preparer");
    expect(normalizeActionCreationSection(undefined, { subsection: "pre-formulaire" })).toBe("definir");
    expect(normalizeActionCreationSection(undefined)).toBe("definir");
    expect(normalizeActionCreationSubsection(undefined, { step: "itineraire" })).toBe("route");
    expect(normalizeActionCreationSubsection(undefined, { step: "preparation" })).toBe("meteo");
    expect(normalizeActionCreationSubsection(undefined, { step: "paris" })).toBe("formalites");
  });

  it("builds a section deep-link without losing the action identity or source context", () => {
    expect(
      buildActionCreationSectionHref("preparer", {
        actionId: "action-42",
        from: "planner",
        fromEventId: "event-7",
        tag: ["review", "publish"],
      }),
    ).toBe(
      "/actions/new?section=preparer&actionId=action-42&from=planner&fromEventId=event-7&tag=review&tag=publish",
    );
  });

  it("canonicalizes old stage query parameters when building the next link", () => {
    expect(buildActionCreationSectionHref("preparer", { step: "paris", panel: "formalites", subsection: "formalites", actionId: "action-42" })).toBe(
      "/actions/new?section=preparer&actionId=action-42",
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

  it("maps legacy tabs to contextual spaces without changing the persisted action identity", () => {
    expect(normalizeActionCreationSpace(undefined, { tab: "before", actionId: "action-42" })).toBe("prepare");
    expect(normalizeActionCreationSpace(undefined, { tab: "after", actionId: "action-42" })).toBe("bilan");
    expect(normalizeActionCreationSpace("day", { tab: "before", actionId: "action-42" })).toBe("day");
    expect(buildActionCreationSpaceHref("day", { actionId: "action-42", section: "terrain", tab: "before" })).toBe(
      "/actions/new?space=day&actionId=action-42&section=terrain&tab=before",
    );
  });
});
