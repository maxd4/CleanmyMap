import type { ActionPhase } from "@/lib/actions/types";
import type { JoinableActionItem } from "@/lib/actions/participation/group-participation";

export type ActionCardStatus = "open" | "pending" | "closed" | "confirmed" | "cancelled" | "completed";

export function getActionDisplayStatus(item: JoinableActionItem): "open" | "pending" | "closed" | "confirmed" {
  if (item.joined) {
    return "confirmed";
  }
  if (item.awaitingApproval) {
    return "pending";
  }
  if (!item.groupJoinEnabled) {
    return "closed";
  }
  return "open";
}
export function getCardDisplayStatus(item: JoinableActionItem): ActionCardStatus {
  if (item.participationStatus === "cancelled") {
    return "cancelled";
  }

  if (item.joined) {
    return "confirmed";
  }

  if (item.awaitingApproval) {
    return "pending";
  }

  if (!item.groupJoinEnabled) {
    return "closed";
  }

  return "open";
}

export function getStatusLabel(status: ActionCardStatus, fr: boolean): string {
  switch (status) {
    case "pending":
      return fr ? "En attente" : "Pending";
    case "closed":
      return fr ? "Fermée" : "Closed";
    case "confirmed":
      return fr ? "Confirmée" : "Confirmed";
    case "cancelled":
      return fr ? "Annulée" : "Cancelled";
    case "completed":
      return fr ? "Complétée" : "Completed";
    case "open":
    default:
      return fr ? "Ouverte" : "Open";
  }
}

export function getStatusDotTone(status: ActionCardStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-500";
    case "closed":
    case "cancelled":
      return "bg-slate-400";
    case "confirmed":
      return "bg-emerald-600";
    case "completed":
      return "bg-emerald-500";
    case "open":
    default:
      return "bg-emerald-500";
  }
}

export function getLifecycleLabel(actionPhase: ActionPhase, fr: boolean): string {
  switch (actionPhase) {
    case "pre_action":
      return fr ? "Pré-action" : "Pre-action";
    case "post_action_draft":
      return fr ? "À compléter après action" : "To complete after action";
    case "post_action_complete":
    default:
      return fr ? "Déclaration complète" : "Complete declaration";
  }
}
