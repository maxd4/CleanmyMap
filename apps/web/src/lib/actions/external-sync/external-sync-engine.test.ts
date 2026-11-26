import { describe, expect, it, vi } from "vitest";
import { readFondationMerEvents, readSyntheticFondationMerEvents } from "./fondation-mer-adapter";
import { readJagisEvents, readSyntheticJagisEvents } from "./jagis-adapter";
import { runExternalActionSync } from "./engine";
import { assertSafeExternalSyncUrl } from "./url-guard";
import type { ExternalActionSyncStore, ReserveReferenceResult, StoredReferenceResult } from "./store";
import type { CandidateActionRow } from "./matching";
import type { ExternalActionProposal, ExternalActionSubscription } from "./types";

function createInMemorySyncStore(seed: {
  subscriptions: ExternalActionSubscription[];
  actions?: CandidateActionRow[];
  suppressedIdentities?: Set<string>;
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
      return [...actions.values()].filter((a) => a.organizer_id === organizerDirectoryId);
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
        preparation_data: {
          actionTitle: event.title,
          startTime: event.startTime ?? undefined,
          zoneCiblePrevue: event.routeReference ?? undefined,
        },
      });
      return { actionId: id };
    },
    async updatePreActionFields(actionId, updates) {
      const existing = actions.get(actionId);
      if (!existing) return;
      actions.set(actionId, {
        ...existing,
        ...(updates.action_date !== undefined ? { action_date: updates.action_date } : {}),
        ...(updates.location_label !== undefined ? { location_label: updates.location_label } : {}),
        ...(updates.preparation_data !== undefined
          ? { preparation_data: updates.preparation_data }
          : {}),
      });
    },
    async publishPreAction(actionId, publishedAt) {
      const existing = actions.get(actionId);
      if (!existing || existing.published_at || existing.action_phase !== "pre_action") {
        return false;
      }
      actions.set(actionId, { ...existing, published_at: publishedAt });
      return true;
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
    async listProposals() {
      return [...proposals.values()];
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
      return "suppressed";
    },
  };

  return { store, actions, proposals, references, runResults };
}

const baseSubs: ExternalActionSubscription[] = [
  {
    organizerDirectoryId: "association-brigade-verte-paris",
    sourceId: "jagis_pour_la_nature",
    ownerUserId: "user_brigade_1",
    coOrganizerUserIds: [],
    sourceStructureRef: "brigade-verte-paris",
    accessMode: "synthetic_fixture",
    enabled: true,
    syncStartDate: "2026-11-01",
  },
  {
    organizerDirectoryId: "association-brigade-verte-paris",
    sourceId: "fondation_de_la_mer",
    ownerUserId: "user_brigade_1",
    coOrganizerUserIds: [],
    sourceStructureRef: "birgade-verte",
    accessMode: "synthetic_fixture",
    enabled: true,
    syncStartDate: "2026-11-01",
  },
];

describe("external-sync Lot A engine & SSRF guard", () => {
  it("keeps production connectors disabled by default", async () => {
    await expect(readJagisEvents()).resolves.toMatchObject({
      status: "disabled",
      reason: "operator_authorization_required",
    });
    await expect(readFondationMerEvents()).resolves.toMatchObject({
      status: "disabled",
      reason: "operator_authorization_required",
    });
  });

  it("rejects non-HTTPS, private IP, loopback and credentialed URLs", () => {
    expect(() => assertSafeExternalSyncUrl("https://example.test/event/1")).not.toThrow();
    expect(() => assertSafeExternalSyncUrl("http://example.test/event/1")).toThrow();
    expect(() => assertSafeExternalSyncUrl("https://127.0.0.1/admin")).toThrow();
    expect(() => assertSafeExternalSyncUrl("https://169.254.169.254/latest")).toThrow();
    expect(() => assertSafeExternalSyncUrl("https://10.0.0.5/feed")).toThrow();
    expect(() => assertSafeExternalSyncUrl("https://localhost/feed")).toThrow();
    expect(() => assertSafeExternalSyncUrl("https://user:pass@example.test/")).toThrow();
  });

  it("prepares unpublished pre-actions in cron_prepare, deduplicates across sources, and publishes only in admin_sync_now", async () => {
    const { store, actions, proposals } = createInMemorySyncStore({ subscriptions: baseSubs });
    const now = new Date("2026-11-26T10:00:00.000Z");

    const jagisRecords = [
      {
        id: "jagis-nov-14",
        url: "https://example.test/jagis/nov-14",
        title: "Collecte Pyrénées — J'agis",
        start_date: "2027-11-14",
        start_time: "14:00",
        meeting_point: "Mairie du 20e",
        city: "Paris",
        route_reference: "mairie-pyrenees-stendhal",
        status: "published",
      },
      {
        id: "jagis-incomplete",
        url: "https://example.test/jagis/incomplete",
        title: "Collecte sans horaire",
        start_date: "2027-12-01",
        city: "Paris",
        status: "published",
      },
      {
        id: "jagis-past",
        url: "https://example.test/jagis/past",
        title: "Ancienne collecte",
        start_date: "2026-04-11",
        start_time: "10:00",
        meeting_point: "Place Gambetta",
        city: "Paris",
        route_reference: "gambetta",
        status: "published",
      },
    ];
    const merRecords = [
      {
        reference: "mer-nov-14",
        canonical_url: "https://example.test/mer/nov-14",
        name: "Un geste pour la Mer — Paris 20e",
        date: "2027-11-14",
        time_start: "14:00",
        meeting_place: "Mairie du 20e",
        municipality: "Paris",
        route_name: "mairie-pyrenees-stendhal",
        state: "published",
      },
    ];

    const cronSummary = await runExternalActionSync(
      {
        store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents(jagisRecords, now.toISOString()),
          fondation_de_la_mer: async () => readSyntheticFondationMerEvents(merRecords, now.toISOString()),
        },
      },
      { mode: "cron_prepare", now },
    );

    expect(cronSummary.created).toBe(1);
    expect(cronSummary.createdAndPublished).toBe(0);
    expect(cronSummary.proposals).toBe(1);
    expect(cronSummary.skippedPast).toBe(1);
    expect(actions.size).toBe(1);
    const createdAction = [...actions.values()][0];
    expect(createdAction.published_at).toBeNull();
    expect(proposals.get("jagis_pour_la_nature:jagis-incomplete")?.proposalKind).toBe(
      "incomplete_event",
    );

    // Admin sync now publishes the admissible pre-action without creating duplicates.
    const adminSummary = await runExternalActionSync(
      {
        store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents(jagisRecords, now.toISOString()),
          fondation_de_la_mer: async () => readSyntheticFondationMerEvents(merRecords, now.toISOString()),
        },
      },
      { mode: "admin_sync_now", now },
    );
    expect(actions.size).toBe(1);
    expect(adminSummary.published).toBe(1);
    expect([...actions.values()][0].published_at).not.toBeNull();
  });

  it("preserves local edits on conflict, handles explicit cancellation vs partial error, and blocks recreation after tombstone", async () => {
    const { store, actions, proposals } = createInMemorySyncStore({ subscriptions: baseSubs });
    const now = new Date("2026-11-26T10:00:00.000Z");

    const v1 = [
      {
        id: "jagis-conflict-1",
        url: "https://example.test/jagis/c1",
        title: "Collecte initiale",
        start_date: "2027-06-10",
        start_time: "09:30",
        meeting_point: "Place Saint-Fargeau",
        city: "Paris",
        route_reference: "saint-fargeau",
        updated_at: "r1",
        status: "published",
      },
    ];

    await runExternalActionSync(
      {
        store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents(v1, now.toISOString()),
          fondation_de_la_mer: async () => ({ status: "disabled", source: "fondation_de_la_mer", reason: "operator_authorization_required" }),
        },
      },
      { mode: "cron_prepare", now },
    );

    const actionId = [...actions.keys()][0];
    // Simulate local organizer edit on title
    const current = actions.get(actionId)!;
    actions.set(actionId, {
      ...current,
      preparation_data: { ...(current.preparation_data ?? {}), actionTitle: "Titre modifié localement" },
    });

    // External source updates title -> local value must be preserved + field_conflict proposal
    const v2 = [{ ...v1[0], title: "Titre externe v2", updated_at: "r2" }];
    await runExternalActionSync(
      {
        store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents(v2, now.toISOString()),
          fondation_de_la_mer: async () => ({ status: "error", source: "fondation_de_la_mer", reason: "timeout" }),
        },
      },
      { mode: "cron_prepare", now },
    );
    expect(actions.get(actionId)?.preparation_data?.actionTitle).toBe("Titre modifié localement");
    expect(proposals.get("jagis_pour_la_nature:jagis-conflict-1")?.proposalKind).toBe("field_conflict");

    // Explicit cancellation -> cancellation_review proposal, action preserved
    const v3 = [{ ...v2[0], status: "cancelled", updated_at: "r3" }];
    await runExternalActionSync(
      {
        store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents(v3, now.toISOString()),
          fondation_de_la_mer: async () => ({ status: "disabled", source: "fondation_de_la_mer", reason: "operator_authorization_required" }),
        },
      },
      { mode: "cron_prepare", now },
    );
    expect(proposals.get("jagis_pour_la_nature:jagis-conflict-1")?.proposalKind).toBe("cancellation_review");

    // Administrative suppression -> tombstone blocks recreation on subsequent sync
    await store.suppressAction({
      actionId,
      actorUserId: "admin-1",
      operationId: "op-1",
      reason: "Doublon supprimé",
    });
    const afterSuppress = await runExternalActionSync(
      {
        store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents([{ ...v1[0], updated_at: "r4" }], now.toISOString()),
          fondation_de_la_mer: async () => ({ status: "disabled", source: "fondation_de_la_mer", reason: "operator_authorization_required" }),
        },
      },
      { mode: "admin_sync_now", now },
    );
    expect(afterSuppress.suppressed).toBe(1);
    expect(actions.size).toBe(1);
  });

  it("refuses writes when mandate is revoked", async () => {
    const revokedSubs: ExternalActionSubscription[] = [
      {
        ...baseSubs[0],
        revokedAt: "2026-11-25T12:00:00.000Z",
      },
    ];
    const { store, actions } = createInMemorySyncStore({ subscriptions: revokedSubs });
    const reader = vi.fn(async () =>
      readSyntheticJagisEvents([], "2026-11-26T10:00:00.000Z"),
    );
    const summary = await runExternalActionSync(
      { store, readers: { jagis_pour_la_nature: reader } },
      { mode: "admin_sync_now" },
    );
    expect(reader).not.toHaveBeenCalled();
    expect(summary.disabledSources).toBe(1);
    expect(actions.size).toBe(0);
  });
});
