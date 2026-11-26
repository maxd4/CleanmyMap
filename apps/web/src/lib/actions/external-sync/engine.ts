import { createHash, randomUUID } from "node:crypto";
import {
  buildExternalActionIdentityHash,
  isExternalActionPublishAdmissible,
} from "./normalization";
import {
  buildSourceSnapshotPayload,
  computeExternalActionFieldMerge,
  findMatchingCandidateActions,
} from "./matching";
import { readFondationMerEvents } from "./fondation-mer-adapter";
import { readJagisEvents } from "./jagis-adapter";
import type { ExternalActionSyncStore } from "./store";
import type {
  ExternalActionConnectorResult,
  ExternalActionEvent,
  ExternalActionSourceId,
  ExternalActionSubscription,
  ExternalActionSyncMode,
  ExternalActionSyncOutcome,
  ExternalActionSyncRunSummary,
} from "./types";

export type ExternalActionSourceReader = (
  subscription: ExternalActionSubscription,
  now: Date,
) => Promise<ExternalActionConnectorResult>;

export type ExternalActionSyncDeps = {
  store: ExternalActionSyncStore;
  readers?: Partial<Record<ExternalActionSourceId, ExternalActionSourceReader>>;
};

function computeSnapshotContentHash(snapshot: Record<string, unknown>): string {
  const canonical = JSON.stringify(
    Object.keys(snapshot)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        if (key !== "observedAt") acc[key] = snapshot[key];
        return acc;
      }, {}),
  );
  return createHash("sha256").update(canonical).digest("hex");
}

function isMandateActive(subscription: ExternalActionSubscription): boolean {
  return (
    subscription.enabled &&
    !subscription.revokedAt &&
    Boolean(subscription.consentGrantedAt) &&
    Boolean(subscription.ownerUserId.trim()) &&
    subscription.accessMode !== "disabled"
  );
}

function getTodayParis(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
}

async function handleLinkedActionUpdate(params: {
  store: ExternalActionSyncStore;
  subscription: ExternalActionSubscription;
  event: ExternalActionEvent;
  identityHash: string;
  actionId: string;
  appliedSnapshot: Record<string, unknown> | null;
  appliedContentHash: string | null;
  incomingSnapshot: Record<string, unknown>;
  incomingContentHash: string;
  hasPendingProposal: boolean;
  mode: ExternalActionSyncMode;
  actorUserId?: string;
  now: Date;
}): Promise<ExternalActionSyncOutcome> {
  const {
    store,
    subscription,
    event,
    identityHash,
    actionId,
    appliedSnapshot,
    appliedContentHash,
    incomingSnapshot,
    incomingContentHash,
    hasPendingProposal,
    mode,
    actorUserId,
    now,
  } = params;

  const action = await store.getActionById(actionId);
  if (!action) {
    return {
      status: "needs_review",
      source: event.source,
      externalId: event.externalId,
      actionId,
      reason: "linked_action_missing",
    };
  }

  if (event.externalStatus === "cancelled") {
    if (action.action_phase === "pre_action") {
      await store.updatePreActionFields(actionId, action.updated_at, {
        group_join_enabled: false,
      });
    }
    const proposalId = await store.upsertProposal({
      organizerDirectoryId: subscription.organizerDirectoryId,
      sourceId: event.source,
      externalEventId: event.externalId,
      identityHash,
      actionId,
      proposalKind: "cancellation_review",
      externalEvent: incomingSnapshot,
      candidateActionIds: [actionId],
      conflictFields: [],
      contentHash: incomingContentHash,
    });
    return {
      status: "needs_review",
      source: event.source,
      externalId: event.externalId,
      actionId,
      proposalId,
      reason: "external_cancellation",
    };
  }

  // Never modify measurements or completed/in-progress bilan actions.
  if (action.action_phase !== "pre_action") {
    return {
      status: "unchanged",
      source: event.source,
      externalId: event.externalId,
      actionId,
      reason: "post_action_immutable",
    };
  }

  // If a pending conflict/review already exists, never silently ignore it or auto-publish.
  if (hasPendingProposal) {
    return {
      status: "needs_review",
      source: event.source,
      externalId: event.externalId,
      actionId,
      reason: "pending_conflict_unresolved",
    };
  }

  if (appliedContentHash && appliedContentHash === incomingContentHash) {
    if (
      mode === "admin_sync_now" &&
      !action.published_at &&
      isExternalActionPublishAdmissible(event, now)
    ) {
      const pub = await store.publishPreAction(
        actionId,
        actorUserId ?? subscription.ownerUserId,
      );
      if (pub.published) {
        return {
          status: "published",
          source: event.source,
          externalId: event.externalId,
          actionId,
        };
      }
      return {
        status: "needs_review",
        source: event.source,
        externalId: event.externalId,
        actionId,
        reason: pub.reason ?? "publication_blocked",
      };
    }
    return {
      status: "unchanged",
      source: event.source,
      externalId: event.externalId,
      actionId,
    };
  }

  // Published pre_action requires human review on significant changes rather than silent overwrite.
  if (action.published_at) {
    const merge = computeExternalActionFieldMerge({
      source: event.source,
      incoming: event,
      previousSnapshot: appliedSnapshot,
      currentAction: action,
    });
    if (merge.hasChanges || merge.conflicts.length > 0) {
      const proposalId = await store.upsertProposal({
        organizerDirectoryId: subscription.organizerDirectoryId,
        sourceId: event.source,
        externalEventId: event.externalId,
        identityHash,
        actionId,
        proposalKind: "field_conflict",
        externalEvent: incomingSnapshot,
        candidateActionIds: [actionId],
        conflictFields: merge.conflicts,
        contentHash: incomingContentHash,
      });
      return {
        status: "needs_review",
        source: event.source,
        externalId: event.externalId,
        actionId,
        proposalId,
        reason: "published_action_change_review",
      };
    }
    await store.markReferenceApplied({
      sourceId: event.source,
      externalEventId: event.externalId,
      appliedSnapshot: incomingSnapshot,
      appliedContentHash: incomingContentHash,
      appliedRevision: event.sourceRevision ?? null,
    });
    return {
      status: "unchanged",
      source: event.source,
      externalId: event.externalId,
      actionId,
    };
  }

  const merge = computeExternalActionFieldMerge({
    source: event.source,
    incoming: event,
    previousSnapshot: appliedSnapshot,
    currentAction: action,
  });

  if (merge.hasChanges) {
    const mandateCheck = await store.verifyWriteMandate(
      subscription.organizerDirectoryId,
      event.source,
    );
    if (!mandateCheck.ok) {
      return {
        status: "mandate_revoked",
        source: event.source,
        reason: mandateCheck.reason,
      };
    }

    const updated = await store.updatePreActionFields(
      actionId,
      action.updated_at,
      merge.actionUpdates,
    );
    if (!updated) {
      const proposalId = await store.upsertProposal({
        organizerDirectoryId: subscription.organizerDirectoryId,
        sourceId: event.source,
        externalEventId: event.externalId,
        identityHash,
        actionId,
        proposalKind: "field_conflict",
        externalEvent: incomingSnapshot,
        candidateActionIds: [actionId],
        conflictFields: merge.conflicts,
        contentHash: incomingContentHash,
      });
      return {
        status: "needs_review",
        source: event.source,
        externalId: event.externalId,
        actionId,
        proposalId,
        reason: "concurrent_local_edit",
      };
    }
  }

  if (merge.conflicts.length > 0) {
    const proposalId = await store.upsertProposal({
      organizerDirectoryId: subscription.organizerDirectoryId,
      sourceId: event.source,
      externalEventId: event.externalId,
      identityHash,
      actionId,
      proposalKind: "field_conflict",
      externalEvent: incomingSnapshot,
      candidateActionIds: [actionId],
      conflictFields: merge.conflicts,
      contentHash: incomingContentHash,
    });
    return {
      status: "needs_review",
      source: event.source,
      externalId: event.externalId,
      actionId,
      proposalId,
      reason: "local_external_conflict",
    };
  }

  await store.markReferenceApplied({
    sourceId: event.source,
    externalEventId: event.externalId,
    appliedSnapshot: incomingSnapshot,
    appliedContentHash: incomingContentHash,
    appliedRevision: event.sourceRevision ?? null,
  });

  if (
    mode === "admin_sync_now" &&
    !action.published_at &&
    isExternalActionPublishAdmissible(event, now)
  ) {
    const pub = await store.publishPreAction(
      actionId,
      actorUserId ?? subscription.ownerUserId,
    );
    if (pub.published) {
      return {
        status: merge.hasChanges ? "updated" : "published",
        source: event.source,
        externalId: event.externalId,
        actionId,
      };
    }
    return {
      status: "needs_review",
      source: event.source,
      externalId: event.externalId,
      actionId,
      reason: pub.reason ?? "publication_blocked",
    };
  }

  return {
    status: merge.hasChanges ? "updated" : "unchanged",
    source: event.source,
    externalId: event.externalId,
    actionId,
  };
}

async function processSingleExternalEvent(params: {
  store: ExternalActionSyncStore;
  subscription: ExternalActionSubscription;
  event: ExternalActionEvent;
  mode: ExternalActionSyncMode;
  actorUserId?: string;
  now: Date;
}): Promise<ExternalActionSyncOutcome> {
  const { store, subscription, event, mode, actorUserId, now } = params;
  const today = getTodayParis(now);

  if (event.actionDate < today || event.actionDate < subscription.syncStartDate) {
    return {
      status: "skipped_past",
      source: event.source,
      externalId: event.externalId,
      reason: "past_or_before_sync_start",
    };
  }

  const identityHash = buildExternalActionIdentityHash(event, subscription.organizerDirectoryId);
  if (!identityHash) {
    const proposalId = await store.upsertProposal({
      organizerDirectoryId: subscription.organizerDirectoryId,
      sourceId: event.source,
      externalEventId: event.externalId,
      identityHash: null,
      actionId: null,
      proposalKind: "incomplete_event",
      externalEvent: buildSourceSnapshotPayload(event),
      candidateActionIds: [],
      conflictFields: [],
    });
    return {
      status: "incomplete_proposal",
      source: event.source,
      externalId: event.externalId,
      proposalId,
      reason: "missing_required_identity_facts",
    };
  }

  const snapshot = buildSourceSnapshotPayload(event);
  const contentHash = computeSnapshotContentHash(snapshot);
  const existingRef = await store.getReference(event.source, event.externalId);
  const claimToken = randomUUID();

  const reservation = await store.reserveReference({
    identityHash,
    organizerDirectoryId: subscription.organizerDirectoryId,
    creatorUserId: subscription.ownerUserId,
    claimToken,
    sourceId: event.source,
    externalEventId: event.externalId,
    externalUrl: event.externalUrl,
    externalRevision: event.sourceRevision ?? null,
    sourceSnapshot: snapshot,
    contentHash,
  });

  if (reservation.reservation_status === "suppressed") {
    return {
      status: "suppressed",
      source: event.source,
      externalId: event.externalId,
      actionId: reservation.action_id ?? undefined,
    };
  }

  if (
    reservation.reservation_status === "identity_conflict" ||
    reservation.reservation_status === "organizer_mismatch" ||
    reservation.reservation_status === "busy" ||
    reservation.reservation_status === "claim_expired"
  ) {
    return {
      status: "needs_review",
      source: event.source,
      externalId: event.externalId,
      reason: reservation.reservation_status,
    };
  }

  const pendingProposals = await store.listProposals(
    "pending",
    subscription.organizerDirectoryId,
  );
  const hasPendingProposal = pendingProposals.some(
    (p) =>
      (p.sourceId === event.source && p.externalEventId === event.externalId) ||
      (reservation.action_id !== null && p.actionId === reservation.action_id),
  );

  if (reservation.reservation_status === "linked" && reservation.action_id) {
    return handleLinkedActionUpdate({
      store,
      subscription,
      event,
      identityHash: reservation.identity_hash,
      actionId: reservation.action_id,
      appliedSnapshot: existingRef?.applied_snapshot ?? existingRef?.source_snapshot ?? null,
      appliedContentHash: existingRef?.applied_content_hash ?? null,
      incomingSnapshot: snapshot,
      incomingContentHash: contentHash,
      hasPendingProposal,
      mode,
      actorUserId,
      now,
    });
  }

  // Reservation succeeded for an unlinked identity: check existing actions before creating.
  const { candidates, truncated } = await store.listCandidateActions(
    subscription.organizerDirectoryId,
  );
  const match = findMatchingCandidateActions(
    event,
    subscription.organizerDirectoryId,
    candidates,
    { truncated },
  );

  if (match.kind === "ambiguous") {
    const proposalId = await store.upsertProposal({
      organizerDirectoryId: subscription.organizerDirectoryId,
      sourceId: event.source,
      externalEventId: event.externalId,
      identityHash: reservation.identity_hash,
      actionId: null,
      proposalKind: "ambiguous_match",
      externalEvent: snapshot,
      candidateActionIds: match.candidateIds,
      conflictFields: [],
      contentHash,
    });
    return {
      status: "needs_review",
      source: event.source,
      externalId: event.externalId,
      proposalId,
      reason: truncated ? "candidate_list_truncated" : "ambiguous_existing_action",
    };
  }

  if (match.kind === "unambiguous") {
    const completeStatus = await store.completeIdentity(
      reservation.identity_hash,
      claimToken,
      match.action.id,
    );
    if (completeStatus !== "linked") {
      return {
        status: "needs_review",
        source: event.source,
        externalId: event.externalId,
        reason: completeStatus,
      };
    }
    await store.markReferenceApplied({
      sourceId: event.source,
      externalEventId: event.externalId,
      appliedSnapshot: snapshot,
      appliedContentHash: contentHash,
      appliedRevision: event.sourceRevision ?? null,
    });
    return {
      status: "linked",
      source: event.source,
      externalId: event.externalId,
      actionId: match.action.id,
    };
  }

  if (event.externalStatus === "cancelled") {
    const proposalId = await store.upsertProposal({
      organizerDirectoryId: subscription.organizerDirectoryId,
      sourceId: event.source,
      externalEventId: event.externalId,
      identityHash: reservation.identity_hash,
      actionId: null,
      proposalKind: "cancellation_review",
      externalEvent: snapshot,
      candidateActionIds: [],
      conflictFields: [],
      contentHash,
    });
    return {
      status: "needs_review",
      source: event.source,
      externalId: event.externalId,
      proposalId,
      reason: "cancelled_before_creation",
    };
  }

  const created = await store.createPreAction({
    subscription,
    event,
    idempotencyKey: `external-sync:${reservation.identity_hash}`,
  });

  const completeStatus = await store.completeIdentity(
    reservation.identity_hash,
    claimToken,
    created.actionId,
  );
  if (completeStatus !== "linked") {
    return {
      status: "needs_review",
      source: event.source,
      externalId: event.externalId,
      actionId: created.actionId,
      reason: completeStatus,
    };
  }

  await store.markReferenceApplied({
    sourceId: event.source,
    externalEventId: event.externalId,
    appliedSnapshot: snapshot,
    appliedContentHash: contentHash,
    appliedRevision: event.sourceRevision ?? null,
  });

  if (mode === "admin_sync_now" && isExternalActionPublishAdmissible(event, now)) {
    const pub = await store.publishPreAction(
      created.actionId,
      actorUserId ?? subscription.ownerUserId,
    );
    if (pub.published) {
      return {
        status: "created_and_published",
        source: event.source,
        externalId: event.externalId,
        actionId: created.actionId,
      };
    }
    return {
      status: "needs_review",
      source: event.source,
      externalId: event.externalId,
      actionId: created.actionId,
      reason: pub.reason ?? "publication_blocked",
    };
  }

  return {
    status: "created",
    source: event.source,
    externalId: event.externalId,
    actionId: created.actionId,
  };
}

const DEFAULT_READERS: Record<ExternalActionSourceId, ExternalActionSourceReader> = {
  jagis_pour_la_nature: async () => readJagisEvents(),
  fondation_de_la_mer: async () => readFondationMerEvents(),
};

export async function runExternalActionSync(
  deps: ExternalActionSyncDeps,
  options: {
    mode: ExternalActionSyncMode;
    organizerDirectoryId?: string;
    actorUserId?: string;
    now?: Date;
  },
): Promise<ExternalActionSyncRunSummary> {
  const now = options.now ?? new Date();
  const subscriptions = await deps.store.listSubscriptions();
  const targeted = options.organizerDirectoryId
    ? subscriptions.filter((sub) => sub.organizerDirectoryId === options.organizerDirectoryId)
    : subscriptions;

  const summary: ExternalActionSyncRunSummary = {
    mode: options.mode,
    executedAt: now.toISOString(),
    created: 0,
    createdAndPublished: 0,
    updated: 0,
    published: 0,
    unchanged: 0,
    suppressed: 0,
    proposals: 0,
    conflicts: 0,
    skippedPast: 0,
    disabledSources: 0,
    errors: 0,
    outcomes: [],
  };

  for (const subscription of targeted) {
    if (!isMandateActive(subscription)) {
      const reason = subscription.revokedAt
        ? "mandate_revoked"
        : !subscription.consentGrantedAt
          ? "consent_missing"
          : "operator_authorization_required";
      summary.disabledSources += 1;
      summary.outcomes.push({
        status: subscription.revokedAt ? "mandate_revoked" : "source_disabled",
        source: subscription.sourceId,
        reason,
      });
      await deps.store.recordRunResult({
        organizerDirectoryId: subscription.organizerDirectoryId,
        sourceId: subscription.sourceId,
        status: "disabled",
        summary: { reason },
      });
      continue;
    }

    const reader = deps.readers?.[subscription.sourceId] ?? DEFAULT_READERS[subscription.sourceId];
    let connectorResult: ExternalActionConnectorResult;
    try {
      connectorResult = await reader(subscription, now);
    } catch (error) {
      summary.errors += 1;
      const message = error instanceof Error ? error.message : "Erreur de lecture source.";
      summary.outcomes.push({
        status: "error",
        source: subscription.sourceId,
        externalId: "*",
        reason: message,
      });
      await deps.store.recordRunResult({
        organizerDirectoryId: subscription.organizerDirectoryId,
        sourceId: subscription.sourceId,
        status: "error",
        summary: {},
        error: message,
      });
      continue;
    }

    if (connectorResult.status === "disabled") {
      summary.disabledSources += 1;
      summary.outcomes.push({
        status: "source_disabled",
        source: subscription.sourceId,
        reason: connectorResult.reason,
      });
      await deps.store.recordRunResult({
        organizerDirectoryId: subscription.organizerDirectoryId,
        sourceId: subscription.sourceId,
        status: "disabled",
        summary: { reason: connectorResult.reason },
      });
      continue;
    }

    if (connectorResult.status === "error") {
      summary.errors += 1;
      summary.outcomes.push({
        status: "error",
        source: subscription.sourceId,
        externalId: "*",
        reason: connectorResult.reason,
      });
      await deps.store.recordRunResult({
        organizerDirectoryId: subscription.organizerDirectoryId,
        sourceId: subscription.sourceId,
        status: "error",
        summary: {},
        error: connectorResult.reason,
      });
      continue;
    }

    for (const event of connectorResult.events) {
      try {
        const outcome = await processSingleExternalEvent({
          store: deps.store,
          subscription,
          event,
          mode: options.mode,
          actorUserId: options.actorUserId,
          now,
        });
        summary.outcomes.push(outcome);
        switch (outcome.status) {
          case "created":
            summary.created += 1;
            break;
          case "created_and_published":
            summary.createdAndPublished += 1;
            break;
          case "updated":
            summary.updated += 1;
            break;
          case "published":
            summary.published += 1;
            break;
          case "unchanged":
            summary.unchanged += 1;
            break;
          case "suppressed":
            summary.suppressed += 1;
            break;
          case "incomplete_proposal":
            summary.proposals += 1;
            break;
          case "needs_review":
            summary.conflicts += 1;
            break;
          case "skipped_past":
            summary.skippedPast += 1;
            break;
          case "error":
            summary.errors += 1;
            break;
          case "mandate_revoked":
          case "source_disabled":
            summary.disabledSources += 1;
            break;
        }
      } catch (error) {
        summary.errors += 1;
        summary.outcomes.push({
          status: "error",
          source: event.source,
          externalId: event.externalId,
          reason: error instanceof Error ? error.message : "Erreur de traitement.",
        });
      }
    }

    await deps.store.recordRunResult({
      organizerDirectoryId: subscription.organizerDirectoryId,
      sourceId: subscription.sourceId,
      status: connectorResult.complete && summary.errors === 0 ? "ok" : "partial",
      summary: {
        complete: connectorResult.complete,
        eventCount: connectorResult.events.length,
      },
    });
  }

  return summary;
}
