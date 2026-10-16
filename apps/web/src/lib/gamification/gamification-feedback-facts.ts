import type { SupabaseClient } from "@supabase/supabase-js";
import { occurredOnFrom } from "./gamification-fact-timestamps";
import { sourceFact } from "./gamification-fact-builders";
import type { GamificationSourceFact } from "./gamification-reconstruction";

const PRODUCT_FEEDBACK_THRESHOLDS = [1, 5, 10] as const;
const PRODUCT_FEEDBACK_TYPES = new Set(["bug", "idea", "improvement"]);
export const PRODUCT_FEEDBACK_QUERY_PAGE_SIZE = 1_000;

type ProductFeedbackRow = {
  id?: string | null;
  created_at?: string | null;
  qualification_decided_at?: string | null;
  qualification_status?: string | null;
  report_type?: string | null;
  status?: string | null;
};

export type ProductFeedbackFacts = {
  count: number;
  facts: GamificationSourceFact[];
};

function feedbackDate(row: ProductFeedbackRow): string {
  return occurredOnFrom(row.qualification_decided_at ?? row.created_at);
}

function canonicalAcceptedFeedbackRows(rows: unknown): ProductFeedbackRow[] {
  if (!Array.isArray(rows)) return [];

  const unique = new Map<string, ProductFeedbackRow>();
  for (const value of rows) {
    if (!value || typeof value !== "object") continue;
    const row = value as ProductFeedbackRow;
    if (
      !row.id ||
      row.qualification_status !== "accepted" ||
      !PRODUCT_FEEDBACK_TYPES.has(row.report_type ?? "")
    ) continue;
    if (!unique.has(row.id)) unique.set(row.id, row);
  }

  return [...unique.values()].sort((left, right) => {
    const leftKey = `${feedbackDate(left)}:${left.created_at ?? ""}:${left.id}`;
    const rightKey = `${feedbackDate(right)}:${right.created_at ?? ""}:${right.id}`;
    return leftKey.localeCompare(rightKey);
  });
}

function thresholdForCount(count: number): number[] {
  const thresholds: number[] = PRODUCT_FEEDBACK_THRESHOLDS.filter((threshold) => threshold <= count);
  for (let threshold = 15; threshold <= count; threshold += 5) {
    thresholds.push(threshold);
  }
  return thresholds;
}

export function buildProductFeedbackFacts(rows: unknown): ProductFeedbackFacts {
  const acceptedRows = canonicalAcceptedFeedbackRows(rows);
  const facts = thresholdForCount(acceptedRows.length).flatMap((threshold) => {
    const feedback = acceptedRows[threshold - 1];
    if (!feedback?.id) return [];
    return [sourceFact({
      mechanicId: "product_feedback",
      eventType: "product_feedback_accepted",
      sourceTable: "community_bug_reports",
      sourceId: feedback.id,
      occurredOn: feedbackDate(feedback),
      xpAwarded: 1,
      threshold,
      badgeId: "product-feedback",
      metadata: {
        feedbackId: feedback.id,
        reportType: feedback.report_type ?? null,
        qualificationStatus: "accepted",
        threshold,
      },
    })];
  });

  return { count: acceptedRows.length, facts };
}

async function loadProductFeedbackRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProductFeedbackRow[]> {
  const rows: ProductFeedbackRow[] = [];

  for (let from = 0; ; from += PRODUCT_FEEDBACK_QUERY_PAGE_SIZE) {
    const result = await supabase
      .from("community_bug_reports")
      .select("id, created_at, report_type, status, qualification_status, qualification_decided_at")
      .eq("submitted_by_user_id", userId)
      .eq("qualification_status", "accepted")
      .order("qualification_decided_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PRODUCT_FEEDBACK_QUERY_PAGE_SIZE - 1);
    if (result.error) throw new Error(result.error.message);

    const page = Array.isArray(result.data)
      ? (result.data as ProductFeedbackRow[])
      : [];
    rows.push(...page);
    if (page.length < PRODUCT_FEEDBACK_QUERY_PAGE_SIZE) break;
  }

  return rows;
}

export async function loadProductFeedbackFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProductFeedbackFacts> {
  return buildProductFeedbackFacts(await loadProductFeedbackRows(supabase, userId));
}

export { PRODUCT_FEEDBACK_THRESHOLDS };
