import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createSpogomiRefereeApplication,
  decideSpogomiRefereeApplication,
  loadSpogomiRefereeQuiz,
  submitSpogomiRefereeQuiz,
} from "./referee-qualification-service";

function supabaseFor(result: { data?: unknown; error?: { code?: string; message?: string } | null }) {
  return { rpc: vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null })) } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

const application = {
  applicationId: "application-1",
  eventId: "event-1",
  divisionId: "division-1",
  status: "candidate" as const,
  quizVersion: null,
  regulationVersion: "regulation-v1",
  theoryQualified: false,
  practicalConfirmed: false,
};

describe("SPOGOMI referee qualification service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an event/division-scoped application without treating it as an access grant", async () => {
    const supabase = supabaseFor({ data: application });
    await expect(createSpogomiRefereeApplication({ supabase, eventId: "event-1", divisionId: "division-1", clerkId: "user-1" })).resolves.toEqual(application);
    expect(supabase.rpc).toHaveBeenCalledWith("spogomi_create_referee_application", { p_event_id: "event-1", p_division_id: "division-1", p_clerk_id: "user-1" });
  });

  it("keeps correct answers out of the public quiz contract and accepts a 20-question definition", async () => {
    const quiz = {
      eventId: "event-1", divisionId: "division-1", regulationVersion: "regulation-v1", quizVersion: "quiz-v1", available: true, sourceReference: "rulebook#v1", missing: [],
      questions: Array.from({ length: 20 }, (_, index) => ({ id: `question-${index}`, prompt: `Question ${index}`, critical: index < 12, options: [{ id: "official", label: "Réponse réglementaire" }, { id: "wrong", label: "Réponse incorrecte" }] })),
    };
    const supabase = supabaseFor({ data: quiz });
    const result = await loadSpogomiRefereeQuiz({ supabase, eventId: "event-1", divisionId: "division-1" });
    expect(result.questions).toHaveLength(20);
    expect(result.questions[0]).not.toHaveProperty("correctOptionId");
    expect(result.questions[0]).not.toHaveProperty("explanation");
    expect(supabase.rpc).toHaveBeenCalledWith("spogomi_referee_quiz_definition", { p_event_id: "event-1", p_division_id: "division-1" });
  });

  it("submits answers through the server RPC and returns pedagogical errors without granting access", async () => {
    const evaluation = { passed: false, quizVersion: "quiz-v1", score: 85, totalQuestions: 20, criticalCorrect: 11, criticalTotal: 12, otherCorrect: 8, otherTotal: 8, errors: [{ questionId: "safety", explanation: "Relisez la consigne." }], proofId: null };
    const supabase = supabaseFor({ data: evaluation });
    await expect(submitSpogomiRefereeQuiz({ supabase, eventId: "event-1", divisionId: "division-1", userId: "user-1", quizVersion: "quiz-v1", answers: { safety: "wrong" } })).resolves.toEqual(evaluation);
    expect(supabase.rpc).toHaveBeenCalledWith("spogomi_submit_referee_quiz", expect.objectContaining({ p_user_id: "user-1", p_answers: { safety: "wrong" } }));
  });

  it("maps stale, abuse and authorization failures without weakening the boundary", async () => {
    await expect(loadSpogomiRefereeQuiz({ supabase: supabaseFor({ error: { code: "40001", message: "stale" } }), eventId: "event-1", divisionId: "division-1" })).rejects.toMatchObject({ kind: "stale" });
    await expect(submitSpogomiRefereeQuiz({ supabase: supabaseFor({ error: { code: "42900", message: "limit" } }), eventId: "event-1", divisionId: "division-1", userId: "user-1", quizVersion: "quiz-v1", answers: {} })).rejects.toMatchObject({ kind: "rate_limited" });
    await expect(createSpogomiRefereeApplication({ supabase: supabaseFor({ error: { code: "23514", message: "conflict" } }), eventId: "event-1", divisionId: "division-1", clerkId: "user-1" })).rejects.toMatchObject({ kind: "validation" });
  });

  it("routes practical confirmation and organizer decision to separate RPCs", async () => {
    const supabase = supabaseFor({ data: { applicationId: "application-1", status: "practical_pending" } });
    const practical = await import("./referee-qualification-service").then(({ confirmSpogomiRefereePractical }) => confirmSpogomiRefereePractical({ supabase, applicationId: "application-1", actorClerkId: "organizer-1", confirmationVersion: "practice-v1", details: { safety: true } }));
    expect(practical).toEqual({ applicationId: "application-1", status: "practical_pending" });
    expect(supabase.rpc).toHaveBeenLastCalledWith("spogomi_confirm_referee_practical", expect.objectContaining({ p_confirmation_version: "practice-v1" }));
    await decideSpogomiRefereeApplication({ supabase, applicationId: "application-1", actorClerkId: "organizer-1", decision: "approve" });
    expect(supabase.rpc).toHaveBeenLastCalledWith("spogomi_decide_referee_application", expect.objectContaining({ p_decision: "approve" }));
  });
});
