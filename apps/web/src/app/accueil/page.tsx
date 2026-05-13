import { auth } from "@clerk/nextjs/server";
import { LayoutDashboard, LogIn, MapPin, UserRound } from "lucide-react";
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
  let profileLabel = isFrench ? "Non connecté" : "Guest";
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

  const statusItems = [
    {
      label: isFrench ? "Statut" : "Status",
      value: userId ? (isFrench ? "Connecté" : "Signed in") : (isFrench ? "Visiteur" : "Guest"),
    },
    { label: isFrench ? "Profil" : "Profile", value: profileLabel },
    {
      label: isFrench ? "Niveau" : "Level",
      value: currentLevel !== null ? `${currentLevel}` : "—",
      sub: badgeCount !== null ? `${badgeCount} badge${badgeCount !== 1 ? "s" : ""}` : undefined,
    },
  ];

  return (
    <main
      className="relative min-h-screen overflow-hidden font-sans"
      style={{ background: "#b45309" }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 140% 90% at 50% -10%, #fde68a 0%, #fb923c 35%, #ea580c 65%, #b45309 100%)" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(253,230,138,0.55) 0%, transparent 70%)" }} />
      <div className="pointer-events-none absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full blur-[100px]" style={{ background: "rgba(251,191,36,0.45)" }} />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-[400px] w-[400px] rounded-full blur-[90px]" style={{ background: "rgba(249,115,22,0.30)" }} />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] -translate-x-1/4 translate-y-1/4 rounded-full blur-[110px]" style={{ background: "rgba(253,224,71,0.28)" }} />


      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-5 pb-16 pt-8 sm:px-8">

        {/* Hero */}
        <div className="mb-12 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-orange-950/75">
            {isFrench ? "Bloc Accueil" : "Home block"}
          </p>
          <h1 className="text-[clamp(3rem,6vw,5rem)] font-black leading-[0.94] tracking-[-0.04em] text-slate-900">
            {isFrench ? "Où j'en suis" : "Where I stand"}
          </h1>
          <p className="max-w-xl text-base font-medium leading-[1.6] text-slate-900">
            {isFrench
              ? "Reprendre le fil, vérifier son périmètre, repartir vers l'action."
              : "Recover context, confirm scope, move back to action."}
          </p>
        </div>

        {/* Grid principale */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">

          {/* Card principale — sombre contrastée */}
          <div className="relative overflow-hidden rounded-[2rem] bg-[#431407] p-8 shadow-[0_24px_60px_-20px_rgba(124,45,18,0.50)] sm:p-10">
            {/* Barre orange top */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400" />
            {/* Glow interne */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-500/15 blur-3xl" />

            <div className="relative space-y-8">
              {/* Titre */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white">
                    {isFrench ? "Reprise de session" : "Session recap"}
                  </p>
                  <h2 className="mt-1.5 text-2xl font-bold text-white">{displayName}</h2>
                  <p className="mt-0.5 text-sm text-white">{profileLabel}</p>
                </div>
                <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold text-white">
                  {displayMode}
                </span>
              </div>

              {/* Stats statut */}
              <div className="grid grid-cols-3 gap-3">
                {statusItems.map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white/6 p-4">
                    <div className="mb-2 h-0.5 w-5 rounded-full bg-orange-400/60" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">{item.label}</p>
                    <p className="mt-1.5 text-[clamp(1.3rem,2.5vw,1.75rem)] font-black leading-none text-white">
                      {item.value}
                    </p>
                    {item.sub && <p className="mt-1 text-[11px] text-white">{item.sub}</p>}
                  </div>
                ))}
              </div>

              <div className="h-px bg-white/8" />

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center gap-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-6 text-[14px] font-bold text-white shadow-[0_12px_24px_-12px_rgba(234,88,12,0.6)] transition-transform hover:-translate-y-0.5"
                >
                  <LayoutDashboard size={17} />
                  {isFrench ? "Tableau de bord" : "Dashboard"}
                </Link>
                <Link
                  href="/profil"
                  className="inline-flex h-12 items-center gap-2.5 rounded-2xl bg-white/10 px-6 text-[14px] font-bold text-white transition-all hover:bg-white/16 hover:-translate-y-0.5"
                >
                  <UserRound size={17} />
                  {isFrench ? "Profil" : "Profile"}
                </Link>
                {!userId && (
                  <Link
                    href="/sign-in"
                    className="inline-flex h-12 items-center gap-2.5 rounded-2xl bg-white/10 px-6 text-[14px] font-bold text-white transition-all hover:bg-white/16 hover:-translate-y-0.5"
                  >
                    <LogIn size={17} />
                    {isFrench ? "Se connecter" : "Sign in"}
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div className="flex flex-col gap-5">
            <HomepageStatsWidget />

            {/* Nav rapide — card légère sur fond clair */}
            <div className="rounded-[2rem] bg-[#431407]/80 p-6 backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white">
                {isFrench ? "Navigation" : "Navigation"}
              </p>
              <div className="mt-4 space-y-1">
                {[
                  { href: "/actions/map", icon: MapPin, label: isFrench ? "Carte interactive" : "Interactive map" },
                  { href: "/dashboard", icon: LayoutDashboard, label: isFrench ? "Tableau de bord" : "Dashboard" },
                  { href: "/explorer", icon: UserRound, label: isFrench ? "Plan du site" : "Site map" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <item.icon size={15} className="text-white transition-colors" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
