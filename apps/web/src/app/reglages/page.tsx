import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings, User, Eye, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getServerLocale } from "@/lib/server-preferences";
import { DisplayNameModeSetting } from "@/components/account/display-name-mode-setting";
import { AccountSettingsSection } from "@/components/account/account-settings-section";
import { SitePreferencesControls } from "@/components/ui/site-preferences-controls";
import { PageHeader } from "@/components/ui/page-header";
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";
import { HOME_ROUTE } from "@/lib/home-routes";
import { DASHBOARD_ROUTE, PROFIL_ROUTE } from "@/lib/accueil-pilotage-routes";
import { resolvePageFamily } from "@/lib/ui/page-families";

export const metadata: Metadata = {
  title: "Réglages",
  description: "Configurez vos préférences CleanMyMap : affichage, localisation et paramètres de compte.",
  keywords: ["réglages", "paramètres", "préférences", "configuration", "CleanMyMap"],
  robots: {
    index: false, // Page privée
    follow: false,
  },
};

const REGLAGES_COPY = {
  fr: {
    title: "Réglages",
    subtitle: "Personnalisez votre expérience CleanMyMap selon vos préférences et besoins.",
    back: "Retour au profil",
    profileAccount: "Profil et compte",
    personalInfo: "Informations personnelles",
    displayName: "Nom d'affichage",
    notDefined: "Non défini",
    manageProfile: "Gérer le profil complet",
    profileDetails: "Badges, progression, statistiques",
    display: "Affichage",
    displayDetails: "Interface et navigation",
    location: "Localisation",
    locationDetails: "Zone d'action préférée",
    changeLocation: "Modifier la localisation",
    locationActionDetails: "Arrondissement et type de zone d'intervention",
    quickActions: "Actions rapides",
    dashboard: "Mon espace",
    profile: "Mon profil",
    home: "Accueil",
  },
  en: {
    title: "Settings",
    subtitle: "Customize your CleanMyMap experience according to your preferences and needs.",
    back: "Back to profile",
    profileAccount: "Profile and account",
    personalInfo: "Personal information",
    displayName: "Display name",
    notDefined: "Not set",
    manageProfile: "Manage full profile",
    profileDetails: "Badges, progress, statistics",
    display: "Display",
    displayDetails: "Interface and navigation",
    location: "Location",
    locationDetails: "Preferred action area",
    changeLocation: "Change location",
    locationActionDetails: "District and intervention area type",
    quickActions: "Quick actions",
    dashboard: "Dashboard",
    profile: "My profile",
    home: "Home",
  },
} as const;

export default async function ReglagesPage() {
  const { userId } = await getSafeAuthSession();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const [identity, locale] = await Promise.all([
    getCurrentUserIdentity(),
    getServerLocale(),
  ]);

  const copy = REGLAGES_COPY[locale];
  const displayNameMode = identity?.displayNameMode ?? "full_name";
  const displayName = identity?.displayName || copy.notDefined;
  const pageFamily = resolvePageFamily("/reglages");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_rgba(186,230,253,0.45)_0%,_rgba(255,255,255,0.96)_52%,_rgba(248,250,252,1)_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute -right-16 bottom-20 h-80 w-80 rounded-full bg-cyan-400/8 blur-3xl" />
      </div>

      <CmmPageLayout>
          <PageHeader
            family={pageFamily}
            title={copy.title}
            subtitle={copy.subtitle}
            action={
              <Link
                href={PROFIL_ROUTE}
                className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2.5 text-sm font-black text-sky-800 transition hover:-translate-y-[1px] hover:bg-sky-50"
              >
                <ArrowLeft className="h-4 w-4" />
                {copy.back}
              </Link>
            }
          />

          <CmmSectionGroup>
          {/* Sections de réglages */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Profil et compte */}
            <section className="rounded-[2rem] border border-sky-200/60 bg-white/82 p-6 shadow-[0_18px_50px_-40px_rgba(14,165,233,0.35)] backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {copy.profileAccount}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {copy.personalInfo}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {copy.displayName}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {displayName}
                  </p>
                </div>

                <DisplayNameModeSetting
                  currentMode={displayNameMode}
                  displayName={displayName}
                  userId={identity?.userId || "unknown"}
                  locale={locale as "fr" | "en"}
                />
                
                <Link
                  href={PROFIL_ROUTE}
                  className="block rounded-xl border border-sky-100 bg-white/80 p-4 transition-colors hover:border-sky-200 hover:bg-sky-50/70"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {copy.manageProfile}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {copy.profileDetails}
                  </p>
                </Link>
              </div>
            </section>

            {/* Affichage */}
            <section className="rounded-[2rem] border border-sky-200/60 bg-white/82 p-6 shadow-[0_18px_50px_-40px_rgba(14,165,233,0.35)] backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {copy.display}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {copy.displayDetails}
                  </p>
                </div>
              </div>
              
              <SitePreferencesControls surface="light" />
            </section>

            {/* Localisation */}
            <section className="rounded-[2rem] border border-sky-200/60 bg-white/82 p-6 shadow-[0_18px_50px_-40px_rgba(14,165,233,0.35)] backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {copy.location}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {copy.locationDetails}
                  </p>
                </div>
              </div>
              
              <Link
                href="/onboarding/localisation"
                className="block rounded-xl border border-sky-100 bg-white/80 p-4 transition-colors hover:border-sky-200 hover:bg-sky-50/70"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {copy.changeLocation}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {copy.locationActionDetails}
                </p>
              </Link>
            </section>
          </div>

          <AccountSettingsSection locale={locale} />

          {/* Actions rapides */}
          <section className="rounded-[2rem] border border-sky-200/60 bg-white/82 p-6 shadow-[0_18px_50px_-40px_rgba(14,165,233,0.35)] backdrop-blur-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {copy.quickActions}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href={DASHBOARD_ROUTE}
                className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/70 p-4 transition-colors hover:border-sky-200 hover:bg-sky-100/70"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {copy.dashboard}
                  </p>
                </div>
              </Link>
              
              <Link
                href={PROFIL_ROUTE}
                className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/70 p-4 transition-colors hover:border-sky-200 hover:bg-sky-100/70"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {copy.profile}
                  </p>
                </div>
              </Link>
              
              <Link
                href={HOME_ROUTE}
                className="flex items-center gap-3 rounded-xl border border-sky-100 bg-amber-50/70 p-4 transition-colors hover:border-amber-200 hover:bg-amber-100/70"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <ArrowLeft className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {copy.home}
                  </p>
                </div>
              </Link>
            </div>
          </section>
          </CmmSectionGroup>
      </CmmPageLayout>
    </main>
  );
}
