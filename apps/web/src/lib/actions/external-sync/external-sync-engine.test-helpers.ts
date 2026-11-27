import type { ExternalActionSyncStore, ReserveReferenceResult, StoredReferenceResult } from "./store";
import type { CandidateActionRow } from "./matching";
import type { ExternalActionProposal, ExternalActionSubscription } from "./types";

export function createInMemorySyncStore(seed: {
  subscriptions: ExternalActionSubscription[];
  actions?: CandidateActionRow[];
  suppressedIdentities?: Set<string>;
  blockPublicationReason?: string;
}) {
  const actions = new Map<string, CandidateActionRow>(
    (seed.actions ?? []).map((a) => [a.id, { ...a }]),
  );
  const identities = new Map<
    string,
    {
      organizerDirectoryId: string;
      actionId: string | null;
      claimToken: string | null;
      suppressed: boolean;
    }
  >();
  for (const hash of seed.suppressedIdentities ?? []) {
    identities.set(hash, {
      organizerDirectoryId: "association-brigade-verte-paris",
      actionId: null,
      claimToken: null,
      suppressed: true,
    });
  }
  const references = new Map<string, StoredReferenceResult>();
  const proposals = new Map<string, ExternalActionProposal>();
  const runResults: Array<{ sourceId: string; status: string }> = [];
  let seq = 1;

  const store: ExternalActionSyncStore = {
    async listSubscriptions() {
      return seed.subscriptions;
    },
    async verifyWriteMandate(organizerDirectoryId, sourceId) {
      const sub = seed.subscriptions.find(
        (s) => s.organizerDirectoryId === organizerDirectoryId && s.sourceId === sourceId,
      );
      if (!sub || !sub.enabled || sub.revokedAt || sub.accessMode === "disabled") {
        return { ok: false, reason: "mandate_revoked" };
      }
      if (!sub.consentGrantedAt) {
        return { ok: false, reason: "consent_missing" };
      }
      return { ok: true, subscription: sub };
    },
    async recordRunResult(params) {
      runResults.push({ sourceId: params.sourceId, status: params.status });
    },
    async reserveReference(params): Promise<ReserveReferenceResult> {
      const refKey = `${params.sourceId}:${params.externalEventId}`;
      const existingRef = references.get(refKey);
      if (existingRef) {
        if (existingRef.suppressed) {
          return {
            reservation_status: "suppressed",
            identity_hash: existingRef.identity_hash,
            action_id: existingRef.action_id,
            creator_user_id: params.creatorUserId,
          };
        }
        references.set(refKey, {
          ...existingRef,
          external_url: params.externalUrl,
          external_revision: params.externalRevision,
          source_snapshot: params.sourceSnapshot,
          content_hash: params.contentHash,
        });
        const idState = identities.get(existingRef.identity_hash);
        return {
          reservation_status: idState?.actionId ? "linked" : "reserved",
          identity_hash: existingRef.identity_hash,
          action_id: idState?.actionId ?? null,
          creator_user_id: params.creatorUserId,
        };
      }

      const idState = identities.get(params.identityHash);
      if (idState?.suppressed) {
        return {
          reservation_status: "suppressed",
          identity_hash: params.identityHash,
          action_id: idState.actionId,
          creator_user_id: params.creatorUserId,
        };
      }

      if (!idState) {
        identities.set(params.identityHash, {
          organizerDirectoryId: params.organizerDirectoryId,
          actionId: null,
          claimToken: params.claimToken,
          suppressed: false,
        });
      }

      const currentId = identities.get(params.identityHash)!;
      references.set(refKey, {
        identity_hash: params.identityHash,
        action_id: currentId.actionId,
        external_url: params.externalUrl,
        external_revision: params.externalRevision,
        source_snapshot: params.sourceSnapshot,
        content_hash: params.contentHash,
        applied_snapshot: null,
        applied_content_hash: null,
        applied_revision: null,
        applied_at: null,
        suppressed: false,
      });

      return {
        reservation_status: currentId.actionId ? "linked" : "reserved",
        identity_hash: params.identityHash,
        action_id: currentId.actionId,
        creator_user_id: params.creatorUserId,
      };
    },
    async getReference(sourceId, externalEventId) {
      return references.get(`${sourceId}:${externalEventId}`) ?? null;
    },
    async markReferenceApplied(params) {
      const key = `${params.sourceId}:${params.externalEventId}`;
      const existing = references.get(key);
      if (!existing) return "not_found";
      references.set(key, {
        ...existing,
        applied_snapshot: params.appliedSnapshot,
        applied_content_hash: params.appliedContentHash,
        applied_revision: params.appliedRevision,
        applied_at: new Date().toISOString(),
      });
      return "applied";
    },
    async completeIdentity(identityHash, _claimToken, actionId) {
      const idState = identities.get(identityHash);
      if (!idState) return "not_found";
      if (idState.suppressed) return "suppressed";
      idState.actionId = actionId;
      idState.claimToken = null;
      for (const [k, ref] of references.entries()) {
        if (ref.identity_hash === identityHash) {
          references.set(k, { ...ref, action_id: actionId });
        }
      }
      return "linked";
    },
    async linkReference() {
      return { linkStatus: "linked", actionId: null };
    },
    async listCandidateActions(organizerDirectoryId) {
      return {
        candidates: [...actions.values()].filter((a) => a.organizer_id === organizerDirectoryId),
        truncated: false,
      };
    },
    async getActionById(actionId) {
      return actions.get(actionId) ?? null;
    },
    async createPreAction({ subscription, event }) {
      const id = `00000000-0000-4000-8000-${String(seq++).padStart(12, "0")}`;
      actions.set(id, {
        id,
        organizer_id: subscription.organizerDirectoryId,
        action_date: event.actionDate,
        action_phase: "pre_action",
        status: "pending",
        published_at: null,
        location_label: `${event.meetingPoint} — ${event.commune}`,
        notes: event.description ?? null,
        updated_at: "2026-11-26T10:00:00.000Z",
        preparation_data: {
          actionTitle: event.title,
          meetingTime: event.startTime ?? undefined,
          zoneCiblePrevue: event.routeReference ?? undefined,
        },
      });
      return { actionId: id };
    },
    async updatePreActionFields(actionId, expectedUpdatedAt, updates) {
      const existing = actions.get(actionId);
      if (!existing) return false;
      if (expectedUpdatedAt && existing.updated_at !== expectedUpdatedAt) {
        return false;
      }
      actions.set(actionId, {
        ...existing,
        ...(updates.action_date !== undefined ? { action_date: updates.action_date } : {}),
        ...(updates.location_label !== undefined ? { location_label: updates.location_label } : {}),
        ...(updates.preparation_data !== undefined
          ? { preparation_data: updates.preparation_data }
          : {}),
      });
      return true;
    },
    async publishPreAction(actionId) {
      if (seed.blockPublicationReason) {
        return { published: false, reason: seed.blockPublicationReason };
      }
      const existing = actions.get(actionId);
      if (!existing || existing.published_at || existing.action_phase !== "pre_action") {
        return { published: false, reason: "not_publishable" };
      }
      actions.set(actionId, { ...existing, published_at: new Date().toISOString() });
      return { published: true };
    },
    async upsertProposal(params) {
      const key = `${params.sourceId}:${params.externalEventId}`;
      const id = proposals.get(key)?.id ?? `prop-${proposals.size + 1}`;
      proposals.set(key, {
        id,
        organizerDirectoryId: params.organizerDirectoryId,
        sourceId: params.sourceId,
        externalEventId: params.externalEventId,
        identityHash: params.identityHash,
        actionId: params.actionId,
        proposalKind: params.proposalKind,
        status: "pending",
        externalEvent: params.externalEvent,
        candidateActionIds: params.candidateActionIds,
        conflictFields: params.conflictFields,
      });
      return id;
    },
    async listProposals(status = "pending", organizerDirectoryId = null) {
      return [...proposals.values()].filter(
        (p) =>
          (!status || p.status === status) &&
          (!organizerDirectoryId || p.organizerDirectoryId === organizerDirectoryId),
      );
    },
    async resolveProposal() {
      return "resolved";
    },
    async listSyncedActions() {
      return [];
    },
    async suppressAction({ actionId }) {
      for (const [k, v] of identities.entries()) {
        if (v.actionId === actionId) {
          identities.set(k, { ...v, suppressed: true });
        }
      }
      for (const [k, r] of references.entries()) {
        if (r.action_id === actionId) {
          references.set(k, { ...r, suppressed: true });
        }
      }
      const existing = actions.get(actionId);
      if (existing) {
        actions.set(actionId, { ...existing, published_at: null, status: "cancelled" });
      }
      return "suppressed";
    },
  };

  return { store, actions, proposals, references, runResults };
}

export const baseSubs: ExternalActionSubscription[] = [
  {
    organizerDirectoryId: "association-brigade-verte-paris",
    sourceId: "jagis_pour_la_nature",
    ownerUserId: "user_brigade_1",
    coOrganizerUserIds: [],
    sourceStructureRef: "brigade-verte-paris",
    accessMode: "synthetic_fixture",
    enabled: true,
    authorizationRef: "mandat-2026-11",
    syncStartDate: "2026-11-01",
    consentGrantedAt: "2026-11-01T09:00:00.000Z",
  },
  {
    organizerDirectoryId: "association-brigade-verte-paris",
    sourceId: "fondation_de_la_mer",
    ownerUserId: "user_brigade_1",
    coOrganizerUserIds: [],
    sourceStructureRef: "birgade-verte",
    accessMode: "synthetic_fixture",
    enabled: true,
    authorizationRef: "mandat-2026-11",
    syncStartDate: "2026-11-01",
    consentGrantedAt: "2026-11-01T09:00:00.000Z",
  },
];
