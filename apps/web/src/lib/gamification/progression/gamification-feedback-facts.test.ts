import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GAMIFICATION_RULES_V1 } from "./gamification-rules";
import {
  buildProductFeedbackFacts,
  loadProductFeedbackFacts,
  PRODUCT_FEEDBACK_QUERY_PAGE_SIZE,
} from "./gamification-feedback-facts";
import { computeExpectedGamificationState } from "./gamification-reconstruction";

const userId = "feedback-owner";

function feedbackRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `feedback-${String(index + 1).padStart(2, "0")}`,
    created_at: `2026-10-${String(index + 1).padStart(2, "0")}T10:00:00Z`,
    qualification_decided_at: `2026-10-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
    qualification_status: "accepted",
    report_type: index % 2 === 0 ? "bug" : "improvement",
    status: index === 0 ? "archived" : "treated",
  }));
}

describe("product feedback gamification facts", () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 1],
    [4, 1],
    [5, 2],
    [6, 2],
    [9, 2],
    [10, 3],
    [11, 3],
    [15, 4],
  ])("awards one XP per crossed threshold at count %i", (count, expectedEvents) => {
    const result = buildProductFeedbackFacts(feedbackRows(count));

    expect(result.count).toBe(count);
    expect(result.facts).toHaveLength(expectedEvents);
    expect(result.facts.map((fact) => fact.threshold)).toEqual(
      [1, 5, 10, 15].filter((threshold) => threshold <= count),
    );
  });

  it("deduplicates ids, ignores non-accepted decisions, excludes collaboration, and keeps archived accepted feedback", () => {
    const rows = [
      ...feedbackRows(2),
      { ...feedbackRows(2)[0], qualification_status: "accepted" },
      { id: "pending", created_at: "2026-10-20T10:00:00Z", qualification_status: "pending" },
      { id: "rejected", created_at: "2026-10-21T10:00:00Z", qualification_status: "rejected" },
      { id: "duplicate", created_at: "2026-10-22T10:00:00Z", qualification_status: "duplicate" },
      { id: "collaboration", created_at: "2026-10-23T10:00:00Z", qualification_status: "accepted", report_type: "collaboration" },
    ];

    expect(buildProductFeedbackFacts(rows).count).toBe(2);
  });

  it("rebuilds the same event identities deterministically and removes revoked feedback", () => {
    const accepted = buildProductFeedbackFacts(feedbackRows(5));
    const repeated = buildProductFeedbackFacts([...feedbackRows(5)].reverse());
    const revoked = buildProductFeedbackFacts(feedbackRows(4));

    expect(repeated).toEqual(accepted);
    const acceptedState = computeExpectedGamificationState(userId, {
      userId,
      sourceFacts: accepted.facts,
      progressionCounters: { product_feedback: accepted.count },
    }, GAMIFICATION_RULES_V1);
    const revokedState = computeExpectedGamificationState(userId, {
      userId,
      sourceFacts: revoked.facts,
      progressionCounters: { product_feedback: revoked.count },
    }, GAMIFICATION_RULES_V1);

    expect(acceptedState.events.map((event) => event.sourceId)).toEqual([
      "feedback-01",
      "feedback-05",
    ]);
    expect(acceptedState.events.reduce((total, event) => total + event.xpAwarded, 0)).toBe(2);
    expect(acceptedState.expectedBadges).toEqual(["product-feedback"]);
    expect(revokedState.events).toHaveLength(1);
    expect(revokedState.progressionCounters.product_feedback).toBe(4);
  });

  it("reads every bounded page, keeps stable ordering, and deduplicates ids across a page boundary", async () => {
    const rows = Array.from({ length: PRODUCT_FEEDBACK_QUERY_PAGE_SIZE + 1 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString();
      return {
        id: `feedback-${index + 1}`,
        created_at: date,
        qualification_decided_at: date,
        qualification_status: "accepted",
        report_type: "bug",
        status: "treated",
      };
    });
    rows[PRODUCT_FEEDBACK_QUERY_PAGE_SIZE] = {
      ...rows[0],
      created_at: rows.at(-1)?.created_at ?? rows[0].created_at,
      qualification_decided_at: rows.at(-1)?.qualification_decided_at ?? rows[0].qualification_decided_at,
    };
    const ranges: Array<[number, number]> = [];
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      range: vi.fn(async (from: number, to: number) => {
        ranges.push([from, to]);
        return { data: rows.slice(from, to + 1), error: null };
      }),
    };

    const result = await loadProductFeedbackFacts(
      { from: vi.fn(() => query) } as unknown as SupabaseClient,
      userId,
    );

    expect(ranges).toEqual([[0, 999], [1000, 1999]]);
    expect(query.order).toHaveBeenNthCalledWith(
      1,
      "qualification_decided_at",
      { ascending: true, nullsFirst: false },
    );
    expect(query.order).toHaveBeenNthCalledWith(2, "created_at", { ascending: true });
    expect(query.order).toHaveBeenNthCalledWith(3, "id", { ascending: true });
    expect(result.count).toBe(PRODUCT_FEEDBACK_QUERY_PAGE_SIZE);
  });

  it("propagates an error from an intermediate page instead of treating it as the end", async () => {
    const firstPage = feedbackRows(PRODUCT_FEEDBACK_QUERY_PAGE_SIZE);
    const ranges: Array<[number, number]> = [];
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      range: vi.fn(async (from: number, to: number) => {
        ranges.push([from, to]);
        return from === 0
          ? { data: firstPage, error: null }
          : { data: null, error: { message: "page 2 unavailable" } };
      }),
    };

    await expect(
      loadProductFeedbackFacts(
        { from: vi.fn(() => query) } as unknown as SupabaseClient,
        userId,
      ),
    ).rejects.toThrow("page 2 unavailable");
    expect(ranges).toEqual([[0, 999], [1000, 1999]]);
  });

  it("scopes the source query to the owner, so a reviewer cannot count another user's feedback", async () => {
    const filters: Array<[string, string]> = [];
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((column: string, value: string) => {
        filters.push([column, value]);
        return query;
      }),
      order: vi.fn(() => query),
      range: vi.fn(async () => ({ data: [], error: null })),
    };

    const supabase = { from: vi.fn(() => query) } as unknown as SupabaseClient;
    await loadProductFeedbackFacts(supabase, "reviewer-user");

    expect(filters).toEqual([
      ["submitted_by_user_id", "reviewer-user"],
      ["qualification_status", "accepted"],
    ]);
  });
});
