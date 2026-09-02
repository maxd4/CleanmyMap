import { describe, expect, it } from "vitest";
import { validateContentRecord } from "@/lib/content/content-validation";
import {
  getQuizSchoolTerritorialResources,
  QUIZ_SCHOOL_TERRITORIAL_RESOURCES,
  type QuizSchoolTerritorialResource,
} from "./quiz-school-territorial-resources";

describe("school/quiz-school-territorial-resources", () => {
  it("publie un registre francilien sourcé et priorise Paris", () => {
    const resources = getQuizSchoolTerritorialResources();
    expect(resources.length).toBeGreaterThanOrEqual(2);
    expect(resources.every((resource) => resource.region === "ile-de-france" && resource.officialUrl.startsWith("https://"))).toBe(true);
    expect(resources[0].territory.fr.startsWith("Paris")).toBe(true);
    expect(resources.every((resource) => validateContentRecord(resource.validation).readyForPublication)).toBe(true);
  });

  it("exclut une ressource non validée et retourne une liste vide en l’absence de ressource", () => {
    const reviewOnly: QuizSchoolTerritorialResource = {
      ...QUIZ_SCHOOL_TERRITORIAL_RESOURCES[0],
      id: "review-only",
      validationStatus: "needsReview",
    };

    expect(getQuizSchoolTerritorialResources("ile-de-france", [reviewOnly])).toEqual([]);
  });

  it("ne contient ni nom, ni compte, ni donnée personnelle à collecter", () => {
    const source = JSON.stringify(QUIZ_SCHOOL_TERRITORIAL_RESOURCES);
    expect(source).not.toContain("studentName");
    expect(source).not.toContain("className");
    expect(source).not.toContain("email");
  });
});
