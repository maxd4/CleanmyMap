import type { SupabaseClient } from "@supabase/supabase-js";
import { writeProgressionEventWithPolicy } from "./progression-event-write-policy";
import { clampWeight } from "./progression-utils";
import type { EventInsertParams } from "./progression-types";

export type QuizProgressionEventCandidate = EventInsertParams & {
  metric: "type" | "balance";
  threshold: number;
};

export type QuizProgressionCommitResult = {
  previousCount: number;
  correctCount: number;
  previousBalancedCount: number;
  balancedCount: number;
  insertedEvents: QuizProgressionEventCandidate[];
};

export async function insertProgressionEvent(
  supabase: SupabaseClient,
  params: EventInsertParams,
): Promise<boolean> {
  const result = await writeProgressionEventWithPolicy(
    async () =>
      supabase.from("progression_events").insert({
        user_id: params.userId,
        event_type: params.eventType,
        source_table: params.sourceTable,
        source_id: params.sourceId,
        status_phase: params.statusPhase,
        weight: clampWeight(params.weight),
        xp_base: Math.max(0, params.xpBase),
        xp_awarded: Math.max(0, params.xpAwarded),
        occurred_on: params.occurredOn,
        metadata: params.metadata ?? {},
      }),
    { mode: "strict" },
  );
  return !result.duplicate;
}

/**
 * Atomically advances quiz progress and writes the threshold events that the
 * database observed crossing. The SQL function is an extension of this
 * writer's persistence boundary; threshold calculations remain in the quiz
 * owners and are passed as fully described candidates.
 */
export async function recordQuizProgression(
  supabase: SupabaseClient,
  params: {
    userId: string;
    questionType: string;
    questionTypes: readonly string[];
    events: readonly QuizProgressionEventCandidate[];
  },
): Promise<QuizProgressionCommitResult> {
  const { data, error } = await supabase.rpc("record_quiz_progression", {
    p_user_id: params.userId,
    p_question_type: params.questionType,
    p_question_types: [...params.questionTypes],
    p_events: params.events,
  });
  if (error) {
    throw error;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Quiz progression RPC returned an invalid payload.");
  }

  const payload = data as Record<string, unknown>;
  const numeric = (key: string): number => {
    const value = payload[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      throw new Error(`Quiz progression RPC returned invalid ${key}.`);
    }
    return value;
  };
  const insertedEvents = payload.inserted_events;
  if (!Array.isArray(insertedEvents)) {
    throw new Error("Quiz progression RPC returned invalid inserted events.");
  }

  const candidatesBySourceId = new Map(
    params.events.map((event) => [event.sourceId, event]),
  );
  const resolvedEvents = insertedEvents.map((event) => {
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      throw new Error("Quiz progression RPC returned an invalid event.");
    }
    const sourceId = (event as { source_id?: unknown }).source_id;
    const candidate = typeof sourceId === "string" ? candidatesBySourceId.get(sourceId) : undefined;
    if (!candidate) {
      throw new Error("Quiz progression RPC returned an unknown event.");
    }
    return candidate;
  });

  return {
    previousCount: numeric("previous_count"),
    correctCount: numeric("correct_count"),
    previousBalancedCount: numeric("previous_balanced_count"),
    balancedCount: numeric("balanced_count"),
    insertedEvents: resolvedEvents,
  };
}
