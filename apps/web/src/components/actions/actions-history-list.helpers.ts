import type { ActionListItem, ActionQualityGrade } from "@/lib/actions/types";

export function formatDate(value: string, locale: "fr" | "en" = "fr"): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
  }).format(parsed);
}

export function formatRecordType(item: ActionListItem): string {
  if (item.record_type === "clean_place") {
    return "lieu propre";
  }

  if (item.record_type === "other") {
    return "spot";
  }

  return "action";
}

export function buildJoinHref(actionId: string): string {
  return `/sections/rejoindre-un-formulaire?actionId=${encodeURIComponent(actionId)}`;
}

export function isJoinableAction(item: ActionListItem): boolean {
  return item.record_type === "action" && item.contract?.metadata.groupJoinEnabled === true;
}

export function isOwnedByCurrentUser(
  item: ActionListItem,
  currentUserId: string | null,
): boolean {
  return Boolean(currentUserId && item.created_by_clerk_id === currentUserId);
}

export function canManageGroupJoin(
  item: ActionListItem,
  currentUserId: string | null,
  isAdminLikeUser: boolean,
): boolean {
  return Boolean(
    item.status === "approved" &&
      item.record_type === "action" &&
      (isAdminLikeUser || isOwnedByCurrentUser(item, currentUserId)),
  );
}

export function qualityTone(grade: ActionQualityGrade): string {
  if (grade === "A") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (grade === "B") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

export function rowTone(grade: ActionQualityGrade | null): string {
  if (grade === "A") {
    return "bg-emerald-50/40";
  }

  if (grade === "B") {
    return "bg-amber-50/40";
  }

  if (grade === "C") {
    return "bg-rose-50/40";
  }

  return "";
}
