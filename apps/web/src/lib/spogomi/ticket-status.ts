export type CachanTicketStatusClassification =
  | "eligible"
  | "cancelled"
  | "pending"
  | "absent"
  | "unknown";

export type CachanTicketDeletionClassification =
  | "deleted"
  | "not_deleted"
  | "absent"
  | "unknown";

function normalizeTicketLabel(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim()
    .replace(/\s+/g, " ");
}

// This registry is deliberately limited to labels present in the synthetic
// Cachan contract and the statuses explicitly handled by the import workflow.
// It is not a universal Weezevent vocabulary.
const ELIGIBLE_STATUSES = new Set(["paye", "paid", "registered"]);
const CANCELLED_STATUSES = new Set(["annule", "cancelled", "canceled", "supprime", "deleted", "rembourse", "refunded"]);
const PENDING_STATUSES = new Set(["en attente", "pending", "awaiting payment"]);

export function classifyCachanTicketStatus(value: string | null | undefined): CachanTicketStatusClassification {
  const normalized = normalizeTicketLabel(value);
  if (!normalized) return "absent";
  if (ELIGIBLE_STATUSES.has(normalized)) return "eligible";
  if (CANCELLED_STATUSES.has(normalized)) return "cancelled";
  if (PENDING_STATUSES.has(normalized)) return "pending";
  return "unknown";
}

export function classifyCachanTicketDeletion(value: string | null | undefined): CachanTicketDeletionClassification {
  const normalized = normalizeTicketLabel(value);
  if (!normalized) return "absent";
  if (["1", "oui", "yes", "true", "vrai", "supprime", "deleted", "annule", "cancelled", "canceled"].includes(normalized)) return "deleted";
  if (["0", "non", "no", "false", "faux"].includes(normalized)) return "not_deleted";
  return "unknown";
}

export function isCancelledCachanTicketStatus(value: string | null | undefined): boolean {
  return classifyCachanTicketStatus(value) === "cancelled";
}

export function isCancelledCachanTicket(status: string | null | undefined, deleted: boolean | null | undefined): boolean {
  return deleted === true || isCancelledCachanTicketStatus(status);
}
