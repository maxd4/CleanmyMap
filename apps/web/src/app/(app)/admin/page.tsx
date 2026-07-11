import type { Metadata } from "next";
import {
  Activity,
  AlertTriangle,
  BookOpenText,
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
import { AdminAccessState } from "@/components/ui/admin-access-state";
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
import {
  ModerationByBlockPanel,
  type ModerationBlockSummary,
} from "@/components/admin/moderation-by-block-panel";
import { getCurrentUserIdentity, getCurrentUserRoleLabel } from "@/lib/authz";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { loadAccountCompletionGateState } from "@/lib/auth/account-completion-gate";
import { runActionQuery } from "@/lib/actions/query";
import type { CreatorInboxItem } from "@/lib/community/creator-inbox";
import { loadCreatorInboxItems } from "@/lib/community/creator-inbox-loader";
import { listAdminOperationAudit } from "@/lib/admin/operation-audit";
import { listPublishedPartnerAnnuaireEntries } from "@/lib/partners/published-annuaire-entries-store";
import type { PublishedPartnerAnnuaireEntry } from "@/lib/partners/published-annuaire-entries-store";
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

type PendingActionModerationRow = {
  id: string;
  action_date: string;
  location_label: string;
  created_at: string;
  volunteers_count: number;
  duration_minutes: number;
};

type PendingSpotModerationRow = {
  id: string;
  created_at: string;
  label: string;
  status: "new" | "validated" | "cleaned";
  waste_type: "clean_place" | "spot";
};

async function loadAdminOverview() {
  return loadPilotageOverview({
    periodDays: 30,
    limit: 1800,
  });
}

function getForecastLabel(kpi: DecisionSummaryKpi): string {
  if (kpi.id === "impact") return "Prévision prochaine : stabilisation";
  if (kpi.id === "mobilization") return "Prévision prochaine : consolidation";
  return "Prévision prochaine : vigilance renforcée";
}

function formatModerationDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

async function loadModerationQueues() {
  const supabase = getSupabaseServerClient();

  const [pendingActions, pendingActionsCount, pendingSpots, pendingGroupJoinRequests] =
    await Promise.all([
      runActionQuery<PendingActionModerationRow>(supabase, (query) =>
        query
          .select(
            "id, action_date, location_label, created_at, volunteers_count, duration_minutes",
          )
          .eq("status", "pending")
          .order("action_date", { ascending: false })
          .limit(6),
      ),
      supabase
        .from("actions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("spots")
        .select("id, created_at, label, status, waste_type", {
          count: "exact",
        })
        .eq("status", "new")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("action_participants")
        .select("id", { count: "exact", head: true })
        .eq("participation_status", "pending"),
    ]);

  if (pendingSpots.error) {
    throw new Error(pendingSpots.error.message);
  }
  if (pendingActionsCount.error) {
    throw new Error(pendingActionsCount.error.message);
  }
  if (pendingGroupJoinRequests.error) {
    throw new Error(pendingGroupJoinRequests.error.message);
  }

  return {
    pendingActions,
    pendingActionsCount: Number(pendingActionsCount.count ?? 0),
    pendingSpots: (pendingSpots.data ?? []) as PendingSpotModerationRow[],
    pendingSpotsCount: Number(pendingSpots.count ?? 0),
    pendingGroupJoinRequestsCount: Number(pendingGroupJoinRequests.count ?? 0),
  };
}

function buildModerationBlockSummaries(params: {
  creatorInboxItems: CreatorInboxItem[];
  publishedEntries: PublishedPartnerAnnuaireEntry[];
  adminAudit: Awaited<ReturnType<typeof listAdminOperationAudit>>;
  pendingActions: PendingActionModerationRow[];
  pendingActionsCount: number;
  pendingSpots: PendingSpotModerationRow[];
  pendingSpotsCount: number;
  pendingGroupJoinRequestsCount: number;
}): ModerationBlockSummary[] {
  const creatorInboxNeedsAttention = params.creatorInboxItems.filter(
    (item) => item.status === "pending" || item.status === "new",
  );
  const pendingFeedbackItems = creatorInboxNeedsAttention.filter(
    (item) => item.source === "feedback",
  );
  const pendingPromotionItems = creatorInboxNeedsAttention.filter(
    (item) => item.source === "promotion",
  );
  const pendingPartnerInboxItems = creatorInboxNeedsAttention.filter(
    (item) => item.source === "partner",
  );
  const pendingPublishedEntries = params.publishedEntries.filter(
    (item) => item.publicationStatus === "pending_admin_review",
  );
  const pendingAuditErrors = params.adminAudit.filter(
    (item) => item.outcome === "error",
  );
  const pendingAuditLabel =
    pendingAuditErrors.length === 0
      ? "Aucun incident récent"
      : pendingAuditErrors.length === 1
        ? "1 incident récent"
        : `${pendingAuditErrors.length} incidents récents`;

  return [
    {
      id: "apprendre",
      number: 5,
      label: "Apprendre",
      count: 0,
      description:
        "Aucune file de modération n’est encore branchée sur ce bloc. Il reste en bas de la pile par défaut.",
      href: "/learn",
      ctaLabel: "Voir les contenus",
      accent: "amber",
      details: [
        "Pas de file dédiée aujourd’hui.",
        "Le bloc peut recevoir une revue éditoriale plus tard si besoin.",
      ],
      samples: [
        {
          label: "File dédiée",
          meta: "0 élément à gérer",
        },
      ],
    },
    {
      id: "reseau-discussions",
      number: 4,
      label: "Réseau & Discussions",
      count: creatorInboxNeedsAttention.length + pendingPublishedEntries.length,
      description:
        "Les demandes liées aux échanges, aux promotions et aux fiches partenaires restent centralisées ici.",
      href: "/admin/services",
      ctaLabel: "Ouvrir la revue",
      accent: "indigo",
      details: [
        `${pendingFeedbackItems.length} retours créateur à traiter.`,
        `${pendingPromotionItems.length} demandes de promotion en attente.`,
        `${pendingPartnerInboxItems.length} demandes partenaires et ${pendingPublishedEntries.length} fiches publiées à revoir.`,
      ],
      samples: [
        ...creatorInboxNeedsAttention.slice(0, 2).map((item) => ({
          label: item.title,
          meta: `${item.sourceLabel} · ${formatModerationDate(item.createdAt)}`,
        })),
        ...pendingPublishedEntries.slice(0, 1).map((item) => ({
          label: item.name,
          meta: `Publication ${item.publicationStatus} · ${formatModerationDate(item.publishedAt)}`,
        })),
      ],
    },
    {
      id: "cartographie-impact",
      number: 3,
      label: "Cartographie & Impact",
      count: params.pendingSpotsCount,
      description:
        "Les éléments cartographiques en attente restent visibles depuis ce bloc avant d’alimenter les vues publiques.",
      href: "/actions/map",
      ctaLabel: "Voir la carte",
      accent: "sky",
      details: [
        `${params.pendingSpotsCount} lieux ou spots à valider.`,
        "Les entrées nouvelles restent en file jusqu’à validation.",
      ],
      samples: [
        ...params.pendingSpots.slice(0, 3).map((spot) => ({
          label: spot.label,
          meta: `${spot.waste_type === "spot" ? "Spot" : "Lieu propre"} · ${formatModerationDate(spot.created_at)}`,
        })),
        ...(params.pendingSpots.length === 0
          ? [
              {
                label: "Aucun lieu en attente",
                meta: "La file est vide pour l’instant",
              },
            ]
          : []),
      ],
    },
    {
      id: "agir",
      number: 2,
      label: "Agir",
      count: params.pendingActionsCount + params.pendingGroupJoinRequestsCount,
      description:
        "Les formulaires d’action et les demandes de participation sont consolidés ici avant traitement.",
      href: "/actions/history",
      ctaLabel: "Ouvrir la modération",
      accent: "emerald",
      details: [
        `${params.pendingActionsCount} formulaires d’action en attente.`,
        `${params.pendingGroupJoinRequestsCount} demandes de participation à traiter.`,
        "Les comptes admin passent directement, les autres restent en file d’attente.",
      ],
      samples: [
        ...params.pendingActions.slice(0, 2).map((action) => ({
          label: action.location_label,
          meta: `${formatModerationDate(action.action_date)} · ${action.volunteers_count} bénévoles · ${action.duration_minutes} min`,
        })),
        {
          label: "File de participation",
          meta: `${params.pendingGroupJoinRequestsCount} compte${params.pendingGroupJoinRequestsCount > 1 ? "s" : ""} en attente`,
        },
      ],
    },
    {
      id: "accueil-pilotage",
      number: 1,
      label: "Accueil & Pilotage",
      count: pendingAuditErrors.length,
      description:
        "Les incidents d’audit récents et les signaux de supervision restent visibles en dernier niveau de bloc.",
      href: "/admin",
      ctaLabel: "Voir le pilotage",
      accent: "rose",
      details: [
        `${pendingAuditLabel} à relire.`,
        "Cette zone sert de filet pour les alertes transverses et la supervision.",
      ],
      samples: [
        ...pendingAuditErrors.slice(0, 2).map((item) => ({
          label: String(item.details["entityType"] ?? item.operationType),
          meta: `${item.operationType} · ${formatModerationDate(item.at)}`,
        })),
        ...(pendingAuditErrors.length === 0
          ? [
              {
                label: "Aucun incident",
                meta: "La supervision est stable pour le moment",
              },
            ]
          : []),
      ],
    },
  ];
}

export default async function AdminPage() {
  const { userId, clerkReachable } = await getSafeAuthSession();
  const locale = await getServerLocale();

  if (!userId) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(255,249,243,0.98)_0%,_rgba(246,239,228,0.96)_48%,_rgba(238,231,219,0.98)_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-center">
          <AdminAccessState className="w-full" />
        </div>
      </div>
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
        <div className="mx-auto flex max-w-4xl items-center justify-center">
          <AdminAccessState className="w-full" />
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

  const moderationQueues = await loadModerationQueues().catch(() => ({
    pendingActions: [],
    pendingActionsCount: 0,
    pendingSpots: [],
    pendingSpotsCount: 0,
    pendingGroupJoinRequestsCount: 0,
  }));

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
      id: "quiz-bank",
      icon: BookOpenText,
      title: "Revue quiz",
      description: "Filtrer et corriger la banque de questions.",
      href: "/admin/quiz-bank",
      badge: "Audit",
      iconWrapClassName: "bg-amber-100 text-amber-700 border-amber-200/60",
      iconClassName: "text-amber-700",
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
  const moderationBlocks = buildModerationBlockSummaries({
    creatorInboxItems,
    publishedEntries,
    adminAudit,
    pendingActions: moderationQueues.pendingActions,
    pendingActionsCount: moderationQueues.pendingActionsCount,
    pendingSpots: moderationQueues.pendingSpots,
    pendingSpotsCount: moderationQueues.pendingSpotsCount,
    pendingGroupJoinRequestsCount: moderationQueues.pendingGroupJoinRequestsCount,
  });

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

          <div id="moderation-par-bloc" className="mt-10">
            <ModerationByBlockPanel blocks={moderationBlocks} />
          </div>

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
