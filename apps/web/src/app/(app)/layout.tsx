import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNavigation } from "@/components/navigation/app-navigation";
import { DisplayModeOnboardingGate } from "@/components/ui/display-mode-onboarding-gate";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  getNavigationProfileOverview,
  getNavigationSpacesForProfile,
} from "@/lib/navigation";
import { getProfileLabel, toProfile } from "@/lib/profiles";
import { STORAGE_KEYS, parseDisplayMode } from "@/lib/ui/preferences";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const cookieStore = await cookies();
  const displayMode = parseDisplayMode(
    cookieStore.get(STORAGE_KEYS.displayMode)?.value,
  );

  const role = await getCurrentUserRoleLabel();
  const currentProfile = toProfile(role);
  const isAdmin = role === "admin";
  const profileLabel = getProfileLabel(currentProfile, "fr");
  const spaces = getNavigationSpacesForProfile(currentProfile, displayMode);
  const categoryCount = spaces.length;
  const rubriqueCount = spaces.reduce(
    (acc, space) => acc + space.items.length,
    0,
  );
  const profileOverview = getNavigationProfileOverview(
    currentProfile,
    displayMode,
  );
  const parcoursNavV2Enabled = isFeatureEnabled("parcoursNavV2");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
      <DisplayModeOnboardingGate />

      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            CleanMyMap
          </p>
          <h1 className="text-lg font-semibold text-slate-900">
            Profil {profileLabel.toLowerCase()}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-slate-500">
            {rubriqueCount} pages prioritaires organisees en {categoryCount}{" "}
            espaces ({displayMode})
          </p>
          {parcoursNavV2Enabled ? (
            <Link
              href={profileOverview.primaryCTA.href}
              className="inline-flex rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              {profileOverview.primaryCTA.label.fr}
            </Link>
          ) : null}
          {parcoursNavV2Enabled && profileOverview.secondaryCTA ? (
            <Link
              href={profileOverview.secondaryCTA.href}
              className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              {profileOverview.secondaryCTA.label.fr}
            </Link>
          ) : null}
        </div>
      </header>

      <AppNavigation currentProfile={currentProfile} isAdmin={isAdmin} />

      <main className="mt-4 flex-1">{children}</main>
    </div>
  );
}
