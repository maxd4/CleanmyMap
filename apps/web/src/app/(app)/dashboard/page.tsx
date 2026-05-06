import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { ActionDeclarationForm } from "@/components/actions/action-declaration-form";
import { DashboardOverviewSection } from "@/components/dashboard/dashboard-overview-section";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { IdentityProfileBanner } from "@/components/ui/identity-profile-banner";
import { RolePrimaryActions } from "@/components/navigation/role-primary-actions";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { getProfileLabel, getProfilePrimaryAction, toProfile } from "@/lib/profiles";
import { getServerDisplayMode, getServerLocale } from "@/lib/server-preferences";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getTranslation } from "@/lib/i18n/server-translation";
import { loadPilotageOverview } from "@/lib/pilotage/overview";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Mon Dashboard - CleanMyMap',
  description: 'Suivez votre impact environnemental, déclarez vos actions de nettoyage et consultez vos statistiques personnelles.',
};

type DashboardOverviewLoaded =
  | { status: "ok"; overview: Awaited<ReturnType<typeof loadPilotageOverview>> }
  | { status: "error"; message: string };

async function loadDashboardOverviewResult(
  locale: "fr" | "en",
): Promise<DashboardOverviewLoaded> {
  try {
    const supabase = getSupabaseServerClient();
    const overview = await loadPilotageOverview({
      supabase,
      periodDays: 30,
      limit: 1800,
    });
    return { status: "ok", overview };
  } catch {
    return {
      status: "error",
      message:
        locale === "fr"
          ? "Les données du tableau de bord sont momentanément indisponibles."
          : "Dashboard data is temporarily unavailable.",
    };
  }
}

function DashboardOverviewSkeleton() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-2">
        <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
        <div className="h-7 w-72 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </section>
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
        description={
          locale === "fr"
            ? "Cette fonctionnalité nécessite une connexion Clerk."
            : "This feature requires Clerk sign-in."
        }
        lockedPreview={
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
                  {locale === "fr" ? "Aujourd'hui" : "Today"}
                </p>
                <p className="mt-2 cmm-text-small cmm-text-secondary">
                  {locale === "fr"
                    ? "Votre dernière activité et les actions en attente de validation."
                    : "Your latest activity and actions awaiting validation."}
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
                  {locale === "fr" ? "Action prioritaire" : "Priority action"}
                </p>
                <p className="mt-2 cmm-text-small cmm-text-secondary">
                  {locale === "fr"
                    ? "Déclarer une action ou reprendre la prochaine tâche."
                    : "Declare an action or resume the next task."}
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">
                  {locale === "fr" ? "Accès rapides" : "Quick access"}
                </p>
                <p className="mt-2 cmm-text-small cmm-text-secondary">
                  {locale === "fr"
                    ? "Carte, historique, rapports et raccourcis utiles."
                    : "Map, history, reports and useful shortcuts."}
                </p>
              </article>
            </div>
          </div>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  const [identity, role, displayMode] = await Promise.all([
    getCurrentUserIdentity(),
    getCurrentUserRoleLabel(),
    getServerDisplayMode(),
  ]);
  const profile = toProfile(role);
  const roleLabel = getProfileLabel(profile, locale);
  const primaryAction = getProfilePrimaryAction(profile);
  const { t } = getTranslation("dashboard", locale);
  const fallbackActorName = userId ?? "unknown-user";
  const actorNameOptions =
    identity?.actorNameOptions && identity.actorNameOptions.length > 0
      ? identity.actorNameOptions
      : [fallbackActorName];
  const defaultActorName = actorNameOptions[0] ?? fallbackActorName;

  const overviewPromise = loadDashboardOverviewResult(locale);

  return (
    <div className="flex flex-col gap-6 pt-4 md:pt-6" data-display-mode={displayMode}>
      <IdentityProfileBanner profile={profile} />

      <header className="space-y-3 rounded-2xl border border-white/40 bg-white/60 p-6 shadow-xl backdrop-blur-md">
        <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
          Cockpit quotidien
        </p>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight cmm-text-primary">
            {t("title_v1")}
          </h1>
          <p className="cmm-text-small cmm-text-secondary">{t("desc_v1")}</p>
        </div>
        <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
          {locale === "fr" ? "Profil actif" : "Active profile"}: {roleLabel}
        </p>
      </header>

      <Suspense fallback={<DashboardOverviewSkeleton />}>
        <DashboardOverviewSection
          overviewPromise={overviewPromise}
          locale={locale}
          profile={profile}
          primaryAction={primaryAction}
        />
      </Suspense>

      <section className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 shadow-xl backdrop-blur-md">
        <div>
          <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
            {locale === "fr" ? "Action prioritaire" : "Priority action"}
          </p>
          <h2 className="mt-1 text-xl font-semibold cmm-text-primary">
            {locale === "fr"
              ? "Déclarer ou compléter une action"
              : "Declare or complete an action"}
          </h2>
          <p className="mt-1 cmm-text-small cmm-text-secondary">
            {locale === "fr"
              ? "Le formulaire terrain reste l'entrée directe pour transformer une sortie en impact mesuré."
              : "The field form remains the direct entry to turn a field visit into measured impact."}
          </p>
        </div>
        <ActionDeclarationForm
          actorNameOptions={actorNameOptions}
          defaultActorName={defaultActorName}
          userMetadata={{
            userId: identity?.userId ?? fallbackActorName,
            username: identity?.username,
            displayName: identity?.displayName ?? fallbackActorName,
          }}
          initialMode="quick"
        />
      </section>

      <RolePrimaryActions profile={profile} title={locale === "fr" ? "Accès rapides" : "Quick access"} />
    </div>
  );
}
