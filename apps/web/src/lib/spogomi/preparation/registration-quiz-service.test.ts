import { describe, expect, it, vi } from "vitest";
import { loadSpogomiRegistrationQuiz, loadSpogomiRegistrationQuizProofsForUser, submitSpogomiRegistrationQuiz } from "./registration-quiz-service";

vi.mock("server-only", () => ({}));

const definition = {
  eventId: "event-1", divisionId: "division-1", regulationVersion: "rules-v1", quizVersion: "quiz-v1", available: true,
  sourceReference: "reglement:rules-v1", missing: [], questions: [{ id: "schedule", prompt: "Horaires", critical: true, options: [{ id: "official", label: "09:00" }, { id: "wrong", label: "10:00" }] }],
};
const evaluation = { passed: true, quizVersion: "quiz-v1", score: 100, totalQuestions: 1, criticalCorrect: 1, criticalTotal: 1, otherCorrect: 0, otherTotal: 0, errors: [], proofId: "proof-1" };

describe("SPOGOMI registration quiz service", () => {
  it("loads a versioned event/division definition", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: definition, error: null });
    await expect(loadSpogomiRegistrationQuiz({ supabase: { rpc } as never, eventId: "event-1", divisionId: "division-1" })).resolves.toMatchObject({ quizVersion: "quiz-v1" });
    expect(rpc).toHaveBeenCalledWith("spogomi_registration_quiz", { p_event_id: "event-1", p_division_id: "division-1" });
  });

  it("submits answers with the authenticated server identity and optional experience", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: evaluation, error: null });
    await expect(submitSpogomiRegistrationQuiz({ supabase: { rpc } as never, eventId: "event-1", divisionId: "division-1", userId: "user-1", quizVersion: "quiz-v1", answers: { schedule: "official" }, experience: "yes", experienceDescription: "Une cleanwalk locale." })).resolves.toEqual(evaluation);
    expect(rpc).toHaveBeenCalledWith("spogomi_submit_registration_quiz", expect.objectContaining({ p_user_id: "user-1", p_answers: { schedule: "official" }, p_experience: "yes" }));
  });

  it("fails closed when the server returns an invalid evaluation", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { passed: true }, error: null });
    await expect(submitSpogomiRegistrationQuiz({ supabase: { rpc } as never, eventId: "event-1", divisionId: "division-1", userId: "user-1", quizVersion: "quiz-v1", answers: {} })).rejects.toThrow("évaluation du quiz");
  });

  it("matches persisted proofs to the current version without exposing another division", async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [
        { division_id: "division-1", quiz_version: "quiz-v1", registration_contract_revision: 3 },
        { division_id: "division-2", quiz_version: "quiz-other", registration_contract_revision: 3 },
      ], error: null }).then(resolve),
    };
    const supabase = { from: vi.fn(() => query) };
    await expect(loadSpogomiRegistrationQuizProofsForUser({ supabase: supabase as never, eventId: "event-1", userId: "user-1", quizVersions: new Map([["division-1", "quiz-v1"], ["division-2", "quiz-v2"]]), registrationContractRevision: 3 })).resolves.toEqual(new Set(["division-1"]));
    expect(supabase.from).toHaveBeenCalledWith("spogomi_registration_quiz_proofs");
  });

  it("rejects a proof from an older registration contract revision", async () => {
    const query = {
      select: vi.fn(() => query), eq: vi.fn(() => query), in: vi.fn(() => query),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ division_id: "division-1", quiz_version: "quiz-v1", registration_contract_revision: 2 }], error: null }).then(resolve),
    };
    const supabase = { from: vi.fn(() => query) };
    await expect(loadSpogomiRegistrationQuizProofsForUser({ supabase: supabase as never, eventId: "event-1", userId: "user-1", quizVersions: new Map([["division-1", "quiz-v1"]]), registrationContractRevision: 3 })).resolves.toEqual(new Set());
  });

  it("distinguishes a proof read failure from a missing proof", async () => {
    const query = {
      select: vi.fn(() => query), eq: vi.fn(() => query), in: vi.fn(() => query),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error: { code: "42501" } }).then(resolve),
    };
    await expect(loadSpogomiRegistrationQuizProofsForUser({ supabase: { from: vi.fn(() => query) } as never, eventId: "event-1", userId: "user-1", quizVersions: new Map([["division-1", "quiz-v1"]]), registrationContractRevision: 3 })).rejects.toMatchObject({ kind: "unavailable" });
  });
});
