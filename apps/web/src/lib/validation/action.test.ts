import { describe, expect, it } from "vitest";
import { createActionSchema, updateActionSchema } from "./action";

describe("createActionSchema", () => {
  const basePayload = {
    actorName: "Bénévole test",
    associationName: "Action spontanée",
    actionDate: "2026-04-22",
    locationLabel: "Canal Saint-Martin",
    wasteKg: 1.5,
    cigaretteButts: 0,
    volunteersCount: 2,
    durationMinutes: 45,
  };

  it("accepts each canonical organizer type and rejects an unknown value", () => {
    for (const organizerType of [
      "spontaneous",
      "company",
      "association",
      "student_association",
      "collective",
      "other",
    ]) {
      expect(
        createActionSchema.safeParse({ ...basePayload, organizerType }).success,
      ).toBe(true);
    }

    expect(
      createActionSchema.safeParse({ ...basePayload, organizerType: "association_name" }).success,
    ).toBe(false);
  });

  it("keeps the cigarette butt condition sent by the volunteer form", () => {
    const parsed = createActionSchema.parse({
      ...basePayload,
      organizerType: "spontaneous",
      wasteBreakdown: {
        megotsKg: 0.4,
        megotsCondition: "humide",
      },
    });

    expect(parsed.wasteBreakdown?.megotsCondition).toBe("humide");
  });

  it("accepts manual participant accounts on the action payload", () => {
    const parsed = createActionSchema.parse({
      ...basePayload,
      organizerType: "spontaneous",
      participantAccounts: ["user-1", "user-2", "user-1"],
    });

    expect(parsed.participantAccounts).toEqual(["user-1", "user-2", "user-1"]);
  });

  it("accepts unknown terrain measurements without manufacturing zeroes", () => {
    const parsed = createActionSchema.parse({
      ...basePayload,
      wasteKg: null,
      cigaretteButts: null,
      organizerType: "spontaneous",
    });

    expect(parsed.wasteKg).toBeNull();
    expect(parsed.cigaretteButts).toBeNull();
  });

  it("normalizes omitted measurements to null for pre-action compatibility", () => {
    const parsed = createActionSchema.parse({
      ...basePayload,
      wasteKg: undefined,
      cigaretteButts: undefined,
      cigaretteButtsCount: undefined,
    });

    expect(parsed.wasteKg).toBeNull();
    expect(parsed.cigaretteButts).toBeNull();
  });

  it("accepts an explicitly measured zero cigarette count", () => {
    const parsed = createActionSchema.parse({
      ...basePayload,
      cigaretteButts: 0,
      cigaretteButtsCount: 0,
    });

    expect(parsed.cigaretteButts).toBe(0);
    expect(parsed.cigaretteButtsCount).toBe(0);
  });

  it("normalizes legacy route topology from the arrival and rejects missing point-to-point arrivals", () => {
    const legacyPointToPoint = createActionSchema.parse({
      ...basePayload,
      arrivalLocationLabel: "Place de la République",
    });
    expect(legacyPointToPoint.routeTopology).toBe("point_to_point");
    expect(legacyPointToPoint.preparationData?.routeTopology).toBe("point_to_point");

    const legacyLoop = createActionSchema.parse(basePayload);
    expect(legacyLoop.routeTopology).toBe("loop");

    const invalid = createActionSchema.safeParse({
      ...basePayload,
      routeTopology: "point_to_point",
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues.some((issue) => issue.path.includes("arrivalLocationLabel"))).toBe(true);
    }
  });

  it("uses the canonical five-million bound for every ordinary count alias", () => {
    for (const field of ["cigaretteButts", "cigaretteButtsCount"] as const) {
      expect(
        createActionSchema.safeParse({ ...basePayload, [field]: 5_000_000 }).success,
      ).toBe(true);
      expect(
        createActionSchema.safeParse({ ...basePayload, [field]: 5_000_001 }).success,
      ).toBe(false);
    }

    expect(
      createActionSchema.safeParse({
        ...basePayload,
        cigaretteButtsMeasurements: { cigaretteButtsCount: 5_000_000 },
      }).success,
    ).toBe(true);
    expect(
      createActionSchema.safeParse({
        ...basePayload,
        cigaretteButtsMeasurements: { cigaretteButtsCount: 5_000_001 },
      }).success,
    ).toBe(false);
  });

  it("accepts only volunteer source categories and recalculates derived values", () => {
    const parsed = createActionSchema.parse({
      ...basePayload,
      volunteerParticipation: {
        childrenCount: 2,
        adultCount: 4,
        retiredCount: 2,
      },
    });

    expect(parsed.volunteerParticipation).toMatchObject({
      childrenCount: 2,
      adultCount: 4,
      retiredCount: 2,
      participantsCount: 8,
      effectiveVolunteerUnits: 6,
    });
    expect(
      createActionSchema.safeParse({
        ...basePayload,
        volunteerParticipation: {
          childrenCount: 2,
          adultCount: 4,
          retiredCount: 2,
          participantsCount: 999,
        },
      }).success,
    ).toBe(false);
    expect(
      createActionSchema.safeParse({
        ...basePayload,
        preparationData: {
          volunteerParticipation: {
            childrenCount: 2,
            adultCount: 4,
            retiredCount: 2,
            effectiveVolunteerUnits: 999,
          },
        },
      }).success,
    ).toBe(false);
  });

  it("keeps incomplete volunteer categories unknown and enforces the total bound", () => {
    const partial = createActionSchema.parse({
      ...basePayload,
      volunteerParticipation: { adultCount: 5 },
    });
    expect(partial.volunteerParticipation).toMatchObject({
      childrenCount: null,
      adultCount: 5,
      retiredCount: null,
      participantsCount: null,
      effectiveVolunteerUnits: null,
    });

    expect(
      createActionSchema.safeParse({
        ...basePayload,
        volunteerParticipation: {
          childrenCount: 200,
          adultCount: 200,
          retiredCount: 100,
        },
      }).success,
    ).toBe(true);
    expect(
      createActionSchema.safeParse({
        ...basePayload,
        volunteerParticipation: {
          childrenCount: 200,
          adultCount: 200,
          retiredCount: 101,
        },
      }).success,
    ).toBe(false);
  });

  it("rejects off-grid ordinary masses without rounding, including update input", () => {
    for (const value of [0, 0.1, 9.9, 10.1]) {
      expect(createActionSchema.safeParse({ ...basePayload, wasteKg: value }).success).toBe(true);
      expect(updateActionSchema.safeParse({ wasteKg: value }).success).toBe(true);
    }
    for (const value of [10.05, 10.037]) {
      expect(createActionSchema.safeParse({ ...basePayload, wasteKg: value }).success).toBe(false);
      expect(updateActionSchema.safeParse({ wasteKg: value }).success).toBe(false);
      expect(
        createActionSchema.safeParse({
          ...basePayload,
          wasteBreakdown: {
            recyclablesKg: value,
            glassKg: 0,
            householdWasteKg: 0,
            otherWasteKg: 0,
          },
        }).success,
      ).toBe(false);
    }

    expect(
      createActionSchema.safeParse({ ...basePayload, cigaretteButtsMassKg: 1.23 }).success,
    ).toBe(true);
  });

  it("accepts canonical raw measurements and strips client provenance fields", () => {
    const parsed = createActionSchema.parse({
      ...basePayload,
      wasteKg: null,
      cigaretteButts: null,
      cigaretteButtsMeasurements: {
        cigaretteButtsCount: 3_000,
        cigaretteButtsMassKg: null,
        cigaretteButtsVolumeLiters: null,
        cigaretteButtsCondition: "propre",
        cigaretteButtsCountProvenance: "weight_converted",
        cigaretteButtsMassProvenance: "estimated",
        cigaretteButtsConversionFormulaVersion: "client-forged",
      },
    });

    expect(parsed.cigaretteButtsMeasurements).toEqual({
      cigaretteButtsCount: 3_000,
      cigaretteButtsMassKg: null,
      cigaretteButtsVolumeLiters: null,
      cigaretteButtsCondition: "propre",
    });
  });

  it("accepts a partial event window and rejects an incoherent same-day window", () => {
    expect(
      createActionSchema.safeParse({
        ...basePayload,
        eventStartTime: "09:00",
      }).success,
    ).toBe(true);
    expect(
      createActionSchema.safeParse({
        ...basePayload,
        eventStartTime: "11:00",
        eventEndTime: "10:00",
      }).success,
    ).toBe(false);
    expect(
      createActionSchema.safeParse({
        ...basePayload,
        eventStartTime: "09:00",
        eventEndTime: "10:30",
        durationMinutes: 120,
      }).success,
    ).toBe(false);
  });

  it("allows an authorized update to clear or correct the event window", () => {
    expect(updateActionSchema.safeParse({ eventStartTime: null }).success).toBe(true);
    expect(
      updateActionSchema.safeParse({
        eventStartTime: "09:30",
        eventEndTime: "11:00",
      }).success,
    ).toBe(true);
    expect(
      updateActionSchema.safeParse({
        eventStartTime: "11:00",
        eventEndTime: "09:30",
      }).success,
    ).toBe(false);
  });
});
