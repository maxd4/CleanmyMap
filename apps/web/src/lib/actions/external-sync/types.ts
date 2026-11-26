export const EXTERNAL_ACTION_SOURCE_IDS = ["jagis_pour_la_nature", "fondation_de_la_mer"] as const;
export type ExternalActionSourceId = (typeof EXTERNAL_ACTION_SOURCE_IDS)[number];

export type ExternalActionEvent = {
  source: ExternalActionSourceId;
  externalId: string;
  externalUrl: string;
  title: string;
  description?: string | null;
  actionDate: string;
  startTime?: string | null;
  endTime?: string | null;
  timezone: "Europe/Paris";
  meetingPoint?: string | null;
  commune?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  activityType?: string | null;
  registrationUrl?: string | null;
  routeReference?: string | null;
  crossReferences?: string[];
  sourceRevision?: string | null;
  observedAt: string;
  externalStatus: "published" | "cancelled" | "unknown";
};

export type ExternalActionConnectorResult =
  | { status: "disabled"; source: ExternalActionSourceId; reason: "operator_authorization_required" }
  | { status: "available"; source: ExternalActionSourceId; events: ExternalActionEvent[]; complete: boolean }
  | { status: "error"; source: ExternalActionSourceId; reason: string };

export type ExternalActionAccessMode =
  | "disabled"
  | "synthetic_fixture"
  | "authorized_feed"
  | "webhook";

export type ExternalActionSubscription = {
  id?: string;
  organizerDirectoryId: string;
  sourceId: ExternalActionSourceId;
  ownerUserId: string;
  coOrganizerUserIds: string[];
  sourceStructureRef: string;
  sourceUrl?: string | null;
  accessMode: ExternalActionAccessMode;
  enabled: boolean;
  authorizationRef?: string | null;
  syncStartDate: string;
  consentGrantedAt?: string | null;
  revokedAt?: string | null;
  lastSyncAt?: string | null;
  lastSyncStatus?: "ok" | "partial" | "error" | "disabled" | null;
  lastSyncSummary?: Record<string, unknown>;
  lastError?: string | null;
};

export type ExternalActionProposalKind =
  | "incomplete_event"
  | "ambiguous_match"
  | "field_conflict"
  | "cancellation_review";

export type ExternalActionFieldConflict = {
  field: "actionTitle" | "actionDate" | "startTime" | "locationLabel" | "notes";
  localValue: string | null;
  previousSyncedValue: string | null;
  incomingValue: string | null;
  source: ExternalActionSourceId;
};

export type ExternalActionProposal = {
  id: string;
  organizerDirectoryId: string;
  sourceId: ExternalActionSourceId;
  externalEventId: string;
  identityHash?: string | null;
  actionId?: string | null;
  proposalKind: ExternalActionProposalKind;
  status: "pending" | "resolved" | "dismissed";
  externalEvent: Record<string, unknown>;
  candidateActionIds: string[];
  conflictFields: ExternalActionFieldConflict[];
  resolutionNote?: string | null;
  resolvedByUserId?: string | null;
  resolvedAt?: string | null;
};

export type ExternalActionSyncMode = "cron_prepare" | "admin_sync_now";

export type ExternalActionSyncOutcome =
  | {
      status:
        | "created"
        | "created_and_published"
        | "updated"
        | "published"
        | "linked"
        | "unchanged"
        | "suppressed"
        | "needs_review"
        | "incomplete_proposal"
        | "skipped_past"
        | "error";
      source: ExternalActionSourceId;
      externalId: string;
      actionId?: string;
      proposalId?: string;
      reason?: string;
    }
  | {
      status: "source_disabled" | "mandate_revoked";
      source: ExternalActionSourceId;
      reason: string;
    };

export type ExternalActionSyncRunSummary = {
  mode: ExternalActionSyncMode;
  executedAt: string;
  created: number;
  createdAndPublished: number;
  updated: number;
  published: number;
  unchanged: number;
  suppressed: number;
  proposals: number;
  conflicts: number;
  skippedPast: number;
  disabledSources: number;
  errors: number;
  outcomes: ExternalActionSyncOutcome[];
};
