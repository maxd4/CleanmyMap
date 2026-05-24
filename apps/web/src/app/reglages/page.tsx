import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings, User, Bell, Eye, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getCurrentUserIdentity } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getServerDisplayMode, getServerLocale } from "@/lib/server-preferences";
import { DisplayNameModeSetting } from "@/components/account/display-name-mode-setting";

export const metadata: Metadata = {
  title: "Réglages - CleanMyMap",
  description: "Configurez vos préférences CleanMyMap : notifications, affichage, localisation et paramètres de compte.",
  keywords: ["réglages", "paramètres", "préférences", "configuration", "CleanMyMap"],
  robots: {
    index: false, // Page privée
    follow: false,
  },
};

export default async function ReglagesPage() {
  const { userId } = await getSafeAuthSession();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const [identity, displayMode, locale] = await Promise.all([
    getCurrentUserIdentity(),
    getServerDisplayMode(),
    getServerLocale(),
  ]);

  const isFrench = locale === "fr";
  const displayNameMode = identity?.displayNameMode ?? "full_name";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_rgba(186,230,253,0.45)_0%,_rgba(255,255,255,0.96)_52%,_rgba(248,250,252,1)_100%)] px-4 py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute -right-16 bottom-20 h-80 w-80 rounded-full bg-cyan-400/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        {/* Navigation de retour */}
        <div className="mb-8">
          <Link
            href="/profil"
            className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition-colors hover:text-sky-950"
          >
            <ArrowLeft className="h-4 w-4" />
            {isFrench ? "Retour au profil" : "Back to profile"}
          </Link>
        </div>

        <div className="space-y-8">
          {/* En-tête */}
          <header className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-700">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                  {isFrench ? "Configuration" : "Configuration"}
                </p>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                  {isFrench ? "Réglages" : "Settings"}
                </h1>
              </div>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-slate-600">
              {isFrench
                ? "Personnalisez votre expérience CleanMyMap selon vos préférences et besoins."
                : "Customize your CleanMyMap experience according to your preferences and needs."}
            </p>
          </header>

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
                    {isFrench ? "Profil et compte" : "Profile and account"}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {isFrench ? "Informations personnelles" : "Personal information"}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {isFrench ? "Nom d'affichage" : "Display name"}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {identity?.displayName || (isFrench ? "Non défini" : "Not set")}
                  </p>
                </div>

                <DisplayNameModeSetting
                  currentMode={displayNameMode}
                  displayName={identity?.displayName || (isFrench ? "Non défini" : "Not set")}
                  userId={identity?.userId || "unknown"}
                  locale={locale as "fr" | "en"}
                />
                
                <Link
                  href="/profil"
                  className="block rounded-xl border border-sky-100 bg-white/80 p-4 transition-colors hover:border-sky-200 hover:bg-sky-50/70"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {isFrench ? "Gérer le profil complet" : "Manage full profile"}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {isFrench ? "Badges, progression, statistiques" : "Badges, progress, statistics"}
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
                    {isFrench ? "Affichage" : "Display"}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {isFrench ? "Interface et navigation" : "Interface and navigation"}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="rounded-xl border border-sky-100 bg-white/80 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {isFrench ? "Mode d'affichage" : "Display mode"}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {displayMode === "exhaustif" 
                      ? (isFrench ? "Exhaustif (toutes les options)" : "Exhaustive (all options)")
                      : (isFrench ? "Essentiel (options principales)" : "Essential (main options)")
                    }
                  </p>
                </div>
                
                <div className="rounded-xl border border-sky-100 bg-white/80 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {isFrench ? "Langue" : "Language"}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {locale === "fr" ? "Français" : "English"}
                  </p>
                </div>
              </div>
            </section>

            {/* Notifications */}
            <section className="rounded-[2rem] border border-sky-200/60 bg-white/82 p-6 shadow-[0_18px_50px_-40px_rgba(14,165,233,0.35)] backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {isFrench ? "Notifications" : "Notifications"}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {isFrench ? "Alertes et rappels" : "Alerts and reminders"}
                  </p>
                </div>
              </div>
              
              <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50/60 p-4">
                <p className="text-sm font-medium text-slate-600 text-center">
                  {isFrench 
                    ? "Section réservée pour une prochaine phase"
                    : "Reserved section for a later phase"}
                </p>
              </div>
            </section>

            {/* Localisation */}
            <section className="rounded-[2rem] border border-sky-200/60 bg-white/82 p-6 shadow-[0_18px_50px_-40px_rgba(14,165,233,0.35)] backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {isFrench ? "Localisation" : "Location"}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {isFrench ? "Zone d'action préférée" : "Preferred action area"}
                  </p>
                </div>
              </div>
              
              <Link
                href="/onboarding/localisation"
                className="block rounded-xl border border-sky-100 bg-white/80 p-4 transition-colors hover:border-sky-200 hover:bg-sky-50/70"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {isFrench ? "Modifier la localisation" : "Change location"}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {isFrench 
                    ? "Arrondissement et type de zone d'intervention"
                    : "District and intervention area type"}
                </p>
              </Link>
            </section>
          </div>

          {/* Actions rapides */}
          <section className="rounded-[2rem] border border-sky-200/60 bg-white/82 p-6 shadow-[0_18px_50px_-40px_rgba(14,165,233,0.35)] backdrop-blur-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {isFrench ? "Actions rapides" : "Quick actions"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/70 p-4 transition-colors hover:border-sky-200 hover:bg-sky-100/70"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {isFrench ? "Tableau de bord" : "Dashboard"}
                  </p>
                </div>
              </Link>
              
              <Link
                href="/profil"
                className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/70 p-4 transition-colors hover:border-sky-200 hover:bg-sky-100/70"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {isFrench ? "Mon profil" : "My profile"}
                  </p>
                </div>
              </Link>
              
              <Link
                href="/accueil"
                className="flex items-center gap-3 rounded-xl border border-sky-100 bg-amber-50/70 p-4 transition-colors hover:border-amber-200 hover:bg-amber-100/70"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <ArrowLeft className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {isFrench ? "Accueil" : "Home"}
                  </p>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
