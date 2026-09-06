import type { JoinableActionItem } from "@/lib/actions/participation/group-participation";
import { getActionDisplayStatus } from "./rejoindre-un-formulaire-section.status";

export type LocationFilter = "all" | "ile-de-france" | "autres";

export type PeriodFilter = "all" | "seven-days" | "thirty-days" | "ninety-days";

export type JoinableActionJoinFilter = "all" | "available" | "joined";

export type JoinableActionSort = "soonest" | "latest" | "participants-desc" | "participants-asc" | "location-asc";

export type JoinableActionQuery = {
  search: string;
  joinFilter: JoinableActionJoinFilter;
  sort: JoinableActionSort;
  focusActionId: string | null;
  locale: "fr" | "en";
};

export function getLocationFilterBucket(label: string): LocationFilter {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    normalized.includes("paris") ||
    normalized.includes("meudon") ||
    normalized.includes("belleville") ||
    normalized.includes("seine") ||
    normalized.includes("ile-de-france")
  ) {
    return "ile-de-france";
  }

  return "autres";
}

export function isWithinPeriod(actionDate: string, period: PeriodFilter): boolean {
  if (period === "all") {
    return true;
  }

  const parsedActionDate = new Date(`${actionDate}T12:00:00Z`);
  if (Number.isNaN(parsedActionDate.getTime())) {
    return true;
  }

  const now = new Date();
  const diffInDays = (parsedActionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  switch (period) {
    case "seven-days":
      return diffInDays <= 7;
    case "thirty-days":
      return diffInDays <= 30;
    case "ninety-days":
      return diffInDays <= 90;
    default:
      return true;
  }
}

export function sortItemsByStatusRank(items: JoinableActionItem[]): JoinableActionItem[] {
  return [...items].sort((left, right) => {
    const leftRank = getActionDisplayStatus(left) === "open"
      ? 0
      : getActionDisplayStatus(left) === "pending"
        ? 1
        : getActionDisplayStatus(left) === "confirmed"
          ? 2
          : 3;
    const rightRank = getActionDisplayStatus(right) === "open"
      ? 0
      : getActionDisplayStatus(right) === "pending"
        ? 1
        : getActionDisplayStatus(right) === "confirmed"
          ? 2
          : 3;
    return leftRank - rightRank;
  });
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatSearchableDate(dateValue: string, locale: "fr" | "en"): string {
  const parsed = new Date(`${dateValue}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function compareByDate(left: JoinableActionItem, right: JoinableActionItem, ascending: boolean): number {
  const leftDate = `${left.action_date}T00:00:00Z`;
  const rightDate = `${right.action_date}T00:00:00Z`;
  const dateDiff = new Date(leftDate).getTime() - new Date(rightDate).getTime();
  if (dateDiff !== 0) {
    return ascending ? dateDiff : -dateDiff;
  }

  const createdDiff = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
  if (createdDiff !== 0) {
    return ascending ? createdDiff : -createdDiff;
  }

  return left.id.localeCompare(right.id, "fr");
}

function compareByParticipants(left: JoinableActionItem, right: JoinableActionItem, ascending: boolean): number {
  const participantsDiff = left.participantsCount - right.participantsCount;
  if (participantsDiff !== 0) {
    return ascending ? participantsDiff : -participantsDiff;
  }

  return compareByDate(left, right, true);
}

function compareByLocation(left: JoinableActionItem, right: JoinableActionItem): number {
  const locationDiff = left.location_label.localeCompare(right.location_label, "fr", {
    sensitivity: "base",
  });
  if (locationDiff !== 0) {
    return locationDiff;
  }

  return compareByDate(left, right, true);
}

function buildSearchableText(item: JoinableActionItem, locale: "fr" | "en"): string {
  const phaseLabel =
    item.actionPhase === "pre_action"
      ? locale === "fr"
        ? "pré action"
        : "pre action"
      : item.actionPhase === "post_action_draft"
        ? locale === "fr"
          ? "a compléter"
          : "to complete"
        : locale === "fr"
          ? "declaration complete"
          : "complete declaration";

  return normalizeSearchText(
    [
      item.location_label,
      item.action_date,
      formatSearchableDate(item.action_date, locale),
      phaseLabel,
      item.participantsCount.toString(),
      item.pendingRequestsCount.toString(),
      item.volunteers_count.toString(),
      item.duration_minutes.toString(),
      item.awaitingApproval
        ? "en attente approbation"
        : item.joined
          ? "deja rejoint"
          : "a rejoindre",
      item.groupJoinEnabled ? "ouverte" : "fermee",
    ].join(" "),
  );
}

function compareJoinableActions(
  left: JoinableActionItem,
  right: JoinableActionItem,
  sort: JoinableActionSort,
): number {
  switch (sort) {
    case "latest":
      return compareByDate(left, right, false);
    case "participants-desc":
      return compareByParticipants(left, right, false);
    case "participants-asc":
      return compareByParticipants(left, right, true);
    case "location-asc":
      return compareByLocation(left, right);
    case "soonest":
    default:
      return compareByDate(left, right, true);
  }
}

export function filterAndSortJoinableActions(
  items: JoinableActionItem[],
  query: JoinableActionQuery,
): JoinableActionItem[] {
  const normalizedSearch = normalizeSearchText(query.search);
  const filtered = items.filter((item) => {
    if (query.joinFilter === "available" && (item.joined || item.awaitingApproval)) {
      return false;
    }

    if (query.joinFilter === "joined" && !item.joined) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return buildSearchableText(item, query.locale).includes(normalizedSearch);
  });

  const ordered = [...filtered].sort((left, right) => compareJoinableActions(left, right, query.sort));

  if (!query.focusActionId) {
    return ordered;
  }

  const focusIndex = ordered.findIndex((item) => item.id === query.focusActionId);
  if (focusIndex <= 0) {
    return ordered;
  }

  const [focused] = ordered.splice(focusIndex, 1);
  return [focused, ...ordered];
}
