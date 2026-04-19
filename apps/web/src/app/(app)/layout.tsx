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
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-3 sm:px-5 sm:py-4">
      <DisplayModeOnboardingGate />

      {/* Block Switcher — toujours visible, mobile + desktop */}
      <div className="mb-2">
        <BlockSwitcher currentProfile={currentProfile} />
      </div>

      {/* Corps principal : sidebar + contenu */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Sidebar desktop uniquement */}
        <AppSidebar currentProfile={currentProfile} />

        {/* Zone de contenu */}
        <div className="flex flex-1 flex-col gap-2 min-w-0">
          {/* Breadcrumb sticky */}
          <AppBreadcrumb
            currentProfile={currentProfile}
            profileLabel={profileLabel}
          />

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
