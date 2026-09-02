import { describe, expect, it } from "vitest";
import {
  composeQuizSchoolWorkshopActivities,
  QUIZ_SCHOOL_ACTIVITY_TYPE_LABELS,
  QUIZ_SCHOOL_WORKSHOP_ACTIVITIES,
  QUIZ_SCHOOL_WORKSHOP_ACTIVITY_TARGET_MINUTES,
  type QuizSchoolActivity,
} from "./quiz-school-workshop-activities";

const LEVELS = ["6e", "5e", "4e", "3e"] as const;

describe("school/quiz-school-workshop-activities", () => {
  it.each(LEVELS)("compose une séquence déterministe de 30 minutes pour la %s", (level) => {
    const first = composeQuizSchoolWorkshopActivities(level);
    const second = composeQuizSchoolWorkshopActivities(level);

    expect(first).toEqual(second);
    expect(first.reduce((total, activity) => total + activity.durationMinutes, 0)).toBe(
      QUIZ_SCHOOL_WORKSHOP_ACTIVITY_TARGET_MINUTES,
    );
    expect(first.every((activity) => activity.allowedLevels.includes(level))).toBe(true);
    expect(first.every((activity) => activity.levelProfiles[level])).toBe(true);
    expect(first.every((activity) => activity.validationStatus === "validated" && !activity.needsReview)).toBe(true);
    expect(new Set(first.map((activity) => activity.id)).size).toBe(first.length);
    expect(new Set(first.map((activity) => `${activity.instruction.fr}\u0000${activity.instruction.en}`)).size).toBe(first.length);
  });

  it("couvre les objectifs, les formats d’activité et les tracks internes sans banque dupliquée", () => {
    const activities = composeQuizSchoolWorkshopActivities("4e");
    const themes = new Set(activities.map((activity) => activity.theme));
    const types = new Set(activities.map((activity) => activity.type));
    const tracks = new Set(activities.map((activity) => activity.trackId));

    expect(themes).toEqual(new Set(["ecocitoyennete", "habitudes-utiles", "science-et-calcul", "echelles-collectives"]));
    expect(types).toEqual(new Set(Object.keys(QUIZ_SCHOOL_ACTIVITY_TYPE_LABELS)));
    expect(tracks.size).toBeGreaterThanOrEqual(3);
    expect(activities.some((activity) => activity.theme === "echelles-collectives" && activity.type === "situation-probleme")).toBe(true);
  });

  it("exclut les activités non validées et les activités hors niveau", () => {
    const reviewActivity: QuizSchoolActivity = {
      ...QUIZ_SCHOOL_WORKSHOP_ACTIVITIES[0],
      id: "review-only",
      needsReview: true,
    };
    const sixOnlyActivity: QuizSchoolActivity = {
      ...QUIZ_SCHOOL_WORKSHOP_ACTIVITIES[1],
      id: "six-only",
      allowedLevels: ["6e"],
    };

    const activities = composeQuizSchoolWorkshopActivities("3e", [reviewActivity, sixOnlyActivity]);

    expect(activities).toEqual([]);
  });

  it("attache une source à chaque activité publique et conserve une validation explicite", () => {
    expect(
      QUIZ_SCHOOL_WORKSHOP_ACTIVITIES.every(
        (activity) => activity.source.href.startsWith("/") && activity.source.label.fr.length > 0 && activity.validationStatus === "validated",
      ),
    ).toBe(true);
  });
});
