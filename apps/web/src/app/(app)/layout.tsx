import { AppNavigationRibbon } from "@/components/navigation/app-navigation-ribbon";
import { DisplayModeOnboardingGate } from "@/components/ui/display-mode-onboarding-gate";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getProfileLabel, toProfile } from "@/lib/profiles";
import {
  getServerDisplayModePreference,
  getServerLocale,
} from "@/lib/server-preferences";

import { WeatherWarningBar } from "@/components/ui/weather-warning-bar";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId, clerkReachable } = await getSafeAuthSession();

  const identity = await getCurrentUserIdentity();
  const { displayMode } = await getServerDisplayModePreference();

  const locale = await getServerLocale();
  const role = clerkReachable
    ? await getCurrentUserRoleLabel().catch(() => "anonymous" as const)
    : ("anonymous" as const);
  const currentProfile = toProfile(role);
  const profileLabel = userId
    ? getProfileLabel(currentProfile, locale)
    : locale === "fr"
      ? "Visiteur"
      : "Visitor";

  return (
    <div
      className="flex min-h-screen w-full flex-col bg-slate-50/30 transition-all duration-300"
      data-display-mode={displayMode}
      data-user-profile={currentProfile}
    >
      <WeatherWarningBar />
      {userId ? <DisplayModeOnboardingGate /> : null}

      <AppNavigationRibbon
        currentProfile={currentProfile}
        profileLabel={profileLabel}
        identity={identity}
      />

      <div
        className="flex min-w-0 w-full flex-1 flex-col gap-2 px-4 py-3 pb-12 sm:px-6 sm:py-4 sm:pb-16 xl:px-10 2xl:px-12"
      >
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
