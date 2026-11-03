import { describe, expect, it, vi } from "vitest";
import {
  recordQuizProgression,
  type QuizProgressionEventCandidate,
} from "./progression-event-writer";

function candidate(overrides: Partial<QuizProgressionEventCandidate> = {}): QuizProgressionEventCandidate {
  return {
    metric: "type",
    threshold: 50,
    userId: "user-1",
    eventType: "quiz_question_type_milestone",
    sourceTable: "quiz_type_progress",
    sourceId: "quiz:vrai-faux-piegeux:50",
    statusPhase: "validated",
    weight: 1,
    xpBase: 2,
    xpAwarded: 2,
    occurredOn: "2026-10-28",
    metadata: { threshold: 50, questionId: "question-1" },
    ...overrides,
  };
}

function rpcPayload(overrides: Record<string, unknown> = {}) {
  return {
    previous_count: 49,
    correct_count: 50,
    previous_balanced_count: 9,
    balanced_count: 10,
    inserted_events: [
      {
        source_id: "quiz:vrai-faux-piegeux:50",
        event_type: "quiz_question_type_milestone",
        source_table: "quiz_type_progress",
        status_phase: "validated",
      },
    ],
    ...overrides,
  };
}

describe("recordQuizProgression RPC boundary", () => {
  it("projects candidates to the snake_case RPC contract without losing metadata", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: rpcPayload(), error: null });
    const event = candidate();

    const result = await recordQuizProgression({ rpc } as never, {
      userId: "user-1",
      questionType: "vrai-faux-piegeux",
      questionTypes: ["vrai-faux-piegeux", "situations-terrain"],
      events: [event],
    });

    expect(result.insertedEvents).toEqual([event]);
    expect(rpc).toHaveBeenCalledWith("record_quiz_progression", {
      p_user_id: "user-1",
      p_question_type: "vrai-faux-piegeux",
      p_question_types: ["vrai-faux-piegeux", "situations-terrain"],
      p_events: [{
        metric: "type",
        threshold: 50,
        user_id: "user-1",
        event_type: "quiz_question_type_milestone",
        source_table: "quiz_type_progress",
        source_id: "quiz:vrai-faux-piegeux:50",
        status_phase: "validated",
        weight: 1,
        xp_base: 2,
        xp_awarded: 2,
        occurred_on: "2026-10-28",
        metadata: { threshold: 50, questionId: "question-1" },
      }],
    });

    const submittedEvent = rpc.mock.calls[0]?.[1].p_events[0] as Record<string, unknown>;
    expect(Object.keys(submittedEvent).sort()).toEqual([
      "event_type",
      "metadata",
      "metric",
      "occurred_on",
      "source_id",
      "source_table",
      "status_phase",
      "threshold",
      "user_id",
      "weight",
      "xp_awarded",
      "xp_base",
    ]);
    expect(submittedEvent).not.toHaveProperty("userId");
    expect(submittedEvent).not.toHaveProperty("sourceId");
    expect(submittedEvent).not.toHaveProperty("xpAwarded");
  });

  it("resolves inserted events by the complete logical identity", async () => {
    const first = candidate();
    const second = candidate({
      eventType: "quiz_question_type_balance_milestone",
      sourceTable: "quiz_type_balance_progress",
      sourceId: first.sourceId,
      statusPhase: "validated",
      metric: "balance",
      threshold: 10,
    });
    const rpc = vi.fn().mockResolvedValue({
      data: rpcPayload({
        inserted_events: [{
          source_id: second.sourceId,
          event_type: second.eventType,
          source_table: second.sourceTable,
          status_phase: second.statusPhase,
        }],
      }),
      error: null,
    });

    const result = await recordQuizProgression({ rpc } as never, {
      userId: "user-1",
      questionType: "vrai-faux-piegeux",
      questionTypes: ["vrai-faux-piegeux"],
      events: [first, second],
    });

    expect(result.insertedEvents).toEqual([second]);
  });

  it.each([
    ["unknown source", { source_id: "not-a-candidate" }],
    ["incoherent event type", { event_type: "quiz_question_type_balance_milestone" }],
    ["incoherent source table", { source_table: "other_table" }],
    ["incoherent status phase", { status_phase: "pending" }],
  ])("rejects an %s returned event", async (_label, returnedFields) => {
    const rpc = vi.fn().mockResolvedValue({
      data: rpcPayload({ inserted_events: [{
        source_id: "quiz:vrai-faux-piegeux:50",
        event_type: "quiz_question_type_milestone",
        source_table: "quiz_type_progress",
        status_phase: "validated",
        ...returnedFields,
      }] }),
      error: null,
    });

    await expect(recordQuizProgression({ rpc } as never, {
      userId: "user-1",
      questionType: "vrai-faux-piegeux",
      questionTypes: ["vrai-faux-piegeux"],
      events: [candidate()],
    })).rejects.toThrow("unknown event");
  });

  it("propagates an RPC error before any consumer-side effect can run", async () => {
    const rpcError = new Error("transaction failed");
    const rpc = vi.fn().mockResolvedValue({ data: null, error: rpcError });

    await expect(recordQuizProgression({ rpc } as never, {
      userId: "user-1",
      questionType: "vrai-faux-piegeux",
      questionTypes: ["vrai-faux-piegeux"],
      events: [candidate()],
    })).rejects.toBe(rpcError);
  });
});
