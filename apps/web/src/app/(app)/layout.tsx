import { DisplayModeOnboardingGate } from"@/components/ui/display-mode-onboarding-gate";
import { getCurrentUserRoleLabel } from"@/lib/authz";
import { getCurrentUserAccountSetupRequirement } from"@/lib/auth/account-setup";
import { getSafeAuthSession } from"@/lib/auth/safe-session";
import { toProfile } from"@/lib/profiles";
import {
 getServerDisplayModePreference,
} from"@/lib/server-preferences";
import { redirect } from"next/navigation";

import { WeatherWarningBar } from"@/components/ui/weather-warning-bar";

export default async function AppLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 const { userId, clerkReachable } = await getSafeAuthSession();
  const accountSetup = userId
    ? await getCurrentUserAccountSetupRequirement().catch(() => ({ requiresSetup: false }))
    : { requiresSetup: false };

  if (accountSetup.requiresSetup) {
    redirect("/onboarding/localisation?next=/profil");
  }

  const { displayMode } = await getServerDisplayModePreference();

  const role = clerkReachable
  ? await getCurrentUserRoleLabel().catch(() =>"anonymous" as const)
  : ("anonymous" as const);
  const currentProfile = toProfile(role);

  return (
 <div
 className="flex min-h-screen w-full flex-col bg-transparent transition-all duration-300"
 data-display-mode={displayMode}
 data-user-profile={currentProfile}
 >
 <WeatherWarningBar />
 {userId ? <DisplayModeOnboardingGate /> : null}

 <div
 className="flex min-w-0 w-full flex-1 flex-col"
 >
 <main className="flex-1">{children}</main>
 </div>
 </div>
 );
}
