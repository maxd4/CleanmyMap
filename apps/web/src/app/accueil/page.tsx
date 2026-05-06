import { auth } from "@clerk/nextjs/server";
import { LayoutDashboard, LogIn, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { getServerDisplayMode, getServerLocale } from "@/lib/server-preferences";
import { getProfileLabel, toProfile } from "@/lib/profiles";
import { HomepageStatsWidget } from "@/components/sections/rubriques/homepage-stats-widget";

export default async function AccueilPage() {
  const { userId } = await auth();
  const locale = await getServerLocale();
  const displayMode = await getServerDisplayMode();
  const isFrench = locale === "fr";

  let displayName = isFrench ? "Visiteur" : "Visitor";
  let profileLabel = isFrench ? "Profil non connecté" : "Signed-out profile";
  let currentLevel: number | null = null;
  let badgeCount: number | null = null;

  if (userId) {
    const [identity, role] = await Promise.all([
      getCurrentUserIdentity(),
      getCurrentUserRoleLabel(),
    ]);
    const profile = toProfile(role);
    displayName = identity?.displayName?.trim() || displayName;
    profileLabel = getProfileLabel(profile, locale);
    currentLevel = identity?.currentLevel ?? null;
    badgeCount = identity?.badges.length ?? 0;
  }

  return (
    <main
      data-section="accueil"
      className="relative overflow-hidden bg-[linear-gradient(180deg,rgba(58,36,18,0.94),rgba(72,45,20,0.98))] px-4 py-6 text-white sm:px-6 lg:px-8"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/30 to-transparent" />
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-amber-400/12 blur-3xl" />
        <div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-500/8 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="space-y-3 pt-2">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-100/70">
            Bloc Accueil
          </p>
          <div className="max-w-3xl space-y-3">
            <h1 className="text-[clamp(2.2rem,4vw,4rem)] font-black leading-[1.02] tracking-[-0.04em]">
              Où j&apos;en suis
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-white/78 sm:text-base">
              Reprendre le fil, vérifier son périmètre et repartir vers l&apos;action
              utile sans passer par Explorer.
            </p>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <article className="rounded-[1.75rem] border border-orange-300/22 bg-[rgba(97,61,29,0.78)] p-5 shadow-[0_24px_56px_-32px_rgba(249,115,22,0.30)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-orange-100/72">
                  Contexte
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-white">
                  {isFrench ? "Reprise de session" : "Session recap"}
                </h2>
              </div>
              <div className="rounded-full border border-orange-200/18 bg-[rgba(120,78,34,0.72)] px-3 py-1.5 text-xs font-semibold text-orange-50/92">
                {isFrench ? "Mode" : "Mode"}: {displayMode}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-orange-200/16 bg-[rgba(120,78,34,0.62)] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-100/60">
                  {isFrench ? "Statut" : "Status"}
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {userId ? (isFrench ? "Connecté" : "Signed in") : isFrench ? "Visite libre" : "Guest view"}
                </p>
              </div>
              <div className="rounded-2xl border border-orange-200/16 bg-[rgba(120,78,34,0.62)] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-100/60">
                  {isFrench ? "Profil" : "Profile"}
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{profileLabel}</p>
              </div>
              <div className="rounded-2xl border border-orange-200/16 bg-[rgba(120,78,34,0.62)] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-100/60">
                  {isFrench ? "Progression" : "Progress"}
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {currentLevel ? `Niveau ${currentLevel}` : isFrench ? "Non disponible" : "Unavailable"}
                </p>
                <p className="mt-1 text-xs text-white/68">
                  {badgeCount !== null
                    ? `${badgeCount} ${isFrench ? "badge" : "badge"}${badgeCount > 1 ? "s" : ""}`
                    : isFrench
                      ? "Aucun badge affiché"
                      : "No badges shown"}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-orange-200/14 bg-[rgba(120,78,34,0.52)] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-100/60">
                {isFrench ? "Prochaine étape" : "Next step"}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/78">
                {userId
                  ? isFrench
                    ? "Ouvrez le tableau de bord pour lire les alertes, puis consultez votre profil pour suivre l&apos;impact et les repères personnels."
                    : "Open the dashboard to review alerts, then check your profile to follow impact and personal progress."
                  : isFrench
                    ? "Connectez-vous pour retrouver votre contexte, votre progression et vos raccourcis utiles."
                    : "Sign in to recover your context, progress and useful shortcuts."}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-orange-200/18 bg-[rgba(120,78,34,0.78)] px-4 text-sm font-bold text-orange-50 transition-colors hover:border-orange-200/35 hover:bg-[rgba(140,92,40,0.86)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/40"
              >
                <LayoutDashboard className="h-4 w-4" />
                {isFrench ? "Tableau de bord" : "Dashboard"}
              </Link>
              <Link
                href="/profil"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-orange-200/18 bg-[rgba(120,78,34,0.66)] px-4 text-sm font-bold text-orange-50 transition-colors hover:border-orange-200/35 hover:bg-[rgba(140,92,40,0.78)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/40"
              >
                <UserRound className="h-4 w-4" />
                {isFrench ? "Profil & impact" : "Profile & impact"}
              </Link>
              {!userId ? (
                <Link
                  href="/sign-in"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-orange-200/18 bg-[rgba(97,61,29,0.88)] px-4 text-sm font-bold text-orange-50 transition-colors hover:border-orange-200/35 hover:bg-[rgba(120,78,34,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/40"
                >
                  <LogIn className="h-4 w-4" />
                  {isFrench ? "Se connecter" : "Sign in"}
                </Link>
              ) : null}
            </div>
          </article>

          <aside className="space-y-4">
            <article className="rounded-[1.5rem] border border-orange-300/22 bg-[rgba(78,49,22,0.84)] p-5 shadow-[0_18px_44px_-30px_rgba(249,115,22,0.24)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-200/18 bg-[rgba(120,78,34,0.72)] text-orange-100">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-100/60">
                    {isFrench ? "Lecture rapide" : "Quick read"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {displayName}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/74">
                {isFrench
                  ? "Cet écran sert à reprendre la main rapidement. Il ne duplique pas les pages d&apos;exploration."
                  : "This screen is for fast re-entry. It does not duplicate exploration pages."}
              </p>
            </article>

            <HomepageStatsWidget />

            <article className="rounded-[1.5rem] border border-orange-300/22 bg-[rgba(78,49,22,0.78)] p-5 shadow-[0_18px_44px_-30px_rgba(249,115,22,0.24)]">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-100/60">
                {isFrench ? "Périmètre" : "Scope"}
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-orange-200/16 bg-[rgba(120,78,34,0.58)] p-4">
                  <p className="text-sm font-semibold text-white">Tableau de bord</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/70">
                    {isFrench
                      ? "Alertes, priorités et indicateurs."
                      : "Alerts, priorities and indicators."}
                  </p>
                </div>
                <div className="rounded-2xl border border-orange-200/16 bg-[rgba(120,78,34,0.58)] p-4">
                  <p className="text-sm font-semibold text-white">Profil & impact</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/70">
                    {isFrench
                      ? "Repères personnels et progression."
                      : "Personal benchmarks and progress."}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-orange-100/52">
                {isFrench
                  ? "Explorer est volontairement exclu de cet écran."
                  : "Explorer is intentionally excluded from this screen."}
              </p>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
