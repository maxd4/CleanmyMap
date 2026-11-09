import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadQuizMock = vi.hoisted(() => vi.fn());
const submitQuizMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/spogomi/preparation/registration-quiz-service", () => ({
  loadSpogomiRegistrationQuiz: loadQuizMock,
  submitSpogomiRegistrationQuiz: submitQuizMock,
  SpogomiRegistrationQuizError: class SpogomiRegistrationQuizError extends Error { kind = "stale"; },
}));

const eventId = "11111111-1111-4111-8111-111111111111";
const divisionId = "22222222-2222-4222-8222-222222222222";
const context = () => ({ params: Promise.resolve({ eventId }) });

describe("SPOGOMI registration quiz API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    getSupabaseServerClientMock.mockReturnValue({ id: "service-client" });
    loadQuizMock.mockResolvedValue({ eventId, divisionId, regulationVersion: "rules-v1", quizVersion: "quiz-v1", available: true, sourceReference: "official", missing: [], questions: [] });
    submitQuizMock.mockResolvedValue({ passed: true, quizVersion: "quiz-v1", score: 100, totalQuestions: 0, criticalCorrect: 0, criticalTotal: 0, otherCorrect: 0, otherTotal: 0, errors: [], proofId: "proof-1" });
  });

  it("rejects an unauthenticated read without invoking the quiz owner", async () => {
    const { GET } = await import("./route");
    requireAuthenticatedAccessMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const response = await GET(new Request(`http://localhost?divisionId=${divisionId}`), context());
    expect(response!.status).toBe(401);
    expect(loadQuizMock).not.toHaveBeenCalled();
  });

  it("loads the selected division and never returns a client identity parameter", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request(`http://localhost?divisionId=${divisionId}`), context());
    expect(response!.status).toBe(200);
    expect(loadQuizMock).toHaveBeenCalledWith({ supabase: { id: "service-client" }, eventId, divisionId });
  });

  it("forwards the authenticated identity and answers to the server proof owner", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost", { method: "POST", body: JSON.stringify({ divisionId, quizVersion: "quiz-v1", answers: { schedule: "official" }, experience: "yes", experienceDescription: "Oui." }) }), context());
    expect(response!.status).toBe(200);
    expect(submitQuizMock).toHaveBeenCalledWith(expect.objectContaining({ eventId, divisionId, userId: "user-1", quizVersion: "quiz-v1", answers: { schedule: "official" } }));
  });
});
