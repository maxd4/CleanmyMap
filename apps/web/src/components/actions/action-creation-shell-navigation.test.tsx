import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorkflowStepper } from "./action-creation-shell-navigation";
import { createActionWorkflowState, markActionWorkflowStep } from "@/lib/actions/action-workflow";

describe("WorkflowStepper", () => {
  it("announces the stable progress and preserves the persisted done/current statuses", () => {
    const state = markActionWorkflowStep(createActionWorkflowState("action-42"), "itineraire");
    const markup = renderToStaticMarkup(<WorkflowStepper state={state} onSelect={vi.fn()} />);

    expect(markup).toContain("Étape 2 sur 4");
    expect(markup).toContain("Itinéraire");
    expect(markup).toContain("Terminé");
    expect(markup).toContain('aria-current="step"');
  });
});
