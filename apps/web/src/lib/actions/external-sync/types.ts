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
  | { status: "available"; source: ExternalActionSourceId; events: ExternalActionEvent[]; complete: boolean };

export type ExternalActionSyncOutcome =
  | { status: "created_and_published" | "linked" | "unchanged" | "suppressed" | "needs_review"; source: ExternalActionSourceId; externalId: string; actionId?: string; reason?: string }
  | { status: "source_disabled"; source: ExternalActionSourceId; reason: "operator_authorization_required" };
