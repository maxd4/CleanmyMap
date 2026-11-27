import { describe, expect, it } from "vitest";
import { readFondationMerEvents, readSyntheticFondationMerEvents } from "./fondation-mer-adapter";
import { readJagisEvents, readSyntheticJagisEvents } from "./jagis-adapter";
import { runExternalActionSync } from "./engine";
import { findMatchingCandidateActions } from "./matching";
import { assertSafeExternalSyncUrl } from "./url-guard";
import type { CandidateActionRow } from "./matching";
import { baseSubs, createInMemorySyncStore } from "./external-sync-engine.test-helpers";

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
});
