import { describe, expect, it } from "vitest";
import { createInitialFormState } from "../payload";
import {
  buildPublicationSummary,
  isResumablePreAction,
  sanitizePreActionForm,
} from "./model";

describe("pre-action resume contract", () => {
  it.each([
    ["pending", true],
    ["approved", true],
    ["rejected", false],
    ["cancelled", false],
  ] as const)("%s pre-action is %s resumable", (status, expected) => {
    expect(
      isResumablePreAction({ actionPhase: "pre_action", status }),
    ).toBe(expected);
  });

  it("requires the pre-action phase even for pending and approved actions", () => {
    expect(
      isResumablePreAction({ actionPhase: "post_action_draft", status: "pending" }),
    ).toBe(false);
    expect(
      isResumablePreAction({ actionPhase: "post_action_complete", status: "approved" }),
    ).toBe(false);
  });
});

describe("sanitizePreActionForm", () => {
  it("removes final harvest fields while keeping expected waste categories", () => {
    const form = createInitialFormState("Maxence", "action");

    const sanitized = sanitizePreActionForm({
      ...form,
      wasteKg: "12",
      cigaretteButts: "42",
      cigaretteButtsCount: "42",
      cigaretteButtsCondition: "humide",
      wasteMegotsKg: "3",
      wasteMegotsCondition: "mouille",
      wastePlastiqueKg: "4",
      wasteVerreKg: "5",
      wasteMetalKg: "6",
      wasteMixteKg: "7",
      triQuality: "elevee",
      visionBagsCount: "8",
      visionFillLevel: "75",
      visionDensity: "humide_dense",
      notes: "bilan final",
      wasteCategories: ["plastic"],
    });

    expect(sanitized.wasteKg).toBe("");
    expect(sanitized.cigaretteButts).toBe("");
    expect(sanitized.cigaretteButtsCount).toBe("");
    expect(sanitized.cigaretteButtsCondition).toBe("propre");
    expect(sanitized.wasteMegotsKg).toBe("");
    expect(sanitized.wasteMegotsCondition).toBe("propre");
    expect(sanitized.wastePlastiqueKg).toBe("");
    expect(sanitized.wasteVerreKg).toBe("");
    expect(sanitized.wasteMetalKg).toBe("");
    expect(sanitized.wasteMixteKg).toBe("");
    expect(sanitized.triQuality).toBe("moyenne");
    expect(sanitized.visionBagsCount).toBe("");
    expect(sanitized.visionFillLevel).toBe("");
    expect(sanitized.visionDensity).toBe("");
    expect(sanitized.notes).toBe("");
    expect(sanitized.wasteCategories).toEqual(["plastic"]);
  });

  it("normalizes enterprise association values and participant accounts", () => {
    const form = createInitialFormState("Maxence", "action");

    const sanitized = sanitizePreActionForm({
      ...form,
      associationName: "Entreprise - Veolia",
      participantAccounts: [" @alice ", "alice", "@bob"],
      volunteersCount: "",
    });

    expect(sanitized.associationName).toBe("Entreprise");
    expect(sanitized.organizerName).toBe("Entreprise - Veolia");
    expect(sanitized.participantAccounts).toEqual(["alice", "bob"]);
    expect(sanitized.volunteersCount).toBe("1");
  });

  it("preserves the declared action time and event window in the pre-form", () => {
    const form = createInitialFormState("Maxence", "action");
    const sanitized = sanitizePreActionForm({
      ...form,
      durationMinutes: "75",
      eventStartTime: " 09:00 ",
      eventEndTime: "10:45",
    });

    expect(sanitized.durationMinutes).toBe("75");
    expect(sanitized.eventStartTime).toBe("09:00");
    expect(sanitized.eventEndTime).toBe("10:45");
  });
});

describe("buildPublicationSummary", () => {
  it("maps the canonical published action to the final recap", () => {
    const summary = buildPublicationSummary({
      id: "action-42",
      actionDate: "2026-09-20",
      eventStartTime: "09:00",
      eventEndTime: "11:00",
      locationLabel: "Paris 15e",
      departureLocationLabel: "Place de la mairie",
      arrivalLocationLabel: "Quai de Seine",
      volunteersCount: 8,
      preparationData: {
        preparationState: "pret_a_partager",
        safetyInstructions: "Rester en groupe.",
        logisticsNotes: "Vérifier l'autorisation du lieu.",
        operationalRoute: {
          routes: [{}, {}],
        },
        routeCalibrationContext: {
          plannerSnapshot: {
            weatherContext: {
              status: "available",
              summary: { temperatureC: 18 },
            },
          },
        },
      },
    } as never);

    expect(summary).toEqual(expect.arrayContaining([
      { label: "Itinéraire", value: "Place de la mairie → Quai de Seine · 2 groupe(s)" },
      { label: "Date / heure", value: "2026-09-20 · 09:00 · à 11:00" },
      { label: "Météo", value: "Prévision disponible · 18 °C" },
      { label: "Formalité Paris", value: "Vérifier l'autorisation du lieu." },
      { label: "Bénévoles recherchés", value: "8" },
      { label: "Consignes principales", value: "Rester en groupe." },
    ]));
  });

  it("states when weather and Paris formalities are not part of the canonical data", () => {
    const form = createInitialFormState("Maxence", "action");
    const summary = buildPublicationSummary({
      ...form,
      actionTitle: "Nettoyage test",
      departureLocationLabel: "Paris 5e",
      actionDate: "2026-09-20",
    });

    expect(summary.find((item) => item.label === "Météo")?.value).toContain("Non disponible");
    expect(summary.find((item) => item.label === "Formalité Paris")?.value).toContain("à vérifier");
  });
});
