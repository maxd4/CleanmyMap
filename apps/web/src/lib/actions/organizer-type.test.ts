import { describe, expect, it } from "vitest";
import {
  getOrganizerTypeLabel,
  isOrganizerType,
  ORGANIZER_TYPE_OPTIONS,
  ORGANIZER_TYPE_VALUES,
} from "./organizer-type";

describe("organizer type contract", () => {
  it("exposes exactly the six canonical values and French labels", () => {
    expect(ORGANIZER_TYPE_VALUES).toEqual([
      "spontaneous",
      "company",
      "association",
      "student_association",
      "collective",
      "other",
    ]);
    expect(ORGANIZER_TYPE_OPTIONS.map((option) => option.label)).toEqual([
      "Action spontanée",
      "Entreprise",
      "Association",
      "Association étudiante",
      "Collectif",
      "Autre",
    ]);
  });

  it("keeps Association and Association étudiante distinct", () => {
    expect(isOrganizerType("association")).toBe(true);
    expect(isOrganizerType("student_association")).toBe(true);
    expect("association").not.toBe("student_association");
    expect(getOrganizerTypeLabel("student_association")).toBe("Association étudiante");
  });

  it("rejects unknown values without inferring from organizer names", () => {
    expect(isOrganizerType("association_name")).toBe(false);
    expect(isOrganizerType("Association")).toBe(false);
    expect(getOrganizerTypeLabel(null)).toBe("Non renseigné");
  });
});
