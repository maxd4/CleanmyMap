import type { ActionPhase } from "@/lib/actions/types";
import type { JoinableActionItem } from "@/lib/actions/participation/group-participation";

export type ActionCardStatus = "open" | "pending" | "closed" | "confirmed" | "cancelled" | "completed";

export function getActionDisplayStatus(item: JoinableActionItem): "open" | "pending" | "closed" | "confirmed" {
  if (item.status === "cancelled") {
    return "closed";
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
export function getCardDisplayStatus(item: JoinableActionItem): ActionCardStatus {
  if (item.status === "cancelled" || item.participationStatus === "cancelled") {
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

export function getRegistrationStatusLabel(status: ActionCardStatus, fr: boolean): string {
  switch (status) {
    case "pending":
      return fr ? "Demande d'inscription" : "Registration request";
    case "confirmed":
      return fr ? "Inscription confirmée" : "Registration confirmed";
    case "closed":
      return fr ? "Inscriptions fermées" : "Registrations closed";
    case "cancelled":
      return fr ? "Inscription annulée" : "Registration cancelled";
    case "completed":
      return fr ? "Inscription clôturée" : "Registration closed";
    case "open":
    default:
      return fr ? "Inscriptions ouvertes" : "Registrations open";
  }
}

export function getParticipationStatusLabel(status: ActionCardStatus, fr: boolean): string {
  switch (status) {
    case "pending":
      return fr ? "Participation à confirmer" : "Participation awaiting confirmation";
    case "confirmed":
      return fr ? "Participation confirmée" : "Participation confirmed";
    case "cancelled":
      return fr ? "Demande refusée" : "Request refused";
    case "closed":
    case "completed":
    case "open":
    default:
      return fr ? "Participation indisponible" : "Participation unavailable";
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
