import { describe, expect, it } from "vitest";
import {
  createActionWorkflowState,
  invalidateActionWorkflow,
  markActionWorkflowStep,
  setActionWorkflowStepStatus,
} from "./action-workflow";

describe("action workflow contract", () => {
  it("starts on the route and advances one canonical step at a time", () => {
    const state = createActionWorkflowState();
    const next = markActionWorkflowStep(state, "itineraire");
    expect(next.statuses.itineraire).toBe("done");
    expect(next.activeStep).toBe("paris");
    expect(next.statuses.paris).toBe("in_progress");
  });

  it("keeps the active step when the last step is completed", () => {
    const state = createActionWorkflowState("action-1", "preformulaire");
    const next = markActionWorkflowStep(state, "preformulaire");

    expect(next.activeStep).toBe("preformulaire");
    expect(next.statuses.preformulaire).toBe("done");
  });

  it("completes preparation without navigating, then advances only on the explicit next action", () => {
    const state = createActionWorkflowState("action-1", "preparation");
    const validated = setActionWorkflowStepStatus(state, "preparation", "done");

    expect(validated.statuses.preparation).toBe("done");
    expect(validated.activeStep).toBe("preparation");

    const next = markActionWorkflowStep(validated, "preparation");
    expect(next.statuses.preparation).toBe("done");
    expect(next.activeStep).toBe("preformulaire");
    expect(next.statuses.preformulaire).toBe("in_progress");
  });

  it("invalidates only dependent steps", () => {
    const state = createActionWorkflowState("action-1", "preformulaire");
    expect(invalidateActionWorkflow(state, "date_time").statuses).toMatchObject({
      preparation: "review",
      paris: "todo",
      itineraire: "todo",
    });
    expect(invalidateActionWorkflow(state, "text")).toEqual(state);
    expect(invalidateActionWorkflow(state, "location").statuses).toMatchObject({
      paris: "review",
      preparation: "review",
    });
    expect(invalidateActionWorkflow(state, "route").statuses).toMatchObject({
      paris: "review",
      preparation: "review",
    });
    expect(invalidateActionWorkflow(state, "preparation").statuses.preparation).toBe(
      "review",
    );
  });
});
