import { describe, expect, it, vi } from "vitest";
import { readSyntheticJagisEvents } from "./jagis-adapter";
import { runExternalActionSync } from "./engine";
import type { ExternalActionSubscription } from "./types";
import { baseSubs, createInMemorySyncStore } from "./external-sync-engine.test-helpers";

describe("external-sync Lot A publication, mandates & tombstones", () => {
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

  it("aborts publication when markReferenceApplied or unchanged-hash mandate check returns mandate_revoked", async () => {
    const now = new Date("2026-11-26T10:00:00.000Z");
    const rec = [
      {
        id: "jagis-revoke-race-1",
        url: "https://example.test/jagis/rr1",
        title: "Collecte race révocation",
        start_date: "2027-09-18",
        start_time: "10:00",
        meeting_point: "Place Gambetta",
        city: "Paris",
        route_reference: "gambetta-race",
        status: "published",
      },
    ];

    const raceStore = createInMemorySyncStore({ subscriptions: baseSubs });
    vi.spyOn(raceStore.store, "markReferenceApplied").mockResolvedValueOnce("mandate_revoked");
    const raceSummary = await runExternalActionSync(
      {
        store: raceStore.store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents(rec, now.toISOString()),
          fondation_de_la_mer: async () => ({ status: "disabled", source: "fondation_de_la_mer", reason: "operator_authorization_required" }),
        },
      },
      { mode: "admin_sync_now", actorUserId: "admin-1", now },
    );
    expect(raceSummary.createdAndPublished).toBe(0);
    expect(raceSummary.outcomes.some((o) => o.status === "mandate_revoked")).toBe(true);
    expect([...raceStore.actions.values()][0].published_at).toBeNull();

    // Unchanged hash branch must re-verify mandate before publishing
    const unchangedStore = createInMemorySyncStore({ subscriptions: baseSubs });
    await runExternalActionSync(
      {
        store: unchangedStore.store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents(rec, now.toISOString()),
          fondation_de_la_mer: async () => ({ status: "disabled", source: "fondation_de_la_mer", reason: "operator_authorization_required" }),
        },
      },
      { mode: "cron_prepare", now },
    );
    vi.spyOn(unchangedStore.store, "verifyWriteMandate").mockResolvedValueOnce({
      ok: false,
      reason: "mandate_revoked",
    });
    const unchangedPublish = await runExternalActionSync(
      {
        store: unchangedStore.store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents(rec, now.toISOString()),
          fondation_de_la_mer: async () => ({ status: "disabled", source: "fondation_de_la_mer", reason: "operator_authorization_required" }),
        },
      },
      { mode: "admin_sync_now", actorUserId: "admin-1", now },
    );
    expect(unchangedPublish.published).toBe(0);
    expect(unchangedPublish.outcomes.some((o) => o.status === "mandate_revoked")).toBe(true);
    expect([...unchangedStore.actions.values()][0].published_at).toBeNull();
  });

  it("distinguishes pending_review from published, never uses unapplied source_snapshot, and protects cancelled tombstones", async () => {
    const now = new Date("2026-11-26T10:00:00.000Z");
    const rec = [
      {
        id: "jagis-review-1",
        url: "https://example.test/jagis/rev-1",
        title: "Collecte modération associative",
        start_date: "2027-09-20",
        start_time: "09:30",
        meeting_point: "Place Bellecour",
        city: "Lyon",
        route_reference: "bellecour-route",
        status: "published",
      },
    ];

    const reviewStore = createInMemorySyncStore({ subscriptions: baseSubs });
    vi.spyOn(reviewStore.store, "publishPreAction").mockResolvedValueOnce({
      published: false,
      pendingReview: true,
      reason: "pending_review",
    });

    const reviewSummary = await runExternalActionSync(
      {
        store: reviewStore.store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents(rec, now.toISOString()),
          fondation_de_la_mer: async () => ({ status: "disabled", source: "fondation_de_la_mer", reason: "operator_authorization_required" }),
        },
      },
      { mode: "admin_sync_now", actorUserId: "admin-1", now },
    );

    expect(reviewSummary.created).toBe(1);
    expect(reviewSummary.createdAndPublished).toBe(0);
    expect(reviewSummary.pendingReview).toBe(1);
    expect(reviewSummary.conflicts).toBe(0);
    expect(reviewSummary.outcomes.some((o) => o.status === "created_and_pending_review")).toBe(true);

    // Unapplied source_snapshot must NOT be used as appliedSnapshot when applied_snapshot is null
    const actionId = [...reviewStore.actions.keys()][0]!;
    vi.spyOn(reviewStore.store, "getReference").mockResolvedValueOnce({
      identity_hash: "h1",
      action_id: actionId,
      external_url: "https://example.test/jagis/rev-1",
      external_revision: null,
      source_snapshot: {
        actionTitle: "Collecte modération associative",
        actionDate: "2027-09-20",
        startTime: "09:30",
        locationLabel: "Lyon — Place Bellecour",
      },
      content_hash: "c1",
      applied_snapshot: null,
      applied_content_hash: null,
      applied_revision: null,
      applied_at: null,
      suppressed: false,
    });
    const unappliedMerge = await runExternalActionSync(
      {
        store: reviewStore.store,
        readers: {
          jagis_pour_la_nature: async () =>
            readSyntheticJagisEvents([{ ...rec[0], title: "Titre modifié" }], now.toISOString()),
          fondation_de_la_mer: async () => ({ status: "disabled", source: "fondation_de_la_mer", reason: "operator_authorization_required" }),
        },
      },
      { mode: "cron_prepare", now },
    );
    expect(unappliedMerge.conflicts).toBe(1);
    expect(reviewStore.actions.get(actionId)!.preparation_data?.actionTitle).toBe("Collecte modération associative");

    // When applied_snapshot is present, updatePreActionFields returning mandate_revoked aborts without creating a proposal
    reviewStore.proposals.clear();
    vi.spyOn(reviewStore.store, "updatePreActionFields").mockResolvedValueOnce("mandate_revoked");
    const revokedUpdate = await runExternalActionSync(
      {
        store: reviewStore.store,
        readers: {
          jagis_pour_la_nature: async () =>
            readSyntheticJagisEvents([{ ...rec[0], title: "Titre modifié 2" }], now.toISOString()),
          fondation_de_la_mer: async () => ({ status: "disabled", source: "fondation_de_la_mer", reason: "operator_authorization_required" }),
        },
      },
      { mode: "cron_prepare", now },
    );
    expect(revokedUpdate.outcomes.some((o) => o.status === "mandate_revoked")).toBe(true);
    expect(reviewStore.proposals.size).toBe(0);

    // External cancellation on an already-cancelled tombstone must not mutate notes
    const action = reviewStore.actions.get(actionId)!;
    action.status = "cancelled";
    const updateSpy = vi.spyOn(reviewStore.store, "updatePreActionFields");
    updateSpy.mockClear();
    const cancelledTombstone = await runExternalActionSync(
      {
        store: reviewStore.store,
        readers: {
          jagis_pour_la_nature: async () =>
            readSyntheticJagisEvents([{ ...rec[0], status: "cancelled" }], now.toISOString()),
          fondation_de_la_mer: async () => ({ status: "disabled", source: "fondation_de_la_mer", reason: "operator_authorization_required" }),
        },
      },
      { mode: "cron_prepare", now },
    );
    expect(updateSpy).not.toHaveBeenCalled();
    expect(cancelledTombstone.suppressed).toBe(1);
  });

  it("aborts external cancellation proposal on registration-close conflict/failure so retry stays explicit, and propagates refreshed updated_at to publishPreAction", async () => {
    const now = new Date("2026-11-26T12:00:00Z");
    const rec = [
      {
        id: "jagis-cancel-retry-1",
        url: "https://example.test/jagis/cancel-retry-1",
        title: "Collecte annulation retry",
        start_date: "2027-09-21",
        start_time: "10:00",
        meeting_point: "Place Carnot",
        city: "Lyon",
        route_reference: "carnot-route",
        status: "published",
      },
    ];
    const cancelStore = createInMemorySyncStore({ subscriptions: baseSubs });
    const events = readSyntheticJagisEvents(rec, now.toISOString());
    if (events.status !== "available") throw new Error("expected available");
    const initial = await runExternalActionSync(
      {
        store: cancelStore.store,
        readers: {
          jagis_pour_la_nature: async () => events,
          fondation_de_la_mer: async () => ({
            status: "disabled",
            source: "fondation_de_la_mer",
            reason: "operator_authorization_required",
          }),
        },
      },
      { mode: "cron_prepare", now },
    );
    expect(initial.errors).toBe(0);
    const linkedActionId = [...cancelStore.actions.keys()][0]!;
    const linkedAction = cancelStore.actions.get(linkedActionId)!;
    linkedAction.notes = '[cmm-meta]{"groupJoinEnabled":true}[/cmm-meta]';

    // Force conflict on registration closure during external cancellation
    const updateSpy = vi.spyOn(cancelStore.store, "updatePreActionFields").mockResolvedValueOnce("conflict");
    const upsertSpy = vi.spyOn(cancelStore.store, "upsertProposal");
    const cancelledConflict = await runExternalActionSync(
      {
        store: cancelStore.store,
        readers: {
          jagis_pour_la_nature: async () =>
            readSyntheticJagisEvents([{ ...rec[0], status: "cancelled" }], now.toISOString()),
          fondation_de_la_mer: async () => ({
            status: "disabled",
            source: "fondation_de_la_mer",
            reason: "operator_authorization_required",
          }),
        },
      },
      { mode: "cron_prepare", now },
    );
    expect(updateSpy).toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(cancelStore.proposals.size).toBe(0);
    expect(cancelledConflict.errors).toBe(1);
    expect(cancelledConflict.outcomes[0]).toMatchObject({
      status: "error",
      reason: "cancellation_registration_close_conflict",
    });

    // Next sync retries and succeeds once the conflict clears
    const retried = await runExternalActionSync(
      {
        store: cancelStore.store,
        readers: {
          jagis_pour_la_nature: async () =>
            readSyntheticJagisEvents([{ ...rec[0], status: "cancelled" }], now.toISOString()),
          fondation_de_la_mer: async () => ({
            status: "disabled",
            source: "fondation_de_la_mer",
            reason: "operator_authorization_required",
          }),
        },
      },
      { mode: "cron_prepare", now },
    );
    expect(retried.errors).toBe(0);
    expect(retried.outcomes[0]).toMatchObject({
      status: "needs_review",
      reason: "external_cancellation",
    });
    expect(cancelStore.proposals.size).toBe(1);

    // Verify refreshed updated_at is passed to publishPreAction after pre-action field update
    const store2 = createInMemorySyncStore({ subscriptions: baseSubs });
    const rec2 = [{ ...rec[0], id: "jagis-refresh-1", title: "Ancien titre" }];
    const link2 = await runExternalActionSync(
      {
        store: store2.store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents(rec2, now.toISOString()),
          fondation_de_la_mer: async () => ({
            status: "disabled",
            source: "fondation_de_la_mer",
            reason: "operator_authorization_required",
          }),
        },
      },
      { mode: "cron_prepare", now },
    );
    expect(link2.errors).toBe(0);
    const act2Id = [...store2.actions.keys()][0]!;
    vi.spyOn(store2.store, "updatePreActionFields").mockImplementationOnce(async (id) => {
      const row = store2.actions.get(id)!;
      store2.actions.set(id, { ...row, updated_at: "2026-11-26T09:05:00Z" });
      return true;
    });
    const publishSpy = vi.spyOn(store2.store, "publishPreAction");
    await runExternalActionSync(
      {
        store: store2.store,
        readers: {
          jagis_pour_la_nature: async () =>
            readSyntheticJagisEvents([{ ...rec2[0], title: "Nouveau titre" }], now.toISOString()),
          fondation_de_la_mer: async () => ({
            status: "disabled",
            source: "fondation_de_la_mer",
            reason: "operator_authorization_required",
          }),
        },
      },
      { mode: "admin_sync_now", actorUserId: "admin-1", now },
    );
    expect(publishSpy).toHaveBeenCalledWith(
      act2Id,
      "admin-1",
      "2026-11-26T09:05:00Z",
      expect.objectContaining({ externalEventId: "jagis-refresh-1" }),
    );
  });
});
