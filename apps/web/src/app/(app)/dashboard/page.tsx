import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Suspense } from "react";
import { DashboardOverviewSection } from "@/components/dashboard/dashboard-overview-section";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { IdentityProfileBanner } from "@/components/ui/identity-profile-banner";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getProfileLabel, getProfilePrimaryAction, toProfile } from "@/lib/profiles";
import { getServerDisplayMode, getServerLocale } from "@/lib/server-preferences";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getTranslation } from "@/lib/i18n/server-translation";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import { Shield, Plus, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon Dashboard - CleanMyMap",
  description: "Suivez votre impact environnemental, déclarez vos actions de nettoyage et consultez vos statistiques personnelles.",
};

type DashboardOverviewLoaded =
  | { status: "ok"; overview: Awaited<ReturnType<typeof loadPilotageOverview>> }
  | { status: "error"; message: string };

async function loadDashboardOverviewResult(locale: "fr" | "en"): Promise<DashboardOverviewLoaded> {
  try {
    const supabase = getSupabaseServerClient();
    const overview = await loadPilotageOverview({ supabase, periodDays: 30, limit: 1800 });
    return { status: "ok", overview };
  } catch {
    return {
      status: "error",
      message: locale === "fr"
        ? "Les données du tableau de bord sont momentanément indisponibles."
        : "Dashboard data is temporarily unavailable.",
    };
  }
}

function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map(i => <div key={i} className="h-44 rounded-3xl bg-black/15" />)}
      </div>
      <div className="h-36 rounded-3xl bg-black/15" />
    </div>
  );
}

export default async function DashboardPage() {
  const { userId } = await auth();
  const locale = await getServerLocale();

  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title={locale === "fr" ? "Tableau de bord" : "Dashboard"}
        description={locale === "fr" ? "Connectez-vous pour accéder à votre tableau de bord." : "Sign in to access your dashboard."}
        lockedPreview={
          <div className="grid gap-3 md:grid-cols-3 p-6 rounded-3xl bg-black/20">
            {["Aujourd'hui", "Priorité", "Accès"].map((label) => (
              <div key={label} className="rounded-2xl bg-black/15 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white">{label}</p>
                <div className="mt-3 h-3 w-3/4 rounded bg-black/20" />
              </div>
            ))}
          </div>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  const [role, displayMode] = await Promise.all([
    getCurrentUserRoleLabel().catch(() => "benevole" as const),
    getServerDisplayMode(),
  ]);
  const profile = toProfile(role);
  const roleLabel = getProfileLabel(profile, locale);
  const primaryAction = getProfilePrimaryAction(profile);
  const { t } = getTranslation("dashboard", locale);
  const overviewPromise = loadDashboardOverviewResult(locale);

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      data-display-mode={displayMode}
      style={{ background: "#92400e" }}
    >
      {/* Fond multicouche — orange soleil profond avec lumière */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 160% 100% at 50% -15%, #fef08a 0%, #fbbf24 20%, #f97316 50%, #ea580c 75%, #92400e 100%)" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(254,240,138,0.6) 0%, transparent 65%)" }} />
      <div className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full blur-[120px]" style={{ background: "rgba(251,191,36,0.5)" }} />
      <div className="pointer-events-none absolute top-1/2 -right-32 h-[450px] w-[450px] rounded-full blur-[100px]" style={{ background: "rgba(249,115,22,0.25)" }} />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full blur-[120px]" style={{ background: "rgba(253,224,71,0.2)" }} />

      <div className="relative z-10 mx-auto max-w-[1400px] px-5 pb-24 pt-8 sm:px-8 sm:pt-10">

        {/* ── Configuration active ── */}
        <IdentityProfileBanner profile={profile} />

        {/* ── Header ── */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">
              {locale === "fr" ? "Cockpit opérationnel" : "Operational cockpit"}
            </p>
            <h1 className="mt-1.5 text-[clamp(3rem,6vw,5.5rem)] font-black leading-[0.92] tracking-[-0.05em] text-white">
              {t("title_v1")}
            </h1>
          </div>
          <div className="flex items-center gap-2.5 pb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            <span className="text-sm font-semibold text-white">{roleLabel}</span>
            <span className="rounded-lg border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-mono font-bold text-white">
              <Shield size={10} className="inline mr-1.5 text-emerald-400" />
              {userId.slice(-8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* ── Résumé décisionnel + Plan de journée ── */}
        <div className="mt-12">
          <Suspense fallback={<DashboardOverviewSkeleton />}>
            <DashboardOverviewSection
              overviewPromise={overviewPromise}
              locale={locale}
              profile={profile}
              primaryAction={primaryAction}
            />
          </Suspense>
        </div>

        {/* ── Séparateur ── */}
        <div className="mt-14 h-px bg-white/20" />

        {/* ── Action prioritaire ── */}
        <div className="mt-10 relative overflow-hidden rounded-3xl">
          {/* Layer fond isolé — règle anti-flou */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-black/20" />
          <div className="relative z-10 flex flex-col gap-5 px-7 py-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">
                {locale === "fr" ? "Action prioritaire" : "Priority action"}
              </p>
              <h2 className="text-2xl font-black tracking-tight text-white">
                {locale === "fr" ? "Déclarer une action" : "Declare an action"}
              </h2>
              <p className="text-base font-medium text-white max-w-md leading-relaxed">
                {locale === "fr"
                  ? "Enregistrez une intervention terrain depuis le formulaire dédié."
                  : "Log a field intervention from the dedicated form."}
              </p>
            </div>
            <Link
              href="/actions/new"
              className="group inline-flex h-14 shrink-0 items-center gap-3 rounded-2xl bg-amber-300 px-7 text-[14px] font-black text-amber-950 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5 hover:bg-amber-200 hover:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.4)]"
            >
              <Plus size={18} />
              {locale === "fr" ? "Ouvrir le formulaire" : "Open the form"}
              <ArrowRight size={15} className="ml-1 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* ── Séparateur ── */}
        <div className="mt-14 h-px bg-white/20" />

        {/* ── Accès rapides ── */}
        <div className="mt-10">
          <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">
            {locale === "fr" ? "Accès rapides" : "Quick access"}
          </p>
          <RolePrimaryActions profile={profile} title="" tone="dark" />
        </div>

      </div>
    </main>
  );
}
