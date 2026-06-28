import { describe, expect, it } from "vitest";

import { QUIZ_ACCESS_TYPES } from "@/components/learn/quiz-access-types";
import { QUIZ_SCHOOL_TRACKS } from "@/components/learn/quiz-school-modes";
import {
  QUIZ_UI_COPY,
  getQuizLocalizedTextFallback,
  getQuizLocalizedTextListFallback,
} from "./quiz-i18n";

describe("quiz i18n conventions", () => {
  it("falls back to French when the locale-specific text is missing", () => {
    expect(getQuizLocalizedTextFallback("en", { fr: "Texte de secours" }, "fallback")).toBe("Texte de secours");
    expect(getQuizLocalizedTextFallback("fr", undefined, "fallback")).toBe("fallback");
    expect(getQuizLocalizedTextListFallback("en", { fr: ["A", "B"] }, ["fallback"])).toEqual(["A", "B"]);
  });

  it("keeps the quiz UI copy catalog complete for the declared keys", () => {
    expect(Object.keys(QUIZ_UI_COPY).length).toBeGreaterThan(0);
    expect(new Set(QUIZ_ACCESS_TYPES.map((accessType) => accessType.labelKey)).size).toBe(QUIZ_ACCESS_TYPES.length);
    expect(new Set(QUIZ_SCHOOL_TRACKS.map((track) => track.labelKey)).size).toBe(QUIZ_SCHOOL_TRACKS.length);
  });
});
