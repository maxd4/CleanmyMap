import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { fetchCachedReferralSummary } from "@/lib/gamification/referrals-cache";
import { loadUserLevelRankingSummary } from "@/lib/gamification/progression-data";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { getServerDisplayMode } from "@/lib/server-preferences";
import { toProfile } from "@/lib/profiles";

type DashboardOverviewResult =
  | {
      status: "ok";
      overview: Awaited<ReturnType<typeof loadPilotageOverview>>;
    }
  | {
      status: "error";
      message: string;
    };

async function loadDashboardOverviewResult(
  locale: "fr" | "en",
): Promise<DashboardOverviewResult> {
  try {
    const overview = await loadPilotageOverview({
      periodDays: 30,
      limit: 1800,
    });
    return { status: "ok", overview };
  } catch {
    return {
      status: "error",
      message:
        locale === "fr"
          ? "Les données de Mon espace sont momentanément indisponibles."
          : "Dashboard data is temporarily unavailable.",
    };
  }
}

export async function loadDashboardPageData({
  userId,
  clerkReachable,
  locale,
}: {
  userId: string;
  clerkReachable: boolean;
  locale: "fr" | "en";
}) {
  const accountCompletion = await loadAccountCompletionGateState({
    userId,
    clerkReachable,
  }).catch(() => null);

  const [identity, role, displayMode] = await Promise.all([
    accountCompletion
      ? Promise.resolve(null)
      : getCurrentUserIdentity({ userId }).catch(() => null),
    accountCompletion
      ? Promise.resolve(accountCompletion.role)
      : getCurrentUserRoleLabel().catch(() => "benevole" as const),
    getServerDisplayMode(),
  ]);
  const [userLevelRanking, referralSummary] = await Promise.all([
    loadUserLevelRankingSummary(userId),
    fetchCachedReferralSummary(userId).catch(() => null),
  ]);

  return {
    accountCompletion,
    displayMode,
    profile: accountCompletion?.currentProfile ?? identity?.activeProfile ?? toProfile(role),
    userLevelRanking,
    referralSummary,
    overviewPromise: loadDashboardOverviewResult(locale),
  };
}

export type DashboardPageData = Awaited<
  ReturnType<typeof loadDashboardPageData>
>;
