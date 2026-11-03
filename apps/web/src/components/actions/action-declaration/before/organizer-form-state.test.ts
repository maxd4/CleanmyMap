import { describe, expect, it } from "vitest";
import { buildBeforeActionInitialForm } from "./before-action-form-conversions";
import { applyOrganizerFormUpdates } from "./organizer-form-state";
import { SPONTANEOUS_PENDING_ORGANIZER_LABEL } from "@/lib/actions/organizer-type";

describe("before-action organizer form identity transitions", () => {
  it("preserves co-organizers and field-role intentions when the structure type changes", () => {
    const previousForm = buildBeforeActionInitialForm(["Créateur"], "Créateur", "action");
    previousForm.organizerType = "association";
    previousForm.organizerId = "association-1";
    previousForm.organizerName = "Association locale";
    previousForm.organizerAccounts = "user-primary, user-helper";
    previousForm.fieldRoleSelections = {
      "user-primary": ["group_lead"],
      "user-helper": ["recyclable_bag_lead"],
    };
    const nextForm = { ...previousForm, fieldRoleSelections: { ...previousForm.fieldRoleSelections } };

    applyOrganizerFormUpdates(nextForm, previousForm, { organizerType: "other" });

    expect(nextForm.organizerId).toBeNull();
    expect(nextForm.organizerName).toBe("");
    expect(nextForm.associationName).toBe("");
    expect(nextForm.organizerAccounts).toBe("user-primary, user-helper");
    expect(nextForm.fieldRoleSelections).toEqual(previousForm.fieldRoleSelections);
  });

  it("uses the explicit pending label while preserving accounts when switching to spontaneous", () => {
    const previousForm = buildBeforeActionInitialForm(["Créateur"], "Créateur", "action");
    previousForm.organizerType = "association";
    previousForm.organizerName = "Association locale";
    previousForm.organizerAccounts = "user-primary, user-helper";
    const nextForm = { ...previousForm };

    applyOrganizerFormUpdates(nextForm, previousForm, { organizerType: "spontaneous" });

    expect(nextForm.organizerName).toBe(SPONTANEOUS_PENDING_ORGANIZER_LABEL);
    expect(nextForm.organizerAccounts).toBe("user-primary, user-helper");
  });
});
