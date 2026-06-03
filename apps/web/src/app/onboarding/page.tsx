import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { AccountSetupForm } from "@/components/account/account-setup-form";
import { getCurrentUserLocationPreference } from "@/lib/auth/user-location";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { isLocalhostHost } from "@/lib/auth/dev-auth";
import { toProfile } from "@/lib/profiles";
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

  const requestHeaders = await headers();
  const isLocalHost = isLocalhostHost(requestHeaders.get("host"));
  const resolvedSearchParams = await searchParams;
  const referralCode = resolvedSearchParams.ref?.trim() ?? "";

  if (referralCode) {
    const supabase = getSupabaseServerClient(true);
    await claimReferralInviteForUser(supabase, {
      userId,
      code: referralCode,
    }).catch((error) => {
      console.warn("Referral claim failed during onboarding", error);
    });
  }

  const [existingPreference, role] = await Promise.all([
    getCurrentUserLocationPreference(),
    getCurrentUserRoleLabel(),
  ]);
  const profile = toProfile(role);
  const nextPath = sanitizeNextPath(resolvedSearchParams.next);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_rgba(219,234,254,0.72)_0%,_rgba(232,233,255,0.84)_36%,_rgba(206,250,225,0.9)_70%,_rgba(245,247,250,1)_100%)] px-4 py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-10 h-72 w-72 rounded-full bg-indigo-400/14 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-violet-400/12 blur-3xl" />
        <div className="absolute bottom-12 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-400/12 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center">
        <section className="w-full space-y-6 rounded-[2.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.92)_0%,rgba(30,41,59,0.9)_44%,rgba(88,28,135,0.86)_100%)] p-4 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.6)] backdrop-blur-2xl sm:p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-emerald-200/90">
                Configuration initiale
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                    Complétez votre profil en une seule étape
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-violet-100/78 sm:text-base">
                    Choisissez votre rôle, votre lieu principal et votre mode
                    d&apos;affichage. La localisation, le compte et les réglages
                    de départ vivent désormais sur cette page unique.
                  </p>
                </div>
              </div>
            </div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-violet-100/78">
              Auth & Onboarding
            </div>
          </div>

          <AccountSetupForm
            nextPath={nextPath}
            submitMode="navigate"
            initialProfile={profile}
            clerkReachable={clerkReachable}
            isLocalHost={isLocalHost}
            initialArrondissement={existingPreference?.arrondissement ?? null}
            initialLocationType={existingPreference?.locationType ?? null}
          />
        </section>
      </div>
    </main>
  );
}
