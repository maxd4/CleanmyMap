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

describe("pre-action route topology", () => {
  it("requires an explicit arrival for point-to-point actions", () => {
    const form = buildValidPreActionForm();
    form.routeTopology = "point_to_point";
    form.arrivalLocationLabel = "";

    expect(validateBeforeActionForm(form).map((issue) => issue.message)).toContain(
      "Indiquez l'arrivée pour un parcours départ → arrivée.",
    );

    form.arrivalLocationLabel = "Place de la République, Paris";
    expect(validateBeforeActionForm(form)).toEqual([]);
  });

  it("keeps a loop independent from a stale arrival label in its payload", () => {
    const form = buildValidPreActionForm();
    form.routeTopology = "loop";
    form.arrivalLocationLabel = "Ancienne arrivée";

    const payload = buildBeforeActionPayload({
      form,
      userMetadata: { userId: "user-creator", displayName: "Maxence" },
    });

    expect(payload.routeTopology).toBe("loop");
    expect(payload.arrivalLocationLabel).toBeUndefined();
    expect(payload.preparationData?.zoneCiblePrevue).toBeUndefined();
  });
});

describe("pre-action temporal validation", () => {
  it("keeps a new action date and duration empty until explicitly entered", () => {
    const form = createInitialFormState("Maxence", "action");

    expect(form.actionDate).toBe("");
    expect(form.durationMinutes).toBe("");
    expect(validateBeforeActionForm(buildValidPreActionForm())).toEqual([]);
  });

  it("reports temporal errors on their concerned fields", () => {
    const form = buildValidPreActionForm();
    form.meetingTime = "09:30";
    form.departureTime = "09:00";
    form.durationMinutes = "120";
    form.eventStartTime = "09:00";
    form.eventEndTime = "10:00";

    expect(validateBeforeActionForm(form).map((issue) => issue.field)).toEqual([
      "departureTime",
      "durationMinutes",
    ]);
  });

  it("does not validate an absent optional global window as a zero-duration event", () => {
    const form = buildValidPreActionForm();
    form.durationMinutes = "";
    form.meetingTime = "09:00";
    form.departureTime = "09:00";

    expect(validateBeforeActionForm(form)).toEqual([]);
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
