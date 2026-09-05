import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AccountCompletionPage } from "@/components/account/account-completion-modal";
import { getCurrentUserLocationPreferences } from "@/lib/auth/user-location";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { PROFIL_ROUTE } from "@/lib/accueil-pilotage-routes";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { claimReferralInviteForUser } from "@/lib/gamification/referrals";

export const metadata: Metadata = {
  title: "Bienvenue sur CleanMyMap - Configuration initiale",
  description:
    "Complétez votre profil CleanMyMap en une seule étape: rôle, localisation et mode d'affichage.",
  keywords: ["onboarding", "configuration", "profil", "écologie", "CleanMyMap"],
  robots: {
    index: false,
    follow: false,
  },
};

type OnboardingPageProps = {
  searchParams: Promise<{ next?: string; ref?: string }>;
};

function sanitizeNextPath(nextParam: string | undefined): string {
  if (!nextParam) {
    return PROFIL_ROUTE;
  }
  if (!nextParam.startsWith("/") || nextParam.startsWith("//")) {
    return PROFIL_ROUTE;
  }
  if (nextParam.startsWith("/onboarding")) {
    return PROFIL_ROUTE;
  }
  return nextParam;
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const { userId, clerkReachable } = await getSafeAuthSession();

  if (!userId) {
    redirect("/sign-in");
  }

  const identity = await getCurrentUserIdentity({ userId });
  if (!identity) {
    redirect("/sign-in");
  }

  const resolvedSearchParams = await searchParams;
  const referralCode = resolvedSearchParams.ref?.trim() ?? "";
  const isLocalHost = process.env.NODE_ENV !== "production";

  if (referralCode) {
    const supabase = getSupabaseServerClient(true);
    await claimReferralInviteForUser(supabase, {
      userId,
      code: referralCode,
    }).catch((error) => {
      console.warn("Referral claim failed during onboarding", error);
    });
  }

  const locationPreferences = await getCurrentUserLocationPreferences();
  const profile = identity.activeProfile;
  const nextPath = sanitizeNextPath(resolvedSearchParams.next);

  return (
    <AccountCompletionPage
      nextPath={nextPath}
      submitMode="navigate"
      initialRole={identity.role}
      initialProfile={profile}
      clerkReachable={clerkReachable}
      isLocalHost={isLocalHost}
      initialResidence={locationPreferences.residence}
      initialWork={locationPreferences.work}
    />
  );
}
