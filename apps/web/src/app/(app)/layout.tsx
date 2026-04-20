import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { AppBreadcrumb } from "@/components/navigation/app-breadcrumb";
import { BlockSwitcher } from "@/components/navigation/block-switcher";
import { DisplayModeOnboardingGate } from "@/components/ui/display-mode-onboarding-gate";
import { getCurrentUserLocationPreference } from "@/lib/auth/user-location";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getProfileLabel, toProfile } from "@/lib/profiles";
import { getServerLocale } from "@/lib/server-preferences";
import { STORAGE_KEYS, parseDisplayMode } from "@/lib/ui/preferences";

import { WeatherWarningBar } from "@/components/ui/weather-warning-bar";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const locationPreference = await getCurrentUserLocationPreference();
  if (!locationPreference) redirect("/onboarding/localisation");

  const cookieStore = await cookies();
  const displayMode = parseDisplayMode(
    cookieStore.get(STORAGE_KEYS.displayMode)?.value,
  );

  const locale = await getServerLocale();
  const role = await getCurrentUserRoleLabel();
  const currentProfile = toProfile(role);
  const profileLabel = getProfileLabel(currentProfile, locale);

  return (
    <div 
      className="flex min-h-screen w-full flex-col px-4 py-3 sm:px-8 sm:py-4 bg-slate-50/30 transition-all duration-300"
      data-display-mode={displayMode}
      data-user-profile={currentProfile}
    >
      <WeatherWarningBar />
      <DisplayModeOnboardingGate />

      {/* Block Switcher — toujours visible, mobile + desktop */}
      <div className="mb-4">
        <BlockSwitcher currentProfile={currentProfile} />
      </div>

      {/* Corps principal : Pleine largeur sans sidebar */}
      <div className="flex flex-1 flex-col gap-2 min-w-0">
        {/* Breadcrumb sticky */}
        <AppBreadcrumb
          currentProfile={currentProfile}
          profileLabel={profileLabel}
        />

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
