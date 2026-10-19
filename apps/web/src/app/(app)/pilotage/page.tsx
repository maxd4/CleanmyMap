import { redirect } from "next/navigation";
import { getCurrentUserActiveRole, getCurrentUserEffectiveAccess } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { toProfile } from "@/lib/profiles";
import { ADMIN_ROUTE } from "@/lib/accueil-pilotage-routes";
import { getServerLocale } from "@/lib/server-preferences";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import {
  loadPilotageCommunityOperations,
  type PilotageCommunityOperationsState,
} from "@/lib/pilotage/community-operations";
import {
  PilotageLockedPage,
  PilotageOverviewPage,
  PilotageRestrictedPage,
  type PilotageLocale,
} from "@/components/pilotage/pilotage-access-screen";

type PilotageAccessPageProps = {
  searchParams: Promise<{ operations?: string; retry?: string }>;
};

async function loadOverview(userId: string) {
  return loadPilotageOverview({
    periodDays: 30,
    limit: 1800,
    scope: { kind: "organized", userId },
  });
}

export default async function PilotageAccessPage({ searchParams }: PilotageAccessPageProps) {
  const params = await searchParams;
  const requestedOperations = params.operations === "1";
  const retryAttempt = Number.parseInt(params.retry ?? "0", 10);
  const nextRetryAttempt = Number.isFinite(retryAttempt) && retryAttempt >= 0
    ? Math.min(retryAttempt + 1, 999_999)
    : 1;
  const communityOperationsRetryHref = `/pilotage?operations=1&retry=${nextRetryAttempt}`;
  const { userId, clerkReachable } = await getSafeAuthSession();
  const locale = (await getServerLocale()) as PilotageLocale;

  if (!clerkReachable) {
    return <PilotageLockedPage locale={locale} isAuthenticated={false} authUnavailable />;
  }

  const role = userId
    ? await getCurrentUserActiveRole().catch(() => "anonymous" as const)
    : ("anonymous" as const);
  const profile = toProfile(role);
  const effectiveAccess = userId
    ? await getCurrentUserEffectiveAccess().catch(() => null)
    : null;

  if (userId && profile === "admin") {
    redirect(ADMIN_ROUTE);
  }

  if (!userId) {
    return <PilotageLockedPage locale={locale} isAuthenticated={false} />;
  }

  if (!effectiveAccess?.canAccessPilotage) {
    return <PilotageRestrictedPage locale={locale} profile={profile} />;
  }

  const overview = await loadOverview(userId).catch(() => null);
  const communityOperations = requestedOperations && overview
    ? await loadPilotageCommunityOperations(overview.contracts, userId).catch(() => null)
    : null;
  const communityOperationsState: PilotageCommunityOperationsState =
    !requestedOperations
      ? "NOT_REQUESTED"
      : communityOperations
        ? "AVAILABLE"
        : "UNAVAILABLE";
  return (
    <PilotageOverviewPage
      locale={locale}
      profile={profile}
      overview={overview}
      communityOperations={communityOperations}
      communityOperationsState={communityOperationsState}
      communityOperationsRetryHref={communityOperationsRetryHref}
    />
  );
}
