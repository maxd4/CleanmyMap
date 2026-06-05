import type { Metadata } from "next";
import {
  Activity,
  AlertTriangle,
  Database,
  Download,
  HardDrive,
  Inbox,
  Settings,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { AccountCompletionGate } from "@/components/account/account-completion-gate";
import { AdminCreatorConsole } from "@/components/admin/admin-creator-console";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { PageHeader, PageHeaderBadge } from "@/components/ui/page-header";
import {
  AdminActionGrid,
  AdminHeroStrip,
  AdminInfoBanner,
  AdminMetricGrid,
  AdminPillLink,
  AdminProfileSwitchStrip,
  AdminSectionHeader,
} from "@/components/admin/admin-dashboard-ui";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { loadCreatorInboxItems } from "@/lib/community/creator-inbox-loader";
import { listAdminOperationAudit } from "@/lib/admin/operation-audit";
import { listPublishedPartnerAnnuaireEntries } from "@/lib/partners/published-annuaire-entries-store";
import {
  getProfileLabel,
  getProfilePrimaryAction,
  getSwitchableProfiles,
  isAdminLikeProfile,
  toProfile,
} from "@/lib/profiles";
import { getServerLocale } from "@/lib/server-preferences";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildProfileRoute, ADMIN_GODMODE_ROUTE } from "@/lib/accueil-pilotage-routes";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { loadPilotageOverview, type DecisionSummaryKpi } from "@/lib/pilotage/overview";
import { resolvePublicContactEmail } from "@/lib/email-config";

export const metadata: Metadata = {
  title: "Administration - CleanMyMap",
  description:
    "Back-office du site pour gérer les utilisateurs, la modération et les demandes.",
};

async function loadAdminOverview() {
  const supabase = getSupabaseServerClient();
  return loadPilotageOverview({
    supabase,
    periodDays: 30,
    limit: 1800,
  });
}

function getForecastLabel(kpi: DecisionSummaryKpi): string {
  if (kpi.id === "impact") return "Prévision prochaine : stabilisation";
  if (kpi.id === "mobilization") return "Prévision prochaine : consolidation";
  return "Prévision prochaine : vigilance renforcée";
}

export default async function AdminPage() {
  const { userId, clerkReachable } = await getSafeAuthSession();
  const locale = await getServerLocale();

  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Administration"
        description="Accès réservé aux comptes Clerk autorisés."
        lockedPreview={
          <div className="grid gap-6 rounded-[3rem] border border-stone-400/18 bg-[linear-gradient(145deg,rgba(36,24,16,0.94)_0%,rgba(94,58,29,0.88)_58%,rgba(245,158,11,0.22)_100%)] p-8 shadow-[0_24px_56px_-34px_rgba(69,45,28,0.36)] md:grid-cols-3">
            {[
              {
                label: "Supervision",
                desc: "Alertes et priorités de l'administration.",
              },
              {
                label: "Modération",
                desc: "Actions réservées au back-office connecté.",
              },
              {
                label: "Export",
                desc: "Les livrables d'administration nécessitent un compte autorisé.",
              },
            ].map((item) => (
              <article
                key={item.label}
                className="rounded-[2rem] border border-white/8 bg-white/[0.06] p-6"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/72">
                  {item.label}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-amber-50/72">
                  {item.desc}
                </p>
              </article>
            ))}
          </div>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  const accountCompletion = await loadAccountCompletionGateState({
    userId,
    clerkReachable,
  }).catch(() => null);

  const role = await getCurrentUserRoleLabel();
  const profile = toProfile(role);
  const primaryAction = getProfilePrimaryAction(profile);
  const pageFamily = resolvePageFamily("/admin");
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";
  const creatorIdentity =
    role === "max"
      ? await getCurrentUserIdentity().catch(() => null)
      : null;
  const creatorDisplayName =
    creatorIdentity?.displayName?.trim() ||
    creatorIdentity?.firstName?.trim() ||
    creatorIdentity?.username ||
    creatorIdentity?.handle ||
    "Administration avancée";

  if (!isAdminLikeProfile(profile)) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(255,249,243,0.98)_0%,_rgba(246,239,228,0.96)_48%,_rgba(238,231,219,0.98)_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <PageHeader
            family={pageFamily}
            eyebrow="Espace administratif"
            title="Mon espace"
            subtitle="Cockpit opérationnel de l'administration."
            badges={
              <>
                <PageHeaderBadge family={pageFamily}>
                  Console verrouillée
                </PageHeaderBadge>
                <PageHeaderBadge family={pageFamily} muted>
                  Accès restreint
                </PageHeaderBadge>
              </>
            }
            action={
              <AdminPillLink href="/sign-in">
                Se connecter
              </AdminPillLink>
            }
            className="max-w-none w-full"
          />

          <AdminInfoBanner
            eyebrow="Accès restreint"
            title="Privilèges d'administration requis"
            description="Votre compte actuel ne dispose pas des autorisations nécessaires pour accéder au pilotage système. Contactez un administrateur Clerk."
            icon={ShieldCheck}
            tone="light"
            action={<AdminPillLink href="/sign-in">Se connecter</AdminPillLink>}
            className="mt-8"
          />
        </div>
      </div>
    );
  }

  const [overview, creatorInboxItems, publishedEntries, adminAudit] =
    await Promise.all([
      loadAdminOverview().catch(() => null),
      loadCreatorInboxItems().catch(() => []),
      listPublishedPartnerAnnuaireEntries().catch(() => []),
      listAdminOperationAudit(25).catch(() => []),
    ]);

  const onboardingStatus = {
    pending: creatorInboxItems.filter(
      (item) =>
        item.source === "partner" &&
        item.sourceStatus === "pending_admin_review",
    ).length,
    accepted: creatorInboxItems.filter(
      (item) => item.source === "partner" && item.sourceStatus === "accepted",
    ).length,
  };

  const publicationStatus = {
    pending: publishedEntries.filter(
      (item) => item.publicationStatus === "pending_admin_review",
    ).length,
    accepted: publishedEntries.filter(
      (item) => item.publicationStatus === "accepted",
    ).length,
  };

  const moderationAudit = {
    success: adminAudit.filter((item) => item.outcome === "success").length,
    error: adminAudit.filter((item) => item.outcome === "error").length,
  };

  const summaryKpis: DecisionSummaryKpi[] = (
    overview?.summary.kpis ?? [
      {
        id: "mobilization",
        label: "Actions validées",
        value: `${moderationAudit.success}`,
        previousValue: "—",
        deltaAbsolute: "—",
        deltaPercent: "—",
        interpretation: "positive",
      },
      {
        id: "quality",
        label: "Qualité data",
        value: `${Math.max(
          0,
          100 - (publicationStatus.pending + onboardingStatus.pending) * 4,
        )}/100`,
        previousValue: "—",
        deltaAbsolute: "—",
        deltaPercent: "—",
        interpretation: "neutral",
      },
    ]
  ).filter((kpi) => kpi.id !== "impact");

  const fallbackRecommendedAction = {
    href: primaryAction.href,
    label: primaryAction.label[locale],
  };
  const recommendedAction =
    overview?.summary.recommendedAction ?? fallbackRecommendedAction;
  const alertTitle =
    overview?.summary.alert.title ?? "Qualité des données à renforcer";
  const alertDetail =
    overview?.summary.alert.detail ??
    "La qualité de la geo-ouverture conditionne le lecteur KPI et les rapports institutionnels.";
  const switchableProfiles = getSwitchableProfiles(profile);
  const profileLink = buildProfileRoute(profile);
  const profileCountLabel =
    switchableProfiles.length > 1
      ? `${switchableProfiles.length} profils`
      : "Profil actif";

  const metricCards = summaryKpis.map((kpi) => ({
    id: kpi.id,
    label: kpi.label,
    value: kpi.value,
    previousValue: kpi.previousValue,
    deltaPercent: kpi.deltaPercent,
    interpretation: kpi.interpretation,
    forecastLabel: getForecastLabel(kpi),
  }));

  const actionTiles = [
    {
      id: "creator-inbox",
      icon: Inbox,
      title: "Inbox créateur",
      description:
        onboardingStatus.pending > 0
          ? `${onboardingStatus.pending} demandes prioritaires à traiter.`
          : "Aucune demande prioritaire en attente.",
      href: "/admin/services#governance-report",
      badge: "Prioritaire",
    },
    {
      id: "export-data",
      icon: Download,
      title: "Exporter les données",
      description:
        publishedEntries.length > 0
          ? `${publishedEntries.length} entrées visibles dans l'annuaire.`
          : "Suivre les exports et les journaux.",
      href: "/admin/services#governance-report",
      badge: "Rapide",
    },
    {
      id: "system-control",
      icon: Activity,
      title: "Contrôle système",
      description:
        moderationAudit.error > 0
          ? `${moderationAudit.error} incidents techniques à inspecter.`
          : "Ouvrir l'arbitrage et les outils sensibles.",
      href: ADMIN_GODMODE_ROUTE,
      badge: "Rapide",
    },
  ];

  const quickAccessTiles = [
    {
      id: "declare-action",
      icon: Activity,
      title: "Déclarer une action",
      description: "Enregistrer une intervention terrain.",
      href: "/actions/new",
      badge: "Rapide",
      iconWrapClassName: "bg-amber-100 text-amber-700 border-amber-200/60",
      iconClassName: "text-amber-700",
    },
    {
      id: "manage-data",
      icon: Database,
      title: "Gérer les données",
      description: "Valider, corriger, enrichir.",
      href: "/actions/history",
      badge: "Rapide",
      iconWrapClassName: "bg-emerald-100 text-emerald-700 border-emerald-200/60",
      iconClassName: "text-emerald-700",
    },
    {
      id: "traceability",
      icon: ShieldCheck,
      title: "Renforcer traçabilité",
      description: "Qualité data en baisse.",
      href: "/admin/services#governance-report",
      badge: "Rapide",
      iconWrapClassName: "bg-violet-100 text-violet-700 border-violet-200/60",
      iconClassName: "text-violet-700",
    },
    {
      id: "site-health",
      icon: HardDrive,
      title: "Santé du site",
      description: "Contrôler les flux et l'état général.",
      href: "/admin/services",
      badge: "Rapide",
      iconWrapClassName: "bg-sky-100 text-sky-700 border-sky-200/60",
      iconClassName: "text-sky-700",
    },
  ];

  const privacyTiles = [
    {
      id: "account-settings",
      icon: Settings,
      title: "Paramètres du compte",
      description: "Gérer vos préférences et vos données.",
      href: "/reglages",
      badge: "Accès",
      iconWrapClassName: "bg-amber-100 text-amber-700 border-amber-200/60",
      iconClassName: "text-amber-700",
    },
    {
      id: "privacy",
      icon: ShieldCheck,
      title: "Confidentialité",
      description: "Gérez comment vos données sont utilisées et partagées.",
      href: "/politique-confidentialite",
      badge: "Protection",
      iconWrapClassName: "bg-emerald-100 text-emerald-700 border-emerald-200/60",
      iconClassName: "text-emerald-700",
    },
    {
      id: "delete-account",
      icon: Trash2,
      title: "Suppression du compte",
      description: "Vous pouvez supprimer votre compte à tout moment.",
      href: `mailto:${contactEmail}?subject=${encodeURIComponent(
        "Demande RGPD - Suppression de compte",
      )}`,
      badge: "Urgent",
      iconWrapClassName: "bg-rose-100 text-rose-700 border-rose-200/60",
      iconClassName: "text-rose-700",
    },
  ];

  const systemChips = ["Classement global", "Niveau utilisateur"];

  return (
    <AccountCompletionGate state={accountCompletion}>
      <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_rgba(255,249,243,0.98)_0%,_rgba(248,239,228,0.95)_45%,_rgba(239,231,220,0.98)_100%)] text-stone-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(32,28,39,0.94)_0%,rgba(32,28,39,0.8)_62%,rgba(32,28,39,0)_100%)]" />
          <div className="absolute -left-24 top-24 h-96 w-96 rounded-full bg-amber-300/22 blur-2xl" />
          <div className="absolute right-0 top-40 h-[30rem] w-[30rem] rounded-full bg-stone-200/22 blur-2xl" />
          <div className="absolute bottom-0 left-1/2 h-[24rem] w-[28rem] -translate-x-1/2 rounded-full bg-white/30 blur-2xl" />
        </div>

        <div className="relative mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AdminHeroStrip
            icon={ShieldCheck}
            eyebrow="Espace administratif"
            description="Supervision système et modération critique."
            accessLabel="Accès administration"
            action={
              <AdminPillLink href={profileLink} subdued>
                Voir profil
              </AdminPillLink>
            }
          />

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_auto] xl:items-end">
            <PageHeader
              family={pageFamily}
              eyebrow="Espace administratif"
              title="Mon espace"
              subtitle="Cockpit opérationnel de l'administration."
              badges={
                <>
                  <PageHeaderBadge family={pageFamily}>
                    Console active
                  </PageHeaderBadge>
                  <PageHeaderBadge family={pageFamily} muted>
                    Rôle: {role}
                  </PageHeaderBadge>
                </>
              }
              action={
                <AdminPillLink href={profileLink}>
                  Voir profil
                </AdminPillLink>
              }
              className="max-w-none w-full"
            />
          </div>

          <AdminInfoBanner
            eyebrow="Alerte"
            title={alertTitle}
            description={alertDetail}
            icon={AlertTriangle}
            tone="light"
            action={
              <AdminPillLink href={recommendedAction.href}>
                {recommendedAction.label}
              </AdminPillLink>
            }
            className="mt-8"
          />

          <AdminMetricGrid items={metricCards} className="mt-8 lg:grid-cols-2" />

          <section className="mt-10">
            <AdminSectionHeader
              eyebrow="À faire maintenant"
              description="Les actions prioritaires restent accessibles depuis les sous-rubriques dédiées."
              action={
                <AdminPillLink href="/admin/services">
                  Voir toutes les actions
                </AdminPillLink>
              }
            />

            <AdminActionGrid items={actionTiles} className="mt-4" />
          </section>

          <section className="mt-10">
            <AdminSectionHeader
              eyebrow="Accès rapides"
              description="Les raccourcis de la console restent triés par usage courant."
            />

            <AdminActionGrid
              items={quickAccessTiles}
              compact
              className="mt-4"
            />
          </section>

          <section className="mt-10 rounded-[2rem] border border-stone-200/80 bg-white/76 p-5 shadow-[0_16px_40px_-32px_rgba(69,45,28,0.26)] backdrop-blur-sm">
            <AdminSectionHeader
              eyebrow="Confidentialité & compte"
              description="Les accès sensibles et les options de compte sont centralisés ici."
            />

            <AdminActionGrid
              items={privacyTiles}
              compact
              columnsClassName="md:grid-cols-3"
              className="mt-4"
            />
          </section>

          <section className="mt-10 space-y-4">
            <AdminSectionHeader
              eyebrow="Informations système"
              description="Les repères internes restent concentrés dans un seul espace de supervision."
              action={
                <PageHeaderBadge family={pageFamily} muted>
                  {profileCountLabel}
                </PageHeaderBadge>
              }
            />

            <AdminInfoBanner
              eyebrow="Classement global"
              title="Le classement n'est pas encore disponible."
              tone="muted"
              action={
                <div className="flex flex-wrap gap-2">
                  {systemChips.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white/90"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              }
            />

            <AdminInfoBanner
              eyebrow="Privilèges système"
              title="Vous avez déjà un niveau de supervision élevé."
              description="Le formulaire de promotion est réservé aux profils de terrain et de coordination nécessitant des droits étendus."
              icon={ShieldCheck}
              tone="warm"
              action={
                <AdminPillLink href={profileLink} subdued>
                  Évolution du compte
                </AdminPillLink>
              }
            />

            <AdminProfileSwitchStrip
              profiles={switchableProfiles}
              activeProfile={profile}
              getProfileLabel={getProfileLabel}
              locale={locale}
              label="Switch de profil (Admin)"
              getHref={buildProfileRoute}
            />
          </section>

          {role === "max" ? (
            <AdminCreatorConsole
              displayName={creatorDisplayName}
              embedded
              className="mt-10"
            />
          ) : null}
        </div>
      </main>
    </AccountCompletionGate>
  );
}
