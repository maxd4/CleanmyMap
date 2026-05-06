import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import type { Locale } from "@/lib/ui/preferences";

export type DashboardRecommendedAction = {
  href: string;
  label: string;
  reason: string;
};

export type DashboardTodayTile = {
  label: string;
  title: string;
  detail: string;
  meta: string;
};

export type DashboardActionTile = DashboardTodayTile & {
  href: string;
};

export type DashboardTodayReadyState = {
  kind: "ready";
  syncedAtLabel: string;
  latestActivity: DashboardTodayTile;
  validation: DashboardTodayTile;
  nextAction: DashboardActionTile;
};

export type DashboardTodayEmptyState = {
  kind: "empty";
  syncedAtLabel: string;
  message: string;
  nextAction: DashboardActionTile;
};

export type DashboardTodayErrorState = {
  kind: "error";
  message: string;
  nextAction: DashboardActionTile;
};

export type DashboardTodayState =
  | DashboardTodayReadyState
  | DashboardTodayEmptyState
  | DashboardTodayErrorState;

function toDateTimeFormat(locale: Locale): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateFormat(locale: Locale): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function toNumberFormat(locale: Locale): Intl.NumberFormat {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function text(locale: Locale, fr: string, en: string): string {
  return locale === "fr" ? fr : en;
}

function formatStatusLabel(
  status: ActionDataContract["status"],
  locale: Locale,
): string {
  if (status === "approved") {
    return text(locale, "validée", "approved");
  }
  if (status === "rejected") {
    return text(locale, "refusée", "rejected");
  }
  return text(locale, "en attente", "pending");
}

function formatSourceLabel(source: string, locale: Locale): string {
  if (source === "actions") {
    return text(locale, "Actions terrain", "Field actions");
  }
  if (source === "spots") {
    return text(locale, "Signalements", "Reports");
  }
  if (source === "local") {
    return text(locale, "Import local", "Local import");
  }
  return source;
}

function formatTypeLabel(contract: ActionDataContract, locale: Locale): string {
  if (contract.type === "clean_place") {
    return text(locale, "Dépollution", "Cleanup");
  }
  if (contract.type === "spot") {
    return text(locale, "Signalement", "Report");
  }
  return text(locale, "Action terrain", "Field action");
}

function formatActivityMeta(contract: ActionDataContract, locale: Locale): string {
  const parts = [
    toDateFormat(locale).format(new Date(contract.dates.observedAt)),
    formatSourceLabel(contract.source, locale),
    formatStatusLabel(contract.status, locale),
  ];
  return parts.join(" · ");
}

function formatActivityDetail(
  contract: ActionDataContract,
  locale: Locale,
): string {
  const parts = [formatTypeLabel(contract, locale), contract.location.label];
  if (contract.metadata.wasteKg > 0) {
    parts.push(`${toNumberFormat(locale).format(contract.metadata.wasteKg)} kg`);
  }
  if (contract.metadata.volunteersCount > 0) {
    parts.push(
      `${contract.metadata.volunteersCount} ${text(locale, "bénévoles", "volunteers")}`,
    );
  }
  return parts.join(" · ");
}

function pickLatestContract(
  contracts: ActionDataContract[],
): ActionDataContract | null {
  if (contracts.length === 0) {
    return null;
  }

  return [...contracts].sort((a, b) =>
    b.dates.observedAt.localeCompare(a.dates.observedAt),
  )[0];
}

function buildRecommendedActionTile(
  action: DashboardRecommendedAction,
  locale: Locale,
): DashboardActionTile {
  return {
    label: text(locale, "Prochaine action", "Next action"),
    title: action.label,
    detail: action.reason,
    meta: text(locale, "Ouvrir maintenant", "Open now"),
    href: action.href,
  };
}

export function buildDashboardTodayState(params: {
  overview: PilotageOverview | null;
  locale: Locale;
  recommendedAction: DashboardRecommendedAction;
  errorMessage?: string;
}): DashboardTodayState {
  if (!params.overview) {
    return {
      kind: "error",
      message:
        params.errorMessage ??
        text(
          params.locale,
          "Les indicateurs du tableau de bord sont indisponibles pour le moment.",
          "Dashboard indicators are temporarily unavailable.",
        ),
      nextAction: buildRecommendedActionTile(
        params.recommendedAction,
        params.locale,
      ),
    };
  }

  const latestContract = pickLatestContract(params.overview.contracts);
  const syncedAtLabel = toDateTimeFormat(params.locale).format(
    new Date(params.overview.generatedAt),
  );

  if (!latestContract) {
    return {
      kind: "empty",
      syncedAtLabel,
      message: text(
        params.locale,
        "Aucune activité récente n'a été trouvée sur cette période.",
        "No recent activity was found for this period.",
      ),
      nextAction: buildRecommendedActionTile(
        params.recommendedAction,
        params.locale,
      ),
    };
  }

  const actorLabel =
    latestContract.metadata.actorName?.trim() ||
    latestContract.metadata.associationName?.trim() ||
    formatSourceLabel(latestContract.source, params.locale);
  const pendingCount = params.overview.comparison.current.pendingCount;
  const approvedCount = params.overview.comparison.current.approvedActions;
  const moderationDelay = params.overview.comparison.current.moderationDelayDays;
  const reliabilityLabel = text(
    params.locale,
    params.overview.comparison.current.reliability.level === "elevee"
      ? "fiabilité élevée"
      : params.overview.comparison.current.reliability.level === "moyenne"
        ? "fiabilité moyenne"
        : "lecture prudente",
    params.overview.comparison.current.reliability.level === "elevee"
      ? "high reliability"
      : params.overview.comparison.current.reliability.level === "moyenne"
        ? "medium reliability"
        : "cautious reading",
  );

  return {
    kind: "ready",
    syncedAtLabel,
    latestActivity: {
      label: text(params.locale, "Dernière activité", "Latest activity"),
      title: actorLabel,
      detail: formatActivityDetail(latestContract, params.locale),
      meta: formatActivityMeta(latestContract, params.locale),
    },
    validation: {
      label: text(params.locale, "Éléments à traiter", "Items to review"),
      title:
        pendingCount > 0
          ? text(params.locale, `${pendingCount} en attente`, `${pendingCount} pending`)
          : text(params.locale, "Aucun élément en attente", "No pending items"),
      detail: text(
        params.locale,
        `${approvedCount} validées · délai médian ${moderationDelay.toFixed(1)} j`,
        `${approvedCount} approved · median delay ${moderationDelay.toFixed(1)} d`,
      ),
      meta: text(
        params.locale,
        `Fiabilité ${reliabilityLabel}`,
        `Reliability ${reliabilityLabel}`,
      ),
    },
    nextAction: {
      ...buildRecommendedActionTile(params.recommendedAction, params.locale),
      meta: text(params.locale, "À ouvrir maintenant", "Open now"),
    },
  };
}
