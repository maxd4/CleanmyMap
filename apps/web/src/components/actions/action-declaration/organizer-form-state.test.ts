import { describe, expect, it } from "vitest";
import { createInitialFormState } from "./payload";
import { applyOrganizerFormUpdates } from "./organizer-form-state";
import { SPONTANEOUS_PENDING_ORGANIZER_LABEL } from "@/lib/actions/organizer-type";

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
    expect(nextForm.organizerName).toBe(SPONTANEOUS_PENDING_ORGANIZER_LABEL);
    expect(nextForm.associationName).toBe("Action spontanée");
    expect(nextForm.organizerAccounts).toBe("user-primary, user-helper");
    expect(nextForm.fieldRoleSelections).toEqual(previousForm.fieldRoleSelections);
  });

  it("restores each organizer selection after visiting another path without putting hidden drafts in the action payload", () => {
    const form = createInitialFormState("Créateur", "action");
    const first = { ...form };
    first.organizerType = "association";
    first.organizerId = "association-1";
    first.organizerName = "Association locale";
    first.associationName = "Association locale";
    const company = { ...first };
    applyOrganizerFormUpdates(company, first, { organizerType: "company" });

    expect(company.organizerName).toBe("");
    expect(company.organizerTypeDrafts.association).toEqual({ organizerId: "association-1", organizerName: "Association locale", associationName: "Association locale" });
    const companyWithName = { ...company };
    applyOrganizerFormUpdates(companyWithName, company, { organizerName: "Entreprise locale" });
    const backToAssociation = { ...companyWithName };
    applyOrganizerFormUpdates(backToAssociation, companyWithName, { organizerType: "association" });

    expect(backToAssociation.organizerName).toBe("Association locale");
    expect(backToAssociation.organizerId).toBe("association-1");
    expect(backToAssociation.organizerName).not.toBe("Entreprise locale");
  });
});
