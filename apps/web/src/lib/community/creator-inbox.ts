import type { BugReportRecord } from "@/lib/community/bug-reports-store";
import type { PromotionRequestRecord } from "@/lib/admin/promotion-requests-store";
import type { PartnerOnboardingRequestRecord } from "@/lib/partners/onboarding-requests-store";
import type { ClerkUserIdentity } from "@/lib/services/clerk";
import type { CommunityEventRow } from "@/types/database";

export type CreatorInboxSource = "feedback" | "promotion" | "partner" | "event";

export type CreatorInboxStatus =
  | "new"
  | "pending"
  | "accepted"
  | "rejected"
  | "responded"
  | "treated"
  | "archived";

export type CreatorInboxItemDetail = {
  label: string;
  value: string;
};

export type CreatorInboxItem = {
  id: string;
  source: CreatorInboxSource;
  sourceLabel: string;
  sourceRecordId: string;
  title: string;
  subtitle: string | null;
  authorName: string;
  authorEmail: string | null;
  authorRole: string | null;
  createdAt: string;
  pagePath: string | null;
  status: CreatorInboxStatus;
  sourceStatus: string;
  priority: "normal" | "high";
  context: string;
  details: CreatorInboxItemDetail[];
  canDelete: boolean;
  canReview: boolean;
  hasReplyTarget: boolean;
};

const STATUS_LABELS: Record<CreatorInboxStatus, { fr: string; en: string }> = {
  new: { fr: "Nouveau", en: "New" },
  pending: { fr: "En attente", en: "Pending" },
  accepted: { fr: "Accepté", en: "Accepted" },
  rejected: { fr: "Refusé", en: "Rejected" },
  responded: { fr: "Répondu", en: "Responded" },
  treated: { fr: "Traité", en: "Treated" },
  archived: { fr: "Archivé", en: "Archived" },
};

const SOURCE_LABELS: Record<CreatorInboxSource, { fr: string; en: string }> = {
  feedback: { fr: "Feedback", en: "Feedback" },
  promotion: { fr: "Promotion", en: "Promotion" },
  partner: { fr: "Partenariat", en: "Partnership" },
  event: { fr: "Événement", en: "Event" },
};

function normalizeCreatorState(
  value: unknown,
  fallback: CreatorInboxStatus,
): CreatorInboxStatus {
  if (
    value === "new" ||
    value === "pending" ||
    value === "accepted" ||
    value === "rejected" ||
    value === "responded" ||
    value === "treated" ||
    value === "archived"
  ) {
    return value;
  }
  return fallback;
}

function mapSourceState(
  value: string | null | undefined,
  fallback: CreatorInboxStatus,
): CreatorInboxStatus {
  if (value === "accepted") return "accepted";
  if (value === "rejected") return "rejected";
  if (value === "treated") return "treated";
  if (value === "archived") return "archived";
  if (value === "pending_owner_review" || value === "pending_admin_review") {
    return "pending";
  }
  if (value === "open" || value === "new") {
    return "new";
  }
  return fallback;
}

function buildCommonDetails(params: {
  sourceLabel: string;
  sourceStatus: string;
  pagePath: string | null;
  createdAt: string;
  authorRole: string | null;
}): CreatorInboxItemDetail[] {
  return [
    { label: "Source", value: params.sourceLabel },
    { label: "Statut source", value: params.sourceStatus },
    { label: "Page", value: params.pagePath ?? "non communiquée" },
    { label: "Date", value: new Date(params.createdAt).toLocaleString("fr-FR") },
    { label: "Rôle", value: params.authorRole ?? "non communiqué" },
  ];
}

export function formatCreatorInboxStatusLabel(
  status: CreatorInboxStatus,
  locale: "fr" | "en",
): string {
  return STATUS_LABELS[status][locale];
}

export function formatCreatorInboxSourceLabel(
  source: CreatorInboxSource,
  locale: "fr" | "en",
): string {
  return SOURCE_LABELS[source][locale];
}

export function summarizeCreatorInboxItem(
  item: CreatorInboxItem,
  locale: "fr" | "en",
): string {
  const lines = [
    `Source: ${formatCreatorInboxSourceLabel(item.source, locale)}`,
    `Auteur: ${item.authorName}`,
    `Email: ${item.authorEmail ?? "non communiqué"}`,
    `Rôle: ${item.authorRole ?? "non communiqué"}`,
    `Statut: ${formatCreatorInboxStatusLabel(item.status, locale)}`,
    `Page: ${item.pagePath ?? "non communiquée"}`,
    `Titre: ${item.title}`,
    `Contexte: ${item.context}`,
  ];
  if (item.subtitle) {
    lines.splice(6, 0, `Sous-titre: ${item.subtitle}`);
  }
  for (const detail of item.details) {
    if (detail.label !== "Source" && detail.label !== "Statut source" && detail.label !== "Page" && detail.label !== "Date" && detail.label !== "Rôle") {
      lines.push(`${detail.label}: ${detail.value}`);
    }
  }
  return lines.join("\n");
}

export function buildFeedbackInboxItem(record: BugReportRecord): CreatorInboxItem {
  const sourceStatus = record.status;
  const status = normalizeCreatorState(
    record.creatorState,
    mapSourceState(sourceStatus, "new"),
  );
  return {
    id: `feedback-${record.id}`,
    source: "feedback",
    sourceLabel: SOURCE_LABELS.feedback.fr,
    sourceRecordId: record.id,
    title: record.title,
    subtitle: record.reportType === "bug" ? "Bug" : record.reportType === "improvement" ? "Amélioration" : record.reportType === "collaboration" ? "Collaboration" : "Idée",
    authorName: record.submittedByDisplayName,
    authorEmail: record.submittedByEmail,
    authorRole: record.submittedByRole,
    createdAt: record.createdAt,
    pagePath: record.pagePath,
    status,
    sourceStatus,
    priority: record.reportType === "bug" ? "high" : "normal",
    context: record.description,
    details: buildCommonDetails({
      sourceLabel: SOURCE_LABELS.feedback.fr,
      sourceStatus,
      pagePath: record.pagePath,
      createdAt: record.createdAt,
      authorRole: record.submittedByRole,
    }),
    canDelete: true,
    canReview: false,
    hasReplyTarget: Boolean(record.submittedByEmail),
  };
}

export function buildPromotionInboxItem(record: PromotionRequestRecord): CreatorInboxItem {
  const sourceStatus = record.status;
  const status = normalizeCreatorState(
    record.creatorState,
    mapSourceState(sourceStatus, "pending"),
  );
  return {
    id: `promotion-${record.id}`,
    source: "promotion",
    sourceLabel: SOURCE_LABELS.promotion.fr,
    sourceRecordId: record.id,
    title: `${record.submittedByDisplayName} · ${record.requestedRole}`,
    subtitle: record.submittedByRole,
    authorName: record.submittedByDisplayName,
    authorEmail: record.submittedByEmail,
    authorRole: record.submittedByRole,
    createdAt: record.createdAt,
    pagePath: null,
    status,
    sourceStatus,
    priority: "high",
    context: record.motivation,
    details: buildCommonDetails({
      sourceLabel: SOURCE_LABELS.promotion.fr,
      sourceStatus,
      pagePath: null,
      createdAt: record.createdAt,
      authorRole: record.submittedByRole,
    }),
    canDelete: false,
    canReview: true,
    hasReplyTarget: Boolean(record.submittedByEmail),
  };
}

export function buildPartnerInboxItem(record: PartnerOnboardingRequestRecord): CreatorInboxItem {
  const sourceStatus = record.status;
  const status = normalizeCreatorState(
    record.creatorState,
    mapSourceState(sourceStatus, "pending"),
  );
  const resolvedEmail =
    record.submittedByEmail ??
    (record.contactDetails.includes("@") ? record.contactDetails : null);
  return {
    id: `partner-${record.id}`,
    source: "partner",
    sourceLabel: SOURCE_LABELS.partner.fr,
    sourceRecordId: record.id,
    title: record.organizationName,
    subtitle: record.organizationType,
    authorName: record.contactName || record.organizationName,
    authorEmail: resolvedEmail,
    authorRole: null,
    createdAt: record.createdAt,
    pagePath: null,
    status,
    sourceStatus,
    priority: "high",
    context: record.motivation,
    details: [
      ...buildCommonDetails({
        sourceLabel: SOURCE_LABELS.partner.fr,
        sourceStatus,
        pagePath: null,
        createdAt: record.createdAt,
        authorRole: null,
      }),
      { label: "Structure", value: record.organizationType },
      { label: "Identité", value: record.legalIdentity },
      { label: "Contact", value: `${record.contactName} · ${record.contactChannel} · ${record.contactDetails}` },
    ],
    canDelete: false,
    canReview: true,
    hasReplyTarget: Boolean(resolvedEmail),
  };
}

export function buildEventInboxItem(
  event: CommunityEventRow,
  organizer: ClerkUserIdentity,
): CreatorInboxItem {
  return {
    id: `event-${event.id}`,
    source: "event",
    sourceLabel: SOURCE_LABELS.event.fr,
    sourceRecordId: event.id,
    title: event.title,
    subtitle: event.location_label,
    authorName: organizer.displayName,
    authorEmail: null,
    authorRole: organizer.userId ? "organizer" : null,
    createdAt: event.created_at,
    pagePath: null,
    status: "new",
    sourceStatus: "created",
    priority: "normal",
    context: event.description ?? "non communiquée",
    details: [
      ...buildCommonDetails({
        sourceLabel: SOURCE_LABELS.event.fr,
        sourceStatus: "created",
        pagePath: null,
        createdAt: event.created_at,
        authorRole: organizer.userId ? "organizer" : null,
      }),
      { label: "Date événement", value: event.event_date },
      { label: "Lieu", value: event.location_label },
    ],
    canDelete: false,
    canReview: false,
    hasReplyTarget: false,
  };
}
