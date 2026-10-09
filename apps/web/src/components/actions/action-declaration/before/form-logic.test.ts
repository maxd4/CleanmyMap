import { describe, expect, it } from "vitest";
import { createInitialFormState } from "../payload";
import { buildBeforeActionPayload, validateBeforeActionForm } from "./form-logic";

function buildValidPreActionForm() {
  return {
    ...createInitialFormState("legacy-alias", "action"),
    actionTitle: "Nettoyage du canal",
    actionDate: "2026-10-09",
    associationName: "Association locale",
    organizerType: "association" as const,
    departureLocationLabel: "Quai nord",
  };
}

describe("pre-action volunteer forecast", () => {
  it("keeps an empty forecast empty while preserving the SQL compatibility count", () => {
    const form = buildValidPreActionForm();
    form.volunteersCount = "";
    form.childrenCount = "";
    form.adultCount = "";
    form.retiredCount = "";

    expect(validateBeforeActionForm(form)).toEqual([]);
    const payload = buildBeforeActionPayload({
      form,
      userMetadata: { userId: "user-creator", displayName: "Maxence" },
    });

    expect(payload.volunteersCount).toBe(1);
    expect(payload.preparationData?.volunteersExpected).toBeUndefined();
  });

  it("persists an explicit total without manufacturing category values", () => {
    const form = buildValidPreActionForm();
    form.volunteersCount = "12";
    form.childrenCount = "";
    form.adultCount = "";
    form.retiredCount = "";

    expect(validateBeforeActionForm(form)).toEqual([]);
    const payload = buildBeforeActionPayload({
      form,
      userMetadata: { userId: "user-creator", displayName: "Maxence" },
    });

    expect(payload.volunteersCount).toBe(12);
    expect(payload.preparationData?.volunteersExpected).toBe(12);
    expect(payload.preparationData?.volunteerParticipation).toEqual({
      childrenCount: null,
      adultCount: null,
      retiredCount: null,
    });
  });

  it("rejects partial and incoherent category splits", () => {
    const form = buildValidPreActionForm();
    form.volunteersCount = "12";
    form.childrenCount = "2";
    form.adultCount = "4";
    form.retiredCount = "";

    expect(validateBeforeActionForm(form).map((issue) => issue.message)).toContain(
      "La répartition facultative doit renseigner Enfants, Adultes et Retraités, ou rester entièrement vide.",
    );

    form.retiredCount = "2";
    expect(validateBeforeActionForm(form).map((issue) => issue.message)).toContain(
      "La somme de la répartition (8) doit correspondre au nombre total attendu (12).",
    );
  });
});

describe("pre-action identity payload", () => {
  it("sends the authenticated creator label and distinct organizer/participant ids", () => {
    const form = createInitialFormState("legacy-alias", "action");
    form.associationName = "Association locale";
    form.organizerType = "association";
    form.organizerAccounts = "user-organizer, user-organizer";
    form.participantAccounts = ["user-participant", "user-participant"];

    const payload = buildBeforeActionPayload({
      form,
      userMetadata: {
        userId: "user-creator",
        displayName: "Maxence",
        handle: "maxence_deroome",
      },
    });

    expect(payload.actorName).toBe("Maxence");
    expect(payload.organizerAccounts).toEqual(["user-organizer"]);
    expect(payload.participantAccounts).toEqual(["user-participant"]);
  });
});
