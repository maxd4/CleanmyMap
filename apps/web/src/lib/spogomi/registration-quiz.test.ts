import { describe, expect, it } from "vitest";
import { parseSpogomiRegistrationQuizDefinition, parseSpogomiRegistrationQuizEvaluation } from "./registration-quiz";

const definition = {
  eventId: "event-1",
  divisionId: "division-1",
  regulationVersion: "casual-v1",
  quizVersion: "quiz-v1",
  available: true,
  sourceReference: "reglement:casual-v1",
  missing: [],
  questions: [{ id: "schedule", prompt: "Horaires ?", critical: true, options: [{ id: "official", label: "09:00" }, { id: "other", label: "12:00" }] }],
};

describe("SPOGOMI registration quiz contract", () => {
  it("keeps the public definition free of server answer keys", () => {
    expect(parseSpogomiRegistrationQuizDefinition(definition)).toEqual(definition);
    expect(parseSpogomiRegistrationQuizDefinition({ ...definition, questions: [{ ...definition.questions[0], correctOptionId: "official" }] })).toEqual(expect.objectContaining({ questions: expect.arrayContaining([expect.objectContaining({ id: "schedule" })]) }));
  });

  it("accepts a missing-information projection without inventing questions", () => {
    const parsed = parseSpogomiRegistrationQuizDefinition({ ...definition, available: false, questions: [], missing: [{ id: "safety", label: "Sécurité", status: "not_verified", href: "#safety" }] });
    expect(parsed).toMatchObject({ available: false, questions: [], missing: [{ id: "safety", status: "not_verified" }] });
  });

  it("rejects malformed definitions and evaluations", () => {
    expect(parseSpogomiRegistrationQuizDefinition({ ...definition, quizVersion: 4 })).toBeNull();
    expect(parseSpogomiRegistrationQuizEvaluation({ passed: true })).toBeNull();
  });
});
