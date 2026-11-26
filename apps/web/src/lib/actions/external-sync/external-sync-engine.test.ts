import { describe, expect, it, vi } from "vitest";
import { readFondationMerEvents, readSyntheticFondationMerEvents } from "./fondation-mer-adapter";
import { readJagisEvents, readSyntheticJagisEvents } from "./jagis-adapter";
import { runExternalActionSync } from "./engine";
import { findMatchingCandidateActions } from "./matching";
import { assertSafeExternalSyncUrl } from "./url-guard";
import type { ExternalActionSyncStore, ReserveReferenceResult, StoredReferenceResult } from "./store";
import type { CandidateActionRow } from "./matching";
import type { ExternalActionProposal, ExternalActionSubscription } from "./types";

function createInMemorySyncStore(seed: {
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

const baseSubs: ExternalActionSubscription[] = [
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

  it("requires known candidate start time and treats truncated candidate lists as incomplete", () => {
    const event = readSyntheticJagisEvents(
      [
        {
          id: "j-1",
          url: "https://example.test/j/1",
          title: "Collecte",
          start_date: "2027-05-10",
          start_time: "10:00",
          meeting_point: "Mairie du 20e",
          city: "Paris",
          route_reference: "boucle-a",
          status: "published",
        },
      ],
      "2026-11-26T10:00:00.000Z",
    );
    const normalized = event.status === "available" ? event.events[0] : null;
    expect(normalized).not.toBeNull();

    const unknownTimeCandidate: CandidateActionRow = {
      id: "act-1",
      organizer_id: "association-brigade-verte-paris",
      action_date: "2027-05-10",
      action_phase: "pre_action",
      status: "pending",
      published_at: null,
      location_label: "Mairie du 20e — Paris",
      notes: null,
      preparation_data: { zoneCiblePrevue: "boucle-a" },
    };

    expect(
      findMatchingCandidateActions(
        normalized!,
        "association-brigade-verte-paris",
        [unknownTimeCandidate],
      ),
    ).toEqual({ kind: "ambiguous", candidateIds: ["act-1"] });

    expect(
      findMatchingCandidateActions(
        normalized!,
        "association-brigade-verte-paris",
        [],
        { truncated: true },
      ),
    ).toEqual({ kind: "ambiguous", candidateIds: [] });
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
        name: "Collecte Pyrénées — J'agis",
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
      { mode: "admin_sync_now", actorUserId: "admin-1", now },
    );
    expect(actions.size).toBe(1);
    expect(adminSummary.published).toBe(1);
    expect([...actions.values()][0].published_at).not.toBeNull();
  });

  it("preserves unresolved conflict across retries with same hash and blocks publication until resolved", async () => {
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
    const current = actions.get(actionId)!;
    actions.set(actionId, {
      ...current,
      preparation_data: { ...(current.preparation_data ?? {}), actionTitle: "Titre modifié localement" },
    });

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

    // Re-running admin_sync_now with the same v2 hash must NOT ignore the unresolved conflict or publish!
    const retryAdmin = await runExternalActionSync(
      {
        store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents(v2, now.toISOString()),
          fondation_de_la_mer: async () => ({ status: "disabled", source: "fondation_de_la_mer", reason: "operator_authorization_required" }),
        },
      },
      { mode: "admin_sync_now", actorUserId: "admin-1", now },
    );
    expect(retryAdmin.published).toBe(0);
    expect(retryAdmin.conflicts).toBe(1);
    expect(actions.get(actionId)?.published_at).toBeNull();

    // Tombstone blocks recreation
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
      { mode: "admin_sync_now", actorUserId: "admin-1", now },
    );
    expect(afterSuppress.suppressed).toBe(1);
    expect(actions.get(actionId)?.published_at).toBeNull();
  });

  it("respects canonical publication blockers (formality_blocked / pending_review) and revoked/missing-consent mandates", async () => {
    const blocked = createInMemorySyncStore({
      subscriptions: baseSubs,
      blockPublicationReason: "formality_blocked",
    });
    const now = new Date("2026-11-26T10:00:00.000Z");
    const rec = [
      {
        id: "jagis-formality-1",
        url: "https://example.test/jagis/f1",
        title: "Collecte formalité bloquée",
        start_date: "2027-09-12",
        start_time: "10:00",
        meeting_point: "Place Gambetta",
        city: "Paris",
        route_reference: "gambetta-1",
        status: "published",
      },
    ];
    const res = await runExternalActionSync(
      {
        store: blocked.store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents(rec, now.toISOString()),
          fondation_de_la_mer: async () => ({ status: "disabled", source: "fondation_de_la_mer", reason: "operator_authorization_required" }),
        },
      },
      { mode: "admin_sync_now", actorUserId: "admin-1", now },
    );
    expect(res.createdAndPublished).toBe(0);
    expect(res.conflicts).toBe(1);
    expect([...blocked.actions.values()][0].published_at).toBeNull();

    const noConsentSubs: ExternalActionSubscription[] = [
      { ...baseSubs[0], consentGrantedAt: null },
    ];
    const noConsent = createInMemorySyncStore({ subscriptions: noConsentSubs });
    const reader = vi.fn(async () => readSyntheticJagisEvents([], now.toISOString()));
    const noConsentSummary = await runExternalActionSync(
      { store: noConsent.store, readers: { jagis_pour_la_nature: reader } },
      { mode: "admin_sync_now", now },
    );
    expect(reader).not.toHaveBeenCalled();
    expect(noConsentSummary.disabledSources).toBe(1);
  });
});
