import { describe, expect, it } from "vitest";
import { createInitialFormState } from "./payload";
import { applyOrganizerFormUpdates } from "./organizer-form-state";

describe("action organizer form identity transitions", () => {
  it("preserves co-organizers and role intentions while clearing an incompatible structure identity", () => {
    const previousForm = createInitialFormState("Créateur", "action");
    previousForm.organizerType = "association";
    previousForm.organizerId = "association-1";
    previousForm.organizerName = "Association locale";
    previousForm.organizerAccounts = "user-primary, user-helper";
    previousForm.fieldRoleSelections = {
      "user-primary": ["group_lead"],
      "user-helper": ["cigarette_bag_lead"],
    };
    const nextForm = { ...previousForm, fieldRoleSelections: { ...previousForm.fieldRoleSelections } };

    applyOrganizerFormUpdates(nextForm, previousForm, { organizerType: "spontaneous" });

    expect(nextForm.organizerId).toBeNull();
    expect(nextForm.organizerName).toBe("");
    expect(nextForm.associationName).toBe("Action spontanée");
    expect(nextForm.organizerAccounts).toBe("user-primary, user-helper");
    expect(nextForm.fieldRoleSelections).toEqual(previousForm.fieldRoleSelections);
  });
});
