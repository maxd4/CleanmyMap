import { describe, expect, it } from "vitest";
import {
  ACTION_VALIDATION_FIELD_IDS,
  getActionValidationFieldErrorId,
  getActionValidationTargetId,
} from "./action-declaration-form.model";

describe("action declaration form presentation model", () => {
  it("maps validation issues to controls that remain visible in the five-group form", () => {
    expect(getActionValidationTargetId("organizerType")).toBe("action-organizer-type");
    expect(getActionValidationTargetId("wasteKg")).toBe("harvest-waste-kg");
    expect(getActionValidationTargetId("wasteRecyclablesKg")).toBe("harvest-waste-recyclables-kg");
    expect(getActionValidationTargetId("wasteMegotsKg")).toBe("harvest-megots-kg");
    expect(getActionValidationTargetId("cigaretteButtsCount")).toBe("harvest-megots-count");
    expect(getActionValidationTargetId("cigaretteButtsVolumeLiters")).toBe("harvest-megots-volume");
    expect(getActionValidationTargetId("manualDrawing")).toBe("action-location-geometry");
    expect(getActionValidationTargetId("gpxImport")).toBe("gpx-import");
    expect(getActionValidationTargetId("unknown")).toBeNull();
  });

  it("keeps stable error ids for the aggregated summary", () => {
    expect(getActionValidationFieldErrorId("volunteersCount")).toBe("action-validation-error-volunteersCount");
    expect(ACTION_VALIDATION_FIELD_IDS).not.toHaveProperty("actionTitle");
  });
});
