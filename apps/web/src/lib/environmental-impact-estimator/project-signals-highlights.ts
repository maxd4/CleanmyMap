import type {
  EnvironmentalImpactProjectSignal,
} from "./types";
import {
  countDistinct,
  countTrainingPhotos,
} from "./project-signals-helpers";
import { summarizeFunnelRows } from "./project-signals-funnel";
import {
  buildProjectSignalActivityCounts,
  type ProjectSignalRows,
} from "./project-signals.calculations";

type HighlightContext = {
  funnelAggregate: ReturnType<typeof summarizeFunnelRows>;
  allTrainingPhotos: number;
  recentEmailCount: number;
  communityEventCount: number;
  rsvpCount: number;
  notificationCount: number;
  unreadNotificationCount: number;
  routeCount: number;
  activeUserCount: number;
};

function buildHighlightContext(rows: ProjectSignalRows): HighlightContext {
  const actionById = new Map(rows.actions.map((row) => [row.id, row.created_by_clerk_id]));
  const funnelAggregate =
    rows.funnelAggregate ?? rows.funnelSignalSummary?.allTime ?? summarizeFunnelRows(rows.funnelEvents);

  const allTrainingPhotos = rows.trainingExamples.reduce(
    (acc, row) => acc + countTrainingPhotos(row.photos),
    0,
  );
  const activity = buildProjectSignalActivityCounts(rows);
  const recentEmailCount = activity.sentEmailCount;
  const routeCount = funnelAggregate.distinctRouteCount;
  const activeUserCount = countDistinct([
    ...funnelAggregate.userIds,
    ...rows.progressionEvents.map((row) => row.user_id),
    ...rows.actions.map((row) => row.created_by_clerk_id),
    ...rows.spots.map((row) => row.created_by_clerk_id),
    ...rows.reports.map((row) => row.owner_clerk_id),
    ...rows.serviceEmails.map((row) => row.actor_user_id),
    ...rows.trainingExamples.map((row) => actionById.get(row.action_id) ?? null),
  ]);

  return {
    funnelAggregate,
    allTrainingPhotos,
    recentEmailCount,
    communityEventCount: activity.communityEventCount,
    rsvpCount: activity.rsvpCount,
    notificationCount: activity.notificationCount,
    unreadNotificationCount: activity.unreadNotificationCount,
    routeCount,
    activeUserCount,
  };
}

function buildTrafficHighlights(context: HighlightContext): EnvironmentalImpactProjectSignal[] {
  return [
    {
      label: "Pages vues CleanMyMap",
      value:
        context.funnelAggregate.detailedPageViewCount > 0
          ? context.funnelAggregate.detailedPageViewCount
          : context.funnelAggregate.legacyPageViewCount,
      detail:
        "Signal route-level prioritaire via page_view, avec fallback sur les vues de tunnel view_new.",
      basis: "all_time",
    },
    {
      label: "Pages vues tunnel",
      value: context.funnelAggregate.legacyPageViewCount,
      detail: "Vues de démarrage de formulaire conservées pour l'audit historique.",
      basis: "all_time",
    },
    {
      label: "Routes distinctes",
      value: context.routeCount,
      detail: "Nombre de chemins uniques capturés dans les métadonnées de page_view.",
      basis: "derived",
    },
  ];
}

function buildActivityHighlights(
  rows: ProjectSignalRows,
  context: HighlightContext,
): EnvironmentalImpactProjectSignal[] {
  return [
    {
      label: "Actions terrain",
      value: rows.actions.length,
      detail: "Inclut les actions validées et les actions en attente déposées par le projet.",
      basis: "all_time",
    },
    {
      label: "Images stockées",
      value: context.allTrainingPhotos,
      detail: "Comptées depuis training_examples via les photos réellement attachées aux actions.",
      basis: "all_time",
    },
    {
      label: "Exports PDF",
      value: rows.reports.filter((row) => row.file_kind === "pdf").length,
      detail: "Mesure issue de la table reports pour les livrables PDF produits par le site.",
      basis: "all_time",
    },
    {
      label: "Emails Resend",
      value: context.recentEmailCount,
      detail: "Journalisation persistée des envois du service email centralisé.",
      basis: "recent",
    },
  ];
}

function buildAiHighlight(rows: ProjectSignalRows): EnvironmentalImpactProjectSignal {
  return {
    label: "Appels IA",
    value: rows.trainingExamples.filter((row) => countTrainingPhotos(row.photos) > 0).length,
    detail: "Proxy CleanMyMap basé sur les analyses vision/training réellement branchées.",
    basis: "all_time",
  };
}

function buildCommunityHighlights(context: HighlightContext): EnvironmentalImpactProjectSignal[] {
  return [
    {
      label: "Événements communauté",
      value: context.communityEventCount,
      detail: "Tables community_events utilisées comme signal social propre au projet.",
      basis: "all_time",
    },
    {
      label: "RSVP communauté",
      value: context.rsvpCount,
      detail: "Réponses enregistrées dans event_rsvps avec mise à jour horodatée.",
      basis: "all_time",
    },
    {
      label: "Notifications app",
      value: context.notificationCount,
      detail: "Messages persistés dans app_notifications pour les flux communautaires et système.",
      basis: "all_time",
    },
    {
      label: "Notifications non lues",
      value: context.unreadNotificationCount,
      detail: "Sous-ensemble des notifications encore actives dans la boîte de réception.",
      basis: "recent",
    },
  ];
}

function buildIdentityHighlight(context: HighlightContext): EnvironmentalImpactProjectSignal {
  return {
    label: "Utilisateurs actifs",
    value: context.activeUserCount,
    detail: "Agrégation des identités présentes dans les tables opérationnelles du projet.",
    basis: "recent",
  };
}

export function buildProjectSignalsHighlights(
  rows: ProjectSignalRows,
): EnvironmentalImpactProjectSignal[] {
  const context = buildHighlightContext(rows);

  return [
    ...buildTrafficHighlights(context),
    ...buildActivityHighlights(rows, context),
    ...buildCommunityHighlights(context),
    buildAiHighlight(rows),
    buildIdentityHighlight(context),
  ];
}
