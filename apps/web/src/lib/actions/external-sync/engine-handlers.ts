import { setActionGroupJoinEnabledInNotes } from "@/lib/actions/metadata";
import { isExternalActionPublishAdmissible } from "./normalization";
import { computeExternalActionFieldMerge } from "./matching";
import type { ExternalActionSyncStore } from "./store";
import type {
  ExternalActionEvent,
  ExternalActionSubscription,
  ExternalActionSyncMode,
  ExternalActionSyncOutcome,
} from "./types";

function mapPublishOutcome(
  pub: { published: boolean; pendingReview?: boolean; reason?: string },
  event: ExternalActionEvent,
  actionId: string,
  hasChanges: boolean,
): ExternalActionSyncOutcome {
  if (pub.published) {
    return {
      status: hasChanges ? "updated" : "published",
      source: event.source,
      externalId: event.externalId,
      actionId,
    };
  }
  if (pub.pendingReview) {
    return {
      status: "pending_review",
      source: event.source,
      externalId: event.externalId,
      actionId,
      reason: pub.reason,
    };
  }
  if (pub.reason === "mandate_revoked") {
    return {
      status: "mandate_revoked",
      source: event.source,
      reason: "mandate_revoked",
    };
  }
  if (pub.reason === "suppressed") {
    return {
      status: "suppressed",
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

export async function handleLinkedActionUpdate(params: {
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
    if (action.status === "cancelled" || action.status === "rejected") {
      return {
        status: "suppressed",
        source: event.source,
        externalId: event.externalId,
        actionId,
      };
    }
    if (action.action_phase === "pre_action") {
      const notesUpdated = await store.updatePreActionFields(
        actionId,
        action.updated_at,
        { notes: setActionGroupJoinEnabledInNotes(action.notes, false) },
        {
          organizerDirectoryId: subscription.organizerDirectoryId,
          sourceId: event.source,
          externalEventId: event.externalId,
          allowPublishedNotesOnly: true,
        },
      );
      if (notesUpdated === "mandate_revoked") {
        return {
          status: "mandate_revoked",
          source: event.source,
          reason: "mandate_revoked",
        };
      }
      if (notesUpdated === "suppressed" || notesUpdated === "terminal_state") {
        return {
          status: "suppressed",
          source: event.source,
          externalId: event.externalId,
          actionId,
        };
      }
      if (notesUpdated !== true) {
        return {
          status: "error",
          source: event.source,
          externalId: event.externalId,
          actionId,
          reason:
            notesUpdated === "conflict"
              ? "cancellation_registration_close_conflict"
              : "cancellation_registration_close_failed",
        };
      }
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
      const mandateCheck = await store.verifyWriteMandate(
        subscription.organizerDirectoryId,
        event.source,
        actionId,
      );
      if (!mandateCheck.ok) {
        return {
          status: "mandate_revoked",
          source: event.source,
          reason: mandateCheck.reason,
        };
      }
      const pub = await store.publishPreAction(
        actionId,
        actorUserId ?? subscription.ownerUserId,
        action.updated_at,
        {
          organizerDirectoryId: subscription.organizerDirectoryId,
          sourceId: event.source,
          externalEventId: event.externalId,
        },
      );
      return mapPublishOutcome(pub, event, actionId, false);
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
    const appliedStatus = await store.markReferenceApplied({
      sourceId: event.source,
      externalEventId: event.externalId,
      appliedSnapshot: incomingSnapshot,
      appliedContentHash: incomingContentHash,
      appliedRevision: event.sourceRevision ?? null,
    });
    if (appliedStatus !== "applied") {
      return appliedStatus === "suppressed"
        ? { status: "suppressed", source: event.source, externalId: event.externalId, actionId }
        : { status: "mandate_revoked", source: event.source, reason: appliedStatus };
    }
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
      {
        organizerDirectoryId: subscription.organizerDirectoryId,
        sourceId: event.source,
        externalEventId: event.externalId,
      },
    );
    if (updated === "mandate_revoked") {
      return {
        status: "mandate_revoked",
        source: event.source,
        reason: "mandate_revoked",
      };
    }
    if (updated === "suppressed" || updated === "terminal_state") {
      return {
        status: "suppressed",
        source: event.source,
        externalId: event.externalId,
        actionId,
      };
    }
    if (updated !== true) {
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

  const appliedStatus = await store.markReferenceApplied({
    sourceId: event.source,
    externalEventId: event.externalId,
    appliedSnapshot: incomingSnapshot,
    appliedContentHash: incomingContentHash,
    appliedRevision: event.sourceRevision ?? null,
  });
  if (appliedStatus !== "applied") {
    return appliedStatus === "suppressed"
      ? { status: "suppressed", source: event.source, externalId: event.externalId, actionId }
      : { status: "mandate_revoked", source: event.source, reason: appliedStatus };
  }

  if (
    mode === "admin_sync_now" &&
    !action.published_at &&
    isExternalActionPublishAdmissible(event, now)
  ) {
    let publishExpectedUpdatedAt = action.updated_at;
    if (merge.hasChanges) {
      const refreshed = await store.getActionById(actionId);
      if (!refreshed) {
        return {
          status: "needs_review",
          source: event.source,
          externalId: event.externalId,
          actionId,
          reason: "linked_action_missing",
        };
      }
      publishExpectedUpdatedAt = refreshed.updated_at;
    }
    const pub = await store.publishPreAction(
      actionId,
      actorUserId ?? subscription.ownerUserId,
      publishExpectedUpdatedAt,
      {
        organizerDirectoryId: subscription.organizerDirectoryId,
        sourceId: event.source,
        externalEventId: event.externalId,
      },
    );
    return mapPublishOutcome(pub, event, actionId, merge.hasChanges);
  }

  return {
    status: merge.hasChanges ? "updated" : "unchanged",
    source: event.source,
    externalId: event.externalId,
    actionId,
  };
}
