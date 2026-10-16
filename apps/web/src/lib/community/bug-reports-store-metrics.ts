import {
  assertPersistenceAvailable,
  canUseSupabaseServerPersistence,
} from "@/lib/persistence/runtime-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CommunityBugReportFollowUpMetrics } from "./bug-reports-store-contract";
import { readStore } from "./bug-reports-store-persistence";

export async function loadCommunityBugReportFollowUpMetrics(): Promise<CommunityBugReportFollowUpMetrics> {
  assertPersistenceAvailable("community_bug_reports");

  if (canUseSupabaseServerPersistence()) {
    const supabase = getSupabaseServerClient(true);
    const [received, pendingQualification, accepted, duplicate, rejected, shipped] =
      await Promise.all([
        supabase.from("community_bug_reports").select("id", { count: "exact", head: true }),
        supabase.from("community_bug_reports").select("id", { count: "exact", head: true }).eq("qualification_status", "pending"),
        supabase.from("community_bug_reports").select("id", { count: "exact", head: true }).eq("qualification_status", "accepted"),
        supabase.from("community_bug_reports").select("id", { count: "exact", head: true }).eq("qualification_status", "duplicate"),
        supabase.from("community_bug_reports").select("id", { count: "exact", head: true }).eq("qualification_status", "rejected"),
        supabase.from("community_bug_reports").select("id", { count: "exact", head: true }).eq("tracking_status", "shipped"),
      ]);
    const results = [received, pendingQualification, accepted, duplicate, rejected, shipped];
    const failure = results.find((result) => result.error);
    if (failure?.error) throw new Error(failure.error.message);
    return {
      received: received.count ?? 0,
      pendingQualification: pendingQualification.count ?? 0,
      accepted: accepted.count ?? 0,
      duplicate: duplicate.count ?? 0,
      rejected: rejected.count ?? 0,
      shipped: shipped.count ?? 0,
      period: "all_time",
      scope: "community_bug_reports",
    };
  }

  const store = await readStore();
  return store.records.reduce<CommunityBugReportFollowUpMetrics>(
    (metrics, record) => {
      metrics.received += 1;
      const qualificationStatus = record.qualificationStatus ?? "pending";
      if (qualificationStatus === "pending") metrics.pendingQualification += 1;
      if (qualificationStatus === "accepted") metrics.accepted += 1;
      if (qualificationStatus === "duplicate") metrics.duplicate += 1;
      if (qualificationStatus === "rejected") metrics.rejected += 1;
      if (record.tracking?.status === "shipped") metrics.shipped += 1;
      return metrics;
    },
    {
      received: 0,
      pendingQualification: 0,
      accepted: 0,
      duplicate: 0,
      rejected: 0,
      shipped: 0,
      period: "all_time",
      scope: "community_bug_reports",
    },
  );
}
