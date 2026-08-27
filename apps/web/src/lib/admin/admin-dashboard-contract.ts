import { runActionQuery } from "@/lib/actions/query";
import type { CreatorInboxItem } from "@/lib/community/creator-inbox";
import { loadCreatorInboxItems } from "@/lib/community/creator-inbox-loader";
import { listAdminOperationAudit, type AdminOperationAuditEntry } from "@/lib/admin/audit/operation-audit";
import {
  listModeratableSignalements,
  type ModeratableSignalement,
} from "@/lib/admin/moderation/signalement-moderation";
import {
  listPublishedPartnerAnnuaireEntries,
  type PublishedPartnerAnnuaireEntry,
} from "@/lib/partners/published-annuaire-entries-store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AdminOperationalMetricAvailability,
  AdminOperationalMetricItem,
} from "./admin-dashboard-types";
import type { ModerationBlockSummary } from "@/components/admin/moderation-by-block-panel";
import { ADMIN_SIGNALEMENTS_MODERATION_HREF } from "@/components/reports/admin-workflow/helpers";

export type PendingActionModerationRow = {
  id: string;
  action_date: string;
  location_label: string;
  created_at: string;
  volunteers_count: number;
  duration_minutes: number;
};

export type AdminSource<T> =
  | { status: "available"; data: T }
  | { status: "unavailable" };

export type AdminSources = {
  actions: AdminSource<{
    items: PendingActionModerationRow[];
    count: number;
  }>;
  groupJoin: AdminSource<{ count: number }>;
  signalements: AdminSource<{
    items: ModeratableSignalement[];
    count: number;
  }>;
  creatorInbox: AdminSource<CreatorInboxItem[]>;
  publishedEntries: AdminSource<PublishedPartnerAnnuaireEntry[]>;
  audit: AdminSource<AdminOperationAuditEntry[]>;
};

export type AdminAlert = {
  title: string;
  detail: string;
  action?: {
    href: string;
    label: string;
  };
};

const SOURCE_LABELS: Record<keyof AdminSources, string> = {
  actions: "actions",
  groupJoin: "demandes de participation",
  signalements: "signalements",
  creatorInbox: "inbox créateur",
  publishedEntries: "publications partenaires",
  audit: "journal d’audit",
};

function readAdminSource<T>(loader: () => Promise<T>): Promise<AdminSource<T>> {
  return loader()
    .then((data) => ({ status: "available", data }) as const)
    .catch(() => ({ status: "unavailable" }) as const);
}

async function loadPendingActions(): Promise<{
  items: PendingActionModerationRow[];
  count: number;
}> {
  const supabase = getSupabaseServerClient();
  const [itemsResult, countResult] = await Promise.all([
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
  ]);

  if (countResult.error) {
    throw new Error(countResult.error.message);
  }

  return {
    items: itemsResult,
    count: Number(countResult.count ?? 0),
  };
}

async function loadPendingGroupJoinRequests(): Promise<{ count: number }> {
  const supabase = getSupabaseServerClient();
  const result = await supabase
    .from("action_participants")
    .select("id", { count: "exact", head: true })
    .eq("participation_status", "pending");

  if (result.error) {
    throw new Error(result.error.message);
  }

  return { count: Number(result.count ?? 0) };
}

async function loadPendingSignalements(): Promise<{
  items: ModeratableSignalement[];
  count: number;
}> {
  const supabase = getSupabaseServerClient();
  return listModeratableSignalements(supabase, { status: "new", limit: 6 });
}

export async function loadAdminSources(): Promise<AdminSources> {
  const [actions, groupJoin, signalements, creatorInbox, publishedEntries, audit] =
    await Promise.all([
      readAdminSource(loadPendingActions),
      readAdminSource(loadPendingGroupJoinRequests),
      readAdminSource(loadPendingSignalements),
      readAdminSource(() => loadCreatorInboxItems()),
      readAdminSource(() => listPublishedPartnerAnnuaireEntries()),
      readAdminSource(() => listAdminOperationAudit(25)),
    ]);

  return {
    actions,
    groupJoin,
    signalements,
    creatorInbox,
    publishedEntries,
    audit,
  };
}

function isAvailable<T>(source: AdminSource<T>): source is { status: "available"; data: T } {
  return source.status === "available";
}

function combineAvailability(
  sources: Array<AdminSource<unknown>>,
): AdminOperationalMetricAvailability {
  const availableCount = sources.filter(isAvailable).length;
  if (availableCount === sources.length) return "available";
  if (availableCount === 0) return "unavailable";
  return "partial";
}

function combinedCount(
  sources: Array<AdminSource<{ count: number }>>,
): number | null {
  if (!sources.every(isAvailable)) return null;
  return sources.reduce((total, source) => total + source.data.count, 0);
}

export function getCreatorInboxNeedsAttention(items: CreatorInboxItem[]): CreatorInboxItem[] {
  return items.filter((item) => item.status === "pending" || item.status === "new");
}

export function getPendingPublishedEntries(
  entries: PublishedPartnerAnnuaireEntry[],
): PublishedPartnerAnnuaireEntry[] {
  return entries.filter((item) => item.publicationStatus === "pending_admin_review");
}

function formatModerationDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function unavailableSourceLabels(sources: AdminSources): string[] {
  return (Object.keys(SOURCE_LABELS) as Array<keyof AdminSources>)
    .filter((source) => sources[source].status === "unavailable")
    .map((source) => SOURCE_LABELS[source]);
}

export function buildAdminMetricItems(
  sources: AdminSources,
): AdminOperationalMetricItem[] {
  const creatorInboxNeedsAttention = isAvailable(sources.creatorInbox)
    ? getCreatorInboxNeedsAttention(sources.creatorInbox.data)
    : null;
  const pendingPublishedEntries = isAvailable(sources.publishedEntries)
    ? getPendingPublishedEntries(sources.publishedEntries.data)
    : null;
  const auditErrors = isAvailable(sources.audit)
    ? sources.audit.data.filter((item) => item.outcome === "error")
    : null;
  const actingSources = [
    sources.actions.status === "available"
      ? { status: "available", data: { count: sources.actions.data.count } }
      : sources.actions,
    sources.groupJoin,
  ] as Array<AdminSource<{ count: number }>>;
  const networkSources = [
    sources.creatorInbox.status === "available"
      ? { status: "available", data: { count: creatorInboxNeedsAttention?.length ?? 0 } }
      : sources.creatorInbox,
    sources.publishedEntries.status === "available"
      ? { status: "available", data: { count: pendingPublishedEntries?.length ?? 0 } }
      : sources.publishedEntries,
  ] as Array<AdminSource<{ count: number }>>;

  const metrics: AdminOperationalMetricItem[] = [
    {
      id: "acting",
      label: "Agir à traiter",
      value: combinedCount(actingSources),
      availability: combineAvailability(actingSources),
      description: "Actions pending et demandes de participation pending.",
    },
    {
      id: "signalements",
      label: "Signalements à traiter",
      value: isAvailable(sources.signalements) ? sources.signalements.data.count : null,
      availability: sources.signalements.status,
      description: "Spots et lieux propres en attente de modération.",
    },
    {
      id: "network",
      label: "Réseau à traiter",
      value: combinedCount(networkSources),
      availability: combineAvailability(networkSources),
      description: "Inbox créateur nécessitant attention et publications pending_admin_review.",
    },
    {
      id: "audit-incidents",
      label: "Incidents récents",
      value: auditErrors?.length ?? null,
      availability: sources.audit.status,
      description: "Opérations du journal d’audit dont le résultat est error.",
    },
  ];

  return metrics;
}

export function buildAdminAlert(sources: AdminSources): AdminAlert {
  const unavailable = unavailableSourceLabels(sources);
  if (unavailable.length > 0) {
    return {
      title: "Certaines files de modération sont temporairement indisponibles",
      detail: `Sources indisponibles : ${unavailable.join(", ")}. Les autres files restent affichées avec leur état réel.`,
      action: { href: "#moderation-par-bloc", label: "Voir les files" },
    };
  }

  if (
    !isAvailable(sources.actions) ||
    !isAvailable(sources.groupJoin) ||
    !isAvailable(sources.signalements) ||
    !isAvailable(sources.creatorInbox) ||
    !isAvailable(sources.publishedEntries) ||
    !isAvailable(sources.audit)
  ) {
    throw new Error("Admin source availability could not be resolved");
  }

  const auditErrors = sources.audit.data.filter((item) => item.outcome === "error");
  if (auditErrors.length > 0) {
    return {
      title: `${auditErrors.length} incident${auditErrors.length > 1 ? "s" : ""} récent${auditErrors.length > 1 ? "s" : ""} dans le journal d’audit`,
      detail: "Une ou plusieurs opérations administratives nécessitent une vérification.",
      action: { href: "#workflow-administration", label: "Voir le journal" },
    };
  }

  const pendingCount =
    sources.actions.data.count +
    sources.groupJoin.data.count +
    sources.signalements.data.count +
    getCreatorInboxNeedsAttention(sources.creatorInbox.data).length +
    getPendingPublishedEntries(sources.publishedEntries.data).length;
  if (pendingCount > 0) {
    return {
      title: `${pendingCount} élément${pendingCount > 1 ? "s" : ""} à traiter dans les files de modération`,
      detail: "Le backlog réel des files disponibles nécessite une action administrative.",
      action: { href: "#moderation-par-bloc", label: "Voir les files" },
    };
  }

  return {
    title: "Aucune urgence de modération détectée",
    detail: "Toutes les sources administratives ont répondu et les files sont vides.",
  };
}

export function buildModerationBlockSummaries(
  sources: AdminSources,
): ModerationBlockSummary[] {
  const creatorInboxNeedsAttention = isAvailable(sources.creatorInbox)
    ? getCreatorInboxNeedsAttention(sources.creatorInbox.data)
    : null;
  const pendingPublishedEntries = isAvailable(sources.publishedEntries)
    ? getPendingPublishedEntries(sources.publishedEntries.data)
    : null;
  const pendingAuditErrors = isAvailable(sources.audit)
    ? sources.audit.data.filter((item) => item.outcome === "error")
    : null;
  const networkAvailability = combineAvailability([
    sources.creatorInbox,
    sources.publishedEntries,
  ]);
  const actingAvailability = combineAvailability([sources.actions, sources.groupJoin]);

  return [
    {
      id: "reseau-discussions",
      number: 4,
      label: "Réseau & Discussions",
      count:
        creatorInboxNeedsAttention && pendingPublishedEntries
          ? creatorInboxNeedsAttention.length + pendingPublishedEntries.length
          : null,
      availability: networkAvailability,
      description:
        "Les demandes liées aux échanges, aux promotions et aux fiches partenaires restent centralisées ici.",
      href: "/admin/services",
      ctaLabel: "Ouvrir la revue",
      accent: "indigo",
      details: [
        creatorInboxNeedsAttention
          ? `${creatorInboxNeedsAttention.length} éléments de l’inbox créateur à traiter.`
          : "Inbox créateur indisponible.",
        pendingPublishedEntries
          ? `${pendingPublishedEntries.length} publications partenaires à revoir.`
          : "Publications partenaires indisponibles.",
      ],
      samples: [
        ...(creatorInboxNeedsAttention ?? []).slice(0, 2).map((item) => ({
          label: item.title,
          meta: `${item.sourceLabel} · ${formatModerationDate(item.createdAt)}`,
        })),
        ...(pendingPublishedEntries ?? []).slice(0, 1).map((item) => ({
          label: item.name,
          meta: `Publication ${item.publicationStatus} · ${formatModerationDate(item.publishedAt)}`,
        })),
      ],
    },
    {
      id: "cartographie-impact",
      number: 3,
      label: "Cartographie & Impact",
      count: isAvailable(sources.signalements) ? sources.signalements.data.count : null,
      availability: sources.signalements.status,
      description:
        "Les éléments cartographiques en attente restent visibles depuis ce bloc avant d’alimenter les vues publiques.",
      href: ADMIN_SIGNALEMENTS_MODERATION_HREF,
      ctaLabel: "Modérer les signalements",
      accent: "sky",
      details: [
        isAvailable(sources.signalements)
          ? `${sources.signalements.data.count} lieux ou spots à valider.`
          : "File des signalements indisponible.",
        isAvailable(sources.signalements)
          ? "Les entrées nouvelles restent en file jusqu’à validation."
          : "Aucun échantillon n’est affiché tant que la lecture n’a pas réussi.",
      ],
      samples: isAvailable(sources.signalements)
        ? sources.signalements.data.items.length > 0
          ? sources.signalements.data.items.slice(0, 3).map((spot) => ({
              label: spot.label,
              meta: `${spot.spot_type === "spot" ? "Spot" : "Lieu propre"} · ${spot.sourceTable} · ${formatModerationDate(spot.created_at)}`,
            }))
          : [{ label: "Aucun lieu en attente", meta: "La file est vide pour l’instant" }]
        : [],
    },
    {
      id: "agir",
      number: 2,
      label: "Agir",
      count:
        isAvailable(sources.actions) && isAvailable(sources.groupJoin)
          ? sources.actions.data.count + sources.groupJoin.data.count
          : null,
      availability: actingAvailability,
      description:
        "Les formulaires d’action et les demandes de participation sont consolidés ici avant traitement.",
      href: "/actions/history",
      ctaLabel: "Ouvrir la modération",
      accent: "emerald",
      details: [
        isAvailable(sources.actions)
          ? `${sources.actions.data.count} formulaires d’action en attente.`
          : "File des actions indisponible.",
        isAvailable(sources.groupJoin)
          ? `${sources.groupJoin.data.count} demandes de participation à traiter.`
          : "File des demandes de participation indisponible.",
        "Les comptes admin passent directement, les autres restent en file d’attente.",
      ],
      samples: [
        ...(isAvailable(sources.actions) ? sources.actions.data.items.slice(0, 2) : []).map(
          (action) => ({
            label: action.location_label,
            meta: `${formatModerationDate(action.action_date)} · ${action.volunteers_count} bénévoles · ${action.duration_minutes} min`,
          }),
        ),
        ...(isAvailable(sources.groupJoin)
          ? [
              {
                label: "File de participation",
                meta: `${sources.groupJoin.data.count} compte${sources.groupJoin.data.count > 1 ? "s" : ""} en attente`,
              },
            ]
          : []),
      ],
    },
    {
      id: "accueil-pilotage",
      number: 1,
      label: "Audit & supervision",
      count: pendingAuditErrors?.length ?? null,
      availability: sources.audit.status,
      description:
        "Le journal d’audit et les signaux de supervision restent regroupés ici pour relire les incidents.",
      href: "#workflow-administration",
      ctaLabel: "Voir le journal",
      accent: "rose",
      details: [
        pendingAuditErrors
          ? `${pendingAuditErrors.length} incident${pendingAuditErrors.length > 1 ? "s" : ""} récent${pendingAuditErrors.length > 1 ? "s" : ""} à relire.`
          : "Journal d’audit indisponible.",
        "Cette zone sert de filet pour les alertes transverses et la supervision.",
      ],
      samples: pendingAuditErrors
        ? pendingAuditErrors.length > 0
          ? pendingAuditErrors.slice(0, 2).map((item) => ({
              label: String(item.details["entityType"] ?? item.operationType),
              meta: `${item.operationType} · ${formatModerationDate(item.at)}`,
            }))
          : [{ label: "Aucun incident", meta: "La supervision est stable pour le moment" }]
        : [],
    },
  ];
}
