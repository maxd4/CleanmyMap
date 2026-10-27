import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorkflowStepper } from "./action-creation-shell-navigation";
import { createActionWorkflowState, markActionWorkflowStep } from "@/lib/actions/action-workflow";

describe("WorkflowStepper", () => {
  it("announces progress, label, and status for all four French steps", () => {
    const state = markActionWorkflowStep(createActionWorkflowState("action-42"), "itineraire");
    const markup = renderToStaticMarkup(<WorkflowStepper state={state} onSelect={vi.fn()} />);

    expect(markup).toContain('aria-label="Étape 1 sur 4 — Itinéraire — Terminé"');
    expect(markup).toContain('aria-label="Étape 2 sur 4 — Formalités locales — En cours"');
    expect(markup).toContain('aria-label="Étape 3 sur 4 — Préparation — À faire"');
    expect(markup).toContain('aria-label="Étape 4 sur 4 — Préformulaire — À faire"');
    expect(markup).toContain("Étape 2 sur 4");
    expect(markup).toContain('aria-current="step"');
  });

  it("announces the same complete contract in English", () => {
    const state = markActionWorkflowStep(createActionWorkflowState("action-42"), "itineraire");
    const markup = renderToStaticMarkup(<WorkflowStepper state={state} onSelect={vi.fn()} fr={false} />);

    expect(markup).toContain('aria-label="Step 1 of 4 — Route — Done"');
    expect(markup).toContain('aria-label="Step 2 of 4 — Local formalities — In progress"');
    expect(markup).toContain('aria-label="Step 3 of 4 — Preparation — To do"');
    expect(markup).toContain('aria-label="Step 4 of 4 — Pre-form — To do"');
  });
});
