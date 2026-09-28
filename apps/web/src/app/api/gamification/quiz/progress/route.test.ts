import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const syncQuizQuestionTypeProgressMock = vi.hoisted(() => vi.fn());
const syncQuizQuestionTypeBalanceProgressMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/gamification/quiz-progress", () => ({
  syncQuizQuestionTypeProgress: syncQuizQuestionTypeProgressMock,
}));

vi.mock("@/lib/gamification/quiz-balance-progress", () => ({
  syncQuizQuestionTypeBalanceProgress: syncQuizQuestionTypeBalanceProgressMock,
}));

import { POST } from "./route";

const progressResult = {
  questionType: "true-false",
  questionTypeLabel: "Vrai / Faux",
  previousCount: 0,
  correctCount: 1,
  awards: [],
  totalXpAwarded: 0,
};

const balanceResult = {
  previousBalancedCount: 0,
  balancedCount: 0,
  awards: [],
  totalXpAwarded: 0,
};

function request(body: unknown) {
  return new Request("http://localhost/api/gamification/quiz/progress", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/gamification/quiz/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    getSupabaseServerClientMock.mockReturnValue({});
    syncQuizQuestionTypeProgressMock.mockResolvedValue(progressResult);
    syncQuizQuestionTypeBalanceProgressMock.mockResolvedValue(balanceResult);
  });

  it("preserves the existing anonymous refusal without creating a privileged client", async () => {
    authMock.mockResolvedValueOnce({ userId: null });

    const response = await POST(request({ questionId: "e1", answer: "Faux" }));

    expect(response.status).toBe(401);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(syncQuizQuestionTypeProgressMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown question before any privileged access", async () => {
    const response = await POST(request({ questionId: "unknown-question", answer: "Faux" }));

    expect(response.status).toBe(422);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(syncQuizQuestionTypeProgressMock).not.toHaveBeenCalled();
    expect(syncQuizQuestionTypeBalanceProgressMock).not.toHaveBeenCalled();
  });

  it("requires a question id instead of accepting a client-only correctness claim", async () => {
    const response = await POST(request({ questionType: "true-false", correct: true }));

    expect(response.status).toBe(422);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(syncQuizQuestionTypeProgressMock).not.toHaveBeenCalled();
  });

  it("uses the canonical type and answer instead of client assertions", async () => {
    const response = await POST(
      request({
        questionId: "e1",
        questionType: "forged-type",
        answer: " Faux ",
        correct: false,
      }),
    );

    expect(response.status).toBe(200);
    expect(syncQuizQuestionTypeProgressMock).toHaveBeenCalledWith(
      {},
      { userId: "user-1", questionType: "true-false", questionId: "e1" },
    );
    expect(syncQuizQuestionTypeBalanceProgressMock).toHaveBeenCalledWith(
      {},
      { userId: "user-1", questionType: "true-false", questionId: "e1" },
    );
  });

  it("does not progress for a wrong answer even when the client declares it correct", async () => {
    const response = await POST(
      request({ questionId: "e1", answer: "Vrai", correct: true, questionType: "true-false" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ status: "ok", questionType: "true-false", totalXpAwarded: 0 });
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(syncQuizQuestionTypeProgressMock).not.toHaveBeenCalled();
    expect(syncQuizQuestionTypeBalanceProgressMock).not.toHaveBeenCalled();
  });

  it("awards normal progression for a verified correct answer", async () => {
    const response = await POST(request({ questionId: "e1", answer: "Faux", correct: false }));

    expect(response.status).toBe(200);
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
    expect(syncQuizQuestionTypeProgressMock).toHaveBeenCalledTimes(1);
    expect(syncQuizQuestionTypeBalanceProgressMock).toHaveBeenCalledTimes(1);
  });

  it("keeps replay responses within the existing milestone contract", async () => {
    syncQuizQuestionTypeProgressMock
      .mockResolvedValueOnce({ ...progressResult, previousCount: 49, correctCount: 50, totalXpAwarded: 10 })
      .mockResolvedValueOnce({ ...progressResult, previousCount: 50, correctCount: 51, totalXpAwarded: 0 });

    const firstResponse = await POST(request({ questionId: "e1", answer: "Faux" }));
    const secondResponse = await POST(request({ questionId: "e1", answer: "Faux" }));

    expect((await firstResponse.json()).totalXpAwarded).toBe(10);
    expect((await secondResponse.json()).totalXpAwarded).toBe(0);
    expect(syncQuizQuestionTypeProgressMock).toHaveBeenCalledTimes(2);
  });
});
