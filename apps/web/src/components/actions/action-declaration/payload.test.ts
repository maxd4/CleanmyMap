import { describe, expect, it } from "vitest";
import { buildCreateActionPayload, parseOrganizerAccounts } from "./payload";
import { buildBaseForm } from "./payload.test-fixtures";

describe("action declaration payload identity and organisation", () => {
  it("uses category sources for participants and keeps operational units separate", () => {
    const form = buildBaseForm();
    form.childrenCount = "2";
    form.adultCount = "4";
    form.retiredCount = "2";
    form.volunteersCount = "999";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.volunteersCount).toBe(8);
    expect(payload.volunteerParticipation).toMatchObject({
      childrenCount: 2,
      adultCount: 4,
      retiredCount: 2,
    });
    expect(payload.volunteerParticipation).not.toHaveProperty("participantsCount");
    expect(payload.volunteerParticipation).not.toHaveProperty("effectiveVolunteerUnits");
    expect(payload.preparationData?.volunteerParticipation).toEqual({
      childrenCount: 2,
      adultCount: 4,
      retiredCount: 2,
    });
  });

  it("normalizes organizer account tokens before payload creation", () => {
    expect(parseOrganizerAccounts("  @alice, bob ; alice\ncarol  ")).toEqual([
      "alice",
      "bob",
      "carol",
    ]);

    const form = buildBaseForm();
    form.associationName = "Association Sans Murs Paris 15";
    form.organizerAccounts = "alice, bob, alice";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.organizerAccounts).toEqual(["alice", "bob"]);
  });

  it("forwards the authenticated user metadata unchanged", () => {
    const form = buildBaseForm();
    const userMetadata = {
      userId: "user-test-123",
      username: "alice",
      displayName: "Alice Test",
      email: "alice@example.com",
    };

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
      userMetadata,
    });

    expect(payload.userMetadata).toEqual(userMetadata);
  });

  it("keeps the record type in the payload", () => {
    const form = buildBaseForm();
    form.recordType = "clean_place";
    form.routeTopology = "point_to_point";
    form.arrivalLocationLabel = "Complément du lieu";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.recordType).toBe("clean_place");
    expect(payload.routeTopology).toBe("loop");
    expect(payload.arrivalLocationLabel).toBe("Complément du lieu");
    expect(payload.preparationData?.zoneCiblePrevue).toBe("Complément du lieu");
    expect(payload.preparationData?.arrivalCoordinates).toBeUndefined();
  });

  it("keeps the structure type separate from the organizer name", () => {
    const form = buildBaseForm();
    form.associationName = "Action spontanée";
    form.organizerType = "student_association";
    form.organizerAccounts = "club-etudiant";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.organizerType).toBe("student_association");
    expect(payload.associationName).toBe("Action spontanée");
  });

  it("normalizes the other volunteer UI sentinel before payload creation", () => {
    const form = buildBaseForm();
    form.actorName = "Bénévole invité";
    form.associationName = "__autre_benevole__";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.actorName).toBe("Bénévole invité");
    expect(payload.associationName).toBe("Action spontanée");
  });

  it("preserves selected organizer accounts for spontaneous actions", () => {
    const form = buildBaseForm();
    form.associationName = "Action spontanée";
    form.organizerAccounts = "alice, bob";

    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });

    expect(payload.associationName).toBe("Action spontanée");
    expect(payload.organizerAccounts).toEqual(["alice", "bob"]);
  });
});
