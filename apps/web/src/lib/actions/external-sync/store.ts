import type { SupabaseClient } from "@supabase/supabase-js";
import { createActionSubmission } from "@/lib/actions/create-submission";
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

export interface ExternalActionSyncStore {
  listSubscriptions(): Promise<ExternalActionSubscription[]>;
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
  listCandidateActions(organizerDirectoryId: string): Promise<CandidateActionRow[]>;
  getActionById(actionId: string): Promise<CandidateActionRow | null>;
  createPreAction(params: {
    subscription: ExternalActionSubscription;
    event: ExternalActionEvent;
    idempotencyKey: string;
  }): Promise<{ actionId: string }>;
  updatePreActionFields(
    actionId: string,
    updates: Partial<{
      action_date: string;
      location_label: string;
      preparation_data: Record<string, unknown>;
      group_join_enabled: boolean;
    }>,
  ): Promise<void>;
  publishPreAction(actionId: string, publishedAt: string): Promise<boolean>;
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
  }): Promise<string>;
  listProposals(status?: "pending" | "resolved" | "dismissed" | null): Promise<ExternalActionProposal[]>;
  resolveProposal(params: {
    proposalId: string;
    status: "resolved" | "dismissed";
    actorUserId: string;
    resolutionNote?: string | null;
  }): Promise<string>;
  listSyncedActions(): Promise<SyncedActionSummary[]>;
  suppressAction(params: {
    actionId: string;
    actorUserId: string;
    operationId: string;
    reason: string;
  }): Promise<"suppressed" | "not_synced" | "organizer_mismatch" | "operation_conflict">;
}

export function createSupabaseExternalActionSyncStore(
  supabase: SupabaseClient,
): ExternalActionSyncStore {
  return {
    async listSubscriptions() {
      const { data, error } = await supabase.rpc("list_external_action_sync_subscriptions");
      if (error) throw new Error("Échec de lecture des abonnements de synchronisation externe.");
      const rows = Array.isArray(data) ? data : [];
      return rows.map((row) => ({
        id: String(row.id),
        organizerDirectoryId: String(row.organizer_directory_id),
        sourceId: row.source_id as ExternalActionSourceId,
        ownerUserId: String(row.owner_user_id),
        coOrganizerUserIds: Array.isArray(row.co_organizer_user_ids)
          ? row.co_organizer_user_ids.map(String)
          : [],
        sourceStructureRef: String(row.source_structure_ref),
        sourceUrl: typeof row.source_url === "string" ? row.source_url : null,
        accessMode: row.access_mode,
        enabled: Boolean(row.enabled),
        authorizationRef: typeof row.authorization_ref === "string" ? row.authorization_ref : null,
        syncStartDate: String(row.sync_start_date),
        revokedAt: typeof row.revoked_at === "string" ? row.revoked_at : null,
        lastSyncAt: typeof row.last_sync_at === "string" ? row.last_sync_at : null,
        lastSyncStatus: row.last_sync_status ?? null,
        lastSyncSummary:
          row.last_sync_summary && typeof row.last_sync_summary === "object"
            ? (row.last_sync_summary as Record<string, unknown>)
            : {},
        lastError: typeof row.last_error === "string" ? row.last_error : null,
      }));
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
      const { data, error } = await supabase.rpc("get_external_action_sync_reference", {
        p_source_id: sourceId,
        p_external_event_id: externalEventId,
      });
      if (error) throw new Error("Échec de lecture de la référence externe.");
      const row = Array.isArray(data) ? data[0] : data;
      return (row as StoredReferenceResult | undefined) ?? null;
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
      const { data, error } = await supabase
        .from("actions")
        .select(
          "id, organizer_id, action_date, action_phase, status, published_at, location_label, notes, preparation_data, updated_at",
        )
        .eq("organizer_id", organizerDirectoryId)
        .limit(200);
      if (error) throw new Error("Échec de lecture des actions candidates.");
      return (Array.isArray(data) ? data : []) as CandidateActionRow[];
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
      const result = await createActionSubmission({
        supabase,
        userId: subscription.ownerUserId,
        idempotencyKey,
        creator: {
          userId: subscription.ownerUserId,
          displayName: subscription.organizerDirectoryId,
          handle: subscription.organizerDirectoryId,
          username: null,
          email: null,
        },
        isCreatorGlobalAdmin: false,
        consentGranted: true,
        deferGamification: true,
        payload: {
          organizerType: "association",
          organizerId: subscription.organizerDirectoryId,
          organizerAccounts: [
            subscription.ownerUserId,
            ...subscription.coOrganizerUserIds,
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

    async updatePreActionFields(actionId, updates) {
      const { error } = await supabase
        .from("actions")
        .update(updates)
        .eq("id", actionId)
        .eq("action_phase", "pre_action");
      if (error) throw new Error("Échec de mise à jour des champs externes de la pré-action.");
    },

    async publishPreAction(actionId, publishedAt) {
      const { data, error } = await supabase
        .from("actions")
        .update({ published_at: publishedAt })
        .eq("id", actionId)
        .eq("action_phase", "pre_action")
        .is("published_at", null)
        .select("id")
        .maybeSingle();
      if (error) throw new Error("Échec de publication automatique de la pré-action.");
      return Boolean(data?.id);
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
      });
      if (error) throw new Error("Échec d'enregistrement de la proposition privée.");
      return String(data);
    },

    async listProposals(status = "pending") {
      const { data, error } = await supabase.rpc("list_external_action_sync_proposals", {
        p_status: status,
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

    async resolveProposal({ proposalId, status, actorUserId, resolutionNote }) {
      const { data, error } = await supabase.rpc("resolve_external_action_sync_proposal", {
        p_proposal_id: proposalId,
        p_status: status,
        p_actor_user_id: actorUserId,
        p_resolution_note: resolutionNote ?? null,
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
      return String(data) as
        | "suppressed"
        | "not_synced"
        | "organizer_mismatch"
        | "operation_conflict";
    },
  };
}
