import { describe, expect, it } from "vitest";
import { OTHER_VOLUNTEER_ASSOCIATION_VALUE, createInitialFormState } from "../payload";
import {
  getStepOneValidationIssues,
  normalizeActionDeclarationFormBeforeSubmit,
} from "./action-declaration-submission.model";

describe("action declaration submission model", () => {
  it("keeps the canonical normalized route and spontaneous-action rules", () => {
    const form = {
      ...createInitialFormState("Alex", "action"),
      associationName: OTHER_VOLUNTEER_ASSOCIATION_VALUE,
      organizerAccounts: "@collectif",
      locationLabel: "",
      departureLocationLabel: "Quai nord",
      arrivalLocationLabel: "Arrivée ignorée pour une boucle",
      routeTopology: "loop" as const,
    };

    const result = normalizeActionDeclarationFormBeforeSubmit(form);

    expect(result.associationName).toBe("Action spontanée");
    expect(result.organizerAccounts).toBe("@collectif");
    expect(result.locationLabel).toBe("Quai nord");
    expect(result.arrivalLocationLabel).toBe("");
    expect(result.routeStyle).toBe("souple");
  });

  it("reports each missing step-one guard without changing the form", () => {
    const form = {
      ...createInitialFormState("Alex", "action"),
      organizerType: "" as const,
      associationName: "",
      actionDate: "",
      routeTopology: "point_to_point" as const,
      arrivalLocationLabel: "",
      eventStartTime: "10:00",
      eventEndTime: "09:00",
    };

    const issues = getStepOneValidationIssues(form);

    expect(issues.map((issue) => issue.field)).toEqual([
      "organizerType",
      "associationName",
      "actionDate",
      "arrivalLocationLabel",
      "eventStartTime",
    ]);
  });
});
