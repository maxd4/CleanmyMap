import type { SupabaseClient } from "@supabase/supabase-js";
import { createActionSubmission } from "@/lib/actions/create-submission";
import { invalidateActionSnapshots } from "@/lib/actions/create-submission-effects";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { publishPreActionCanonical } from "@/lib/actions/publish-pre-action";
import { loadActionById } from "@/lib/actions/store";
import type { CandidateActionRow } from "./matching";
import { buildCanonicalLocationLabel } from "./matching";
import type {
  ExternalActionEvent,
  ExternalActionFieldConflict,
  ExternalActionProposal,
  ExternalActionProposalKind,
  ExternalActionSourceId,
  ExternalActionSubscription,
} from "./types";

export type ReserveReferenceResult = {
  reservation_status:
    | "reserved"
    | "linked"
    | "suppressed"
    | "identity_conflict"
    | "organizer_mismatch"
    | "busy"
    | "claim_expired";
  identity_hash: string;
  action_id: string | null;
  creator_user_id: string | null;
};

export type StoredReferenceResult = {
  identity_hash: string;
  action_id: string | null;
  external_url: string;
  external_revision: string | null;
  source_snapshot: Record<string, unknown>;
  content_hash: string;
  applied_snapshot: Record<string, unknown> | null;
  applied_content_hash: string | null;
  applied_revision: string | null;
  applied_at: string | null;
  suppressed: boolean;
};

export type SyncedActionSummary = {
  actionId: string;
  actionDate: string;
  actionTitle: string;
  actionStatus: string;
  publishedAt: string | null;
  sourceIds: ExternalActionSourceId[];
  suppressed: boolean;
};

export type CandidateActionListResult = {
  candidates: CandidateActionRow[];
  truncated: boolean;
};

export type MandateVerificationResult =
  | { ok: true; subscription: ExternalActionSubscription }
  | { ok: false; reason: "mandate_revoked" | "consent_missing" | "owner_profile_unverified" };

export interface ExternalActionSyncStore {
  listSubscriptions(): Promise<ExternalActionSubscription[]>;
  verifyWriteMandate(
    organizerDirectoryId: string,
    sourceId: ExternalActionSourceId,
    actionId?: string,
  ): Promise<MandateVerificationResult>;
  recordRunResult(params: {
    organizerDirectoryId: string;
    sourceId: ExternalActionSourceId;
    status: "ok" | "partial" | "error" | "disabled";
    summary: Record<string, unknown>;
    error?: string | null;
  }): Promise<void>;
  reserveReference(params: {
    identityHash: string;
    organizerDirectoryId: string;
    creatorUserId: string;
    claimToken: string;
    sourceId: ExternalActionSourceId;
    externalEventId: string;
    externalUrl: string;
    externalRevision: string | null;
    sourceSnapshot: Record<string, unknown>;
    contentHash: string;
  }): Promise<ReserveReferenceResult>;
  getReference(
    sourceId: ExternalActionSourceId,
    externalEventId: string,
  ): Promise<StoredReferenceResult | null>;
  markReferenceApplied(params: {
    sourceId: ExternalActionSourceId;
    externalEventId: string;
    appliedSnapshot: Record<string, unknown>;
    appliedContentHash: string;
    appliedRevision: string | null;
    expectedActionUpdatedAt?: string | null;
  }): Promise<string>;
  completeIdentity(
    identityHash: string,
    claimToken: string,
    actionId: string,
  ): Promise<string>;
  linkReference(params: {
    identityHash: string;
    sourceId: ExternalActionSourceId;
    externalEventId: string;
    externalUrl: string;
    externalRevision: string | null;
    sourceSnapshot: Record<string, unknown>;
    contentHash: string;
  }): Promise<{ linkStatus: string; actionId: string | null }>;
  listCandidateActions(organizerDirectoryId: string): Promise<CandidateActionListResult>;
  getActionById(actionId: string): Promise<CandidateActionRow | null>;
  createPreAction(params: {
    subscription: ExternalActionSubscription;
    event: ExternalActionEvent;
    idempotencyKey: string;
  }): Promise<{ actionId: string }>;
  updatePreActionFields(
    actionId: string,
    expectedUpdatedAt: string | undefined,
    updates: Partial<{
      action_date: string;
      location_label: string;
      notes: string | null;
      preparation_data: Record<string, unknown>;
    }>,
    sourceContext?: {
      organizerDirectoryId: string;
      sourceId: ExternalActionSourceId;
      externalEventId: string;
      allowPublishedNotesOnly?: boolean;
      appliedSnapshot?: Record<string, unknown>;
      appliedContentHash?: string;
      appliedRevision?: string | null;
    },
  ): Promise<boolean | "mandate_revoked" | "suppressed" | "terminal_state" | "conflict" | "stale_revision">;
  publishPreAction(
    actionId: string,
    actorUserId: string,
    expectedUpdatedAt?: string,
    sourceContext?: {
      organizerDirectoryId: string;
      sourceId: ExternalActionSourceId;
      externalEventId: string;
    },
  ): Promise<{ published: boolean; pendingReview?: boolean; reason?: string }>;
  upsertProposal(params: {
    organizerDirectoryId: string;
    sourceId: ExternalActionSourceId;
    externalEventId: string;
    identityHash: string | null;
    actionId: string | null;
    proposalKind: ExternalActionProposalKind;
    externalEvent: Record<string, unknown>;
    candidateActionIds: string[];
    conflictFields: ExternalActionFieldConflict[];
    contentHash?: string | null;
  }): Promise<string>;
  listProposals(
    status?: "pending" | "resolved" | "dismissed" | null,
    organizerDirectoryId?: string | null,
  ): Promise<ExternalActionProposal[]>;
  resolveProposal(params: {
    proposalId: string;
    status: "resolved" | "dismissed";
    actorUserId: string;
    resolutionNote?: string | null;
    organizerDirectoryId?: string | null;
  }): Promise<string>;
  listSyncedActions(): Promise<SyncedActionSummary[]>;
  suppressAction(params: {
    actionId: string;
    actorUserId: string;
    operationId: string;
    reason: string;
  }): Promise<"suppressed" | "not_synced" | "organizer_mismatch" | "operation_conflict">;
}

function mapSubscriptionRow(row: Record<string, unknown>): ExternalActionSubscription {
  return {
    id: String(row.id),
    organizerDirectoryId: String(row.organizer_directory_id),
    sourceId: row.source_id as ExternalActionSourceId,
    ownerUserId: String(row.owner_user_id),
    coOrganizerUserIds: Array.isArray(row.co_organizer_user_ids)
      ? row.co_organizer_user_ids.map(String)
      : [],
    sourceStructureRef: String(row.source_structure_ref),
    sourceUrl: typeof row.source_url === "string" ? row.source_url : null,
    accessMode: row.access_mode as ExternalActionSubscription["accessMode"],
    enabled: Boolean(row.enabled),
    authorizationRef: typeof row.authorization_ref === "string" ? row.authorization_ref : null,
    syncStartDate: String(row.sync_start_date),
    consentGrantedAt:
      typeof row.consent_granted_at === "string" ? row.consent_granted_at : null,
    revokedAt: typeof row.revoked_at === "string" ? row.revoked_at : null,
    lastSyncAt: typeof row.last_sync_at === "string" ? row.last_sync_at : null,
    lastSyncStatus: (row.last_sync_status as ExternalActionSubscription["lastSyncStatus"]) ?? null,
    lastSyncSummary:
      row.last_sync_summary && typeof row.last_sync_summary === "object"
        ? (row.last_sync_summary as Record<string, unknown>)
        : {},
    lastError: typeof row.last_error === "string" ? row.last_error : null,
  };
}

export function createSupabaseExternalActionSyncStore(
  supabase: SupabaseClient,
): ExternalActionSyncStore {
  return {
    async listSubscriptions() {
      const { data, error } = await supabase.rpc("list_external_action_sync_subscriptions");
      if (error) throw new Error("Échec de lecture des abonnements de synchronisation externe.");
      const rows = Array.isArray(data) ? data : [];
      return rows.map((row) => mapSubscriptionRow(row as Record<string, unknown>));
    },

    async verifyWriteMandate(organizerDirectoryId, sourceId, actionId) {
      const subscriptions = await this.listSubscriptions();
      const sub = subscriptions.find(
        (item) =>
          item.organizerDirectoryId === organizerDirectoryId && item.sourceId === sourceId,
      );
      if (
        !sub ||
        !sub.enabled ||
        sub.revokedAt ||
        sub.accessMode === "disabled" ||
        !sub.authorizationRef
      ) {
        return { ok: false, reason: "mandate_revoked" };
      }
      if (!sub.consentGrantedAt) {
        return { ok: false, reason: "consent_missing" };
      }
      const { data: profile, error } = await supabase
        .from("public_profiles")
        .select("id")
        .eq("id", sub.ownerUserId)
        .maybeSingle();
      if (error || !profile?.id) {
        return { ok: false, reason: "owner_profile_unverified" };
      }
      if (actionId) {
        const action = await loadActionById(supabase, actionId);
        const organizerIds = await loadCanonicalActionOrganizerIdsForAction(
          supabase,
          actionId,
        );
        const isAuthorizedOrganizer = Boolean(
          action &&
            action.organizer_id === organizerDirectoryId &&
            (action.created_by_clerk_id === sub.ownerUserId ||
              organizerIds.includes(sub.ownerUserId)),
        );
        if (!isAuthorizedOrganizer) {
          return { ok: false, reason: "mandate_revoked" };
        }
      }
      return { ok: true, subscription: sub };
    },

    async recordRunResult(params) {
      const { error } = await supabase.rpc("record_external_action_sync_run_result", {
        p_organizer_directory_id: params.organizerDirectoryId,
        p_source_id: params.sourceId,
        p_status: params.status,
        p_summary: params.summary,
        p_error: params.error ?? null,
      });
      if (error) throw new Error("Échec d'enregistrement du statut de synchronisation externe.");
    },

    async reserveReference(params) {
      const { data, error } = await supabase.rpc("reserve_external_action_sync_reference", {
        p_identity_hash: params.identityHash,
        p_organizer_directory_id: params.organizerDirectoryId,
        p_creator_user_id: params.creatorUserId,
        p_claim_token: params.claimToken,
        p_source_id: params.sourceId,
        p_external_event_id: params.externalEventId,
        p_external_url: params.externalUrl,
        p_external_revision: params.externalRevision,
        p_source_snapshot: params.sourceSnapshot,
        p_content_hash: params.contentHash,
      });
      if (error) throw new Error("Échec de réservation de la référence externe.");
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("Réponse vide lors de la réservation de la référence externe.");
      return row as ReserveReferenceResult;
    },

    async getReference(sourceId, externalEventId) {
      const { data, error } = await supabase.rpc("get_external_action_sync_reference_state", {
        p_source_id: sourceId,
        p_external_event_id: externalEventId,
      });
      if (error) throw new Error("Échec de lecture de la référence externe.");
      const row = Array.isArray(data) ? data[0] : data;
      return (row as StoredReferenceResult | undefined) ?? null;
    },

    async markReferenceApplied(params) {
      const { data, error } = await supabase.rpc("mark_external_action_sync_reference_applied", {
        p_source_id: params.sourceId,
        p_external_event_id: params.externalEventId,
        p_applied_snapshot: params.appliedSnapshot,
        p_applied_content_hash: params.appliedContentHash,
        p_applied_revision: params.appliedRevision,
        p_expected_action_updated_at: params.expectedActionUpdatedAt ?? null,
      });
      if (error) throw new Error("Échec de confirmation de l'état appliqué.");
      return String(data ?? "");
    },

    async completeIdentity(identityHash, claimToken, actionId) {
      const { data, error } = await supabase.rpc("complete_external_action_sync_identity", {
        p_identity_hash: identityHash,
        p_claim_token: claimToken,
        p_action_id: actionId,
      });
      if (error) throw new Error("Échec de finalisation de l'identité externe.");
      return String(data ?? "");
    },

    async linkReference(params) {
      const { data, error } = await supabase.rpc("link_external_action_sync_reference", {
        p_identity_hash: params.identityHash,
        p_source_id: params.sourceId,
        p_external_event_id: params.externalEventId,
        p_external_url: params.externalUrl,
        p_external_revision: params.externalRevision,
        p_source_snapshot: params.sourceSnapshot,
        p_content_hash: params.contentHash,
      });
      if (error) throw new Error("Échec de liaison de la référence externe.");
      const row = Array.isArray(data) ? data[0] : data;
      return {
        linkStatus: String(row?.link_status ?? ""),
        actionId: typeof row?.action_id === "string" ? row.action_id : null,
      };
    },

    async listCandidateActions(organizerDirectoryId) {
      const PAGE_LIMIT = 200;
      const { data, error } = await supabase
        .from("actions")
        .select(
          "id, organizer_id, action_date, action_phase, status, published_at, location_label, notes, preparation_data, updated_at",
        )
        .eq("organizer_id", organizerDirectoryId)
        .limit(PAGE_LIMIT + 1);
      if (error) throw new Error("Échec de lecture des actions candidates.");
      const rows = (Array.isArray(data) ? data : []) as CandidateActionRow[];
      return {
        candidates: rows.slice(0, PAGE_LIMIT),
        truncated: rows.length > PAGE_LIMIT,
      };
    },

    async getActionById(actionId) {
      const { data, error } = await supabase
        .from("actions")
        .select(
          "id, organizer_id, action_date, action_phase, status, published_at, location_label, notes, preparation_data, updated_at",
        )
        .eq("id", actionId)
        .maybeSingle();
      if (error) throw new Error("Échec de lecture de l'action cible.");
      return (data as CandidateActionRow | null) ?? null;
    },

    async createPreAction({ subscription, event, idempotencyKey }) {
      const mandate = await this.verifyWriteMandate(
        subscription.organizerDirectoryId,
        event.source,
      );
      if (!mandate.ok) {
        throw new Error(`Mandat invalide pour la création (${mandate.reason}).`);
      }

      const result = await createActionSubmission({
        supabase,
        userId: mandate.subscription.ownerUserId,
        idempotencyKey,
        creator: {
          userId: mandate.subscription.ownerUserId,
          displayName: mandate.subscription.organizerDirectoryId,
          handle: mandate.subscription.organizerDirectoryId,
          username: null,
          email: null,
        },
        isCreatorGlobalAdmin: false,
        consentGranted: Boolean(mandate.subscription.consentGrantedAt),
        deferGamification: true,
        payload: {
          organizerType: "association",
          organizerId: mandate.subscription.organizerDirectoryId,
          organizerAccounts: [
            mandate.subscription.ownerUserId,
            ...mandate.subscription.coOrganizerUserIds,
          ],
          actionPhase: "pre_action",
          accessMode: "public",
          groupJoinEnabled: false,
          actionDate: event.actionDate,
          actionTimezone: event.timezone,
          locationLabel: buildCanonicalLocationLabel(event),
          latitude: event.latitude ?? undefined,
          longitude: event.longitude ?? undefined,
          wasteKg: null,
          cigaretteButts: null,
          cigaretteButtsMeasurements: null,
          volunteersCount: 0,
          durationMinutes: 0,
          notes: event.description ?? undefined,
          preparationData: {
            actionTitle: event.title,
            meetingTime: event.startTime ?? undefined,
            pointDeRendezVous: event.meetingPoint ?? undefined,
            communeZoneLabel: event.commune ?? undefined,
            zoneCiblePrevue: event.routeReference ?? undefined,
            durationMinutesDeclared: false,
          },
        },
      });
      if (result.kind !== "action") {
        throw new Error("La création de pré-action externe a produit un type inattendu.");
      }
      return { actionId: result.id };
    },

    async updatePreActionFields(actionId, expectedUpdatedAt, updates, sourceContext) {
      if (sourceContext) {
        const applySnapshot = sourceContext.appliedSnapshot !== undefined;
        const { data, error } = await supabase.rpc(
          applySnapshot ? "apply_external_action_sync_pre_action" : "update_external_action_sync_pre_action",
          {
            p_action_id: actionId,
            p_organizer_directory_id: sourceContext.organizerDirectoryId,
            p_source_id: sourceContext.sourceId,
            p_external_event_id: sourceContext.externalEventId,
            p_expected_updated_at: expectedUpdatedAt ?? null,
            p_updates: updates,
            ...(applySnapshot
              ? {
                  p_applied_snapshot: sourceContext.appliedSnapshot,
                  p_applied_content_hash: sourceContext.appliedContentHash,
                  p_applied_revision: sourceContext.appliedRevision ?? null,
                }
              : { p_allow_published_notes_only: Boolean(sourceContext.allowPublishedNotesOnly) }),
          },
        );
        if (error) throw new Error("Échec de mise à jour atomique de la pré-action externe.");
        const status = String(data ?? "");
        if (status === "updated") return true;
        if (status === "mandate_revoked") return "mandate_revoked";
        if (status === "suppressed") return "suppressed";
        if (status === "terminal_state") return "terminal_state";
        if (status === "conflict") return "conflict";
        if (status === "stale_revision") return "stale_revision";
        return false;
      }
      let query = supabase
        .from("actions")
        .update(updates)
        .eq("id", actionId)
        .eq("action_phase", "pre_action");
      if (expectedUpdatedAt) {
        query = query.eq("updated_at", expectedUpdatedAt);
      }
      const { data, error } = await query.select("id").maybeSingle();
      if (error) throw new Error("Échec de mise à jour des champs externes de la pré-action.");
      return Boolean(data?.id);
    },

    async publishPreAction(actionId, actorUserId, expectedUpdatedAt, sourceContext) {
      const current = await loadActionById(supabase, actionId);
      if (!current) {
        return { published: false, reason: "not_found" };
      }
      if (expectedUpdatedAt && current.updated_at !== expectedUpdatedAt) {
        return { published: false, reason: "conflict" };
      }
      const organizerIds = await loadCanonicalActionOrganizerIdsForAction(
        supabase,
        actionId,
      );
      const outcome = await publishPreActionCanonical({
        supabase,
        current,
        actionId,
        userId: actorUserId,
        organizerIds,
        persistPublication: sourceContext
          ? async ({ publishedAt, preparationData }) => {
              const { data, error } = await supabase.rpc(
                "publish_external_action_sync_pre_action",
                {
                  p_action_id: actionId,
                  p_organizer_directory_id: sourceContext.organizerDirectoryId,
                  p_source_id: sourceContext.sourceId,
                  p_external_event_id: sourceContext.externalEventId,
                  p_expected_updated_at: current.updated_at ?? null,
                  p_published_at: publishedAt,
                  p_preparation_data: preparationData ?? null,
                },
              );
              if (error) {
                throw new Error("Échec de publication atomique de la pré-action externe.");
              }
              const status = String(data ?? "");
              if (status === "published") return "published";
              if (status === "mandate_revoked") return "mandate_revoked";
              if (status === "suppressed") return "suppressed";
              return "conflict";
            }
          : undefined,
        persistReviewSubmission: sourceContext
          ? async ({ expectedUpdatedAt: expectedAt }) => {
              const { data, error } = await supabase.rpc(
                "submit_external_action_sync_review",
                {
                  p_action_id: actionId,
                  p_organizer_directory_id: sourceContext.organizerDirectoryId,
                  p_source_id: sourceContext.sourceId,
                  p_external_event_id: sourceContext.externalEventId,
                  p_expected_updated_at: expectedAt,
                },
              );
              if (error) {
                throw new Error("Échec de soumission atomique à la modération associative.");
              }
              const row = (data ?? {}) as { status?: string; review_state?: string; error_message?: string };
              if (row.status === "pending_review" && row.review_state === "pending_review") {
                return { status: "pending_review", reviewState: "pending_review" };
              }
              if (row.status === "already_decided") {
                return { status: "already_decided", reviewState: row.review_state };
              }
              if (row.status === "not_required") return { status: "not_required" };
              if (row.status === "not_found") return { status: "not_found" };
              if (row.status === "mandate_revoked") return { status: "mandate_revoked" };
              if (row.status === "suppressed") return { status: "suppressed" };
              if (row.status === "terminal_state") return { status: "terminal_state" };
              if (row.status === "conflict") return { status: "conflict" };
              return { status: "review_error", reason: row.error_message ?? row.status ?? "review_error" };
            }
          : undefined,
      });
      if (outcome.status === "published") {
        return { published: true };
      }
      if (outcome.status === "pending_review") {
        return { published: false, pendingReview: true, reason: outcome.reviewState };
      }
      if (outcome.status === "already_decided") {
        return {
          published: false,
          reason: outcome.reviewState ? `already_decided:${outcome.reviewState}` : "already_decided",
        };
      }
      if (outcome.status === "review_error") {
        return { published: false, reason: outcome.reason ?? "review_error" };
      }
      return { published: false, reason: outcome.status };
    },

    async upsertProposal(params) {
      const { data, error } = await supabase.rpc("upsert_external_action_sync_proposal", {
        p_organizer_directory_id: params.organizerDirectoryId,
        p_source_id: params.sourceId,
        p_external_event_id: params.externalEventId,
        p_identity_hash: params.identityHash,
        p_action_id: params.actionId,
        p_proposal_kind: params.proposalKind,
        p_external_event: params.externalEvent,
        p_candidate_action_ids: params.candidateActionIds,
        p_conflict_fields: params.conflictFields,
        p_content_hash: params.contentHash ?? null,
      });
      if (error) throw new Error("Échec d'enregistrement de la proposition privée.");
      return String(data);
    },

    async listProposals(status = "pending", organizerDirectoryId = null) {
      const { data, error } = await supabase.rpc("list_external_action_sync_proposals", {
        p_status: status,
        p_organizer_directory_id: organizerDirectoryId,
      });
      if (error) throw new Error("Échec de lecture des propositions externes.");
      const rows = Array.isArray(data) ? data : [];
      return rows.map((row) => ({
        id: String(row.id),
        organizerDirectoryId: String(row.organizer_directory_id),
        sourceId: row.source_id as ExternalActionSourceId,
        externalEventId: String(row.external_event_id),
        identityHash: typeof row.identity_hash === "string" ? row.identity_hash : null,
        actionId: typeof row.action_id === "string" ? row.action_id : null,
        proposalKind: row.proposal_kind as ExternalActionProposalKind,
        status: row.status,
        externalEvent:
          row.external_event && typeof row.external_event === "object"
            ? (row.external_event as Record<string, unknown>)
            : {},
        candidateActionIds: Array.isArray(row.candidate_action_ids)
          ? row.candidate_action_ids.map(String)
          : [],
        conflictFields: Array.isArray(row.conflict_fields)
          ? (row.conflict_fields as ExternalActionFieldConflict[])
          : [],
        resolutionNote: typeof row.resolution_note === "string" ? row.resolution_note : null,
        resolvedByUserId:
          typeof row.resolved_by_user_id === "string" ? row.resolved_by_user_id : null,
        resolvedAt: typeof row.resolved_at === "string" ? row.resolved_at : null,
      }));
    },

    async resolveProposal({ proposalId, status, actorUserId, resolutionNote, organizerDirectoryId }) {
      const { data, error } = await supabase.rpc("resolve_external_action_sync_proposal", {
        p_proposal_id: proposalId,
        p_status: status,
        p_actor_user_id: actorUserId,
        p_resolution_note: resolutionNote ?? null,
        p_organizer_directory_id: organizerDirectoryId ?? null,
      });
      if (error) throw new Error("Échec de résolution de la proposition externe.");
      return String(data ?? "");
    },

    async listSyncedActions() {
      const { data, error } = await supabase.rpc("list_external_action_sync_actions");
      if (error) throw new Error("Échec de lecture des actions synchronisées.");
      const rows = Array.isArray(data) ? data : [];
      return rows.map((row) => ({
        actionId: String(row.action_id),
        actionDate: String(row.action_date),
        actionTitle: String(row.action_title),
        actionStatus: String(row.action_status),
        publishedAt: typeof row.published_at === "string" ? row.published_at : null,
        sourceIds: Array.isArray(row.source_ids)
          ? (row.source_ids as ExternalActionSourceId[])
          : [],
        suppressed: Boolean(row.suppressed),
      }));
    },

    async suppressAction({ actionId, actorUserId, operationId, reason }) {
      const { data, error } = await supabase.rpc("suppress_external_action_sync_action", {
        p_action_id: actionId,
        p_actor_user_id: actorUserId,
        p_operation_id: operationId,
        p_reason: reason,
      });
      if (error) throw new Error("Échec de suppression de l'action synchronisée.");
      const status = String(data) as
        | "suppressed"
        | "not_synced"
        | "organizer_mismatch"
        | "operation_conflict";
      if (status === "suppressed") {
        await invalidateActionSnapshots(actionId);
      }
      return status;
    },
  };
}
