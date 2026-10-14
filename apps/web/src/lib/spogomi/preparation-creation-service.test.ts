import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserIdentity: vi.fn(),
  createAction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/authz", () => ({ getCurrentUserIdentity: mocks.getCurrentUserIdentity }));
vi.mock("@/lib/actions/intervention-mode", () => ({ createActionInterventionMode: () => "fixed_area" }));
vi.mock("@/lib/actions/permissions", () => ({ canManageAction: () => true }));
vi.mock("@/lib/actions/store-create", () => ({ createAction: mocks.createAction }));
vi.mock("@/lib/spogomi/public-service", () => ({ normalizeSpogomiEventSlug: (name: string) => name.toLowerCase().replace(/\s+/g, "-") }));

import { createSpogomiEvent } from "./preparation-creation-service";

type Row = Record<string, unknown>;

class CreationStore {
  attempts: Row[] = [];
  actions: Row[] = [];
  events: Row[] = [];
  organizers: Row[] = [];
  eventInsertFailures = 0;
  actionInsertCount = 0;
  eventInsertCount = 0;

  from(table: string) {
    return new Query(this, table);
  }
}

class Query implements PromiseLike<{ data: Row | Row[] | null; error: Row | null }> {
  private operation: "select" | "insert" | "update" = "select";
  private payload: Row | null = null;
  private filters: Array<[string, unknown]> = [];
  private nullFilters: string[] = [];
  private containsFilter: Row | null = null;
  private selected = false;
  private singleResult = false;

  constructor(private readonly store: CreationStore, private readonly table: string) {}

  select() {
    this.selected = true;
    return this;
  }

  insert(payload: Row) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Row) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  is(column: string, value: unknown) {
    if (value === null) this.nullFilters.push(column);
    return this;
  }

  or() {
    return this;
  }

  contains(_column: string, value: Row) {
    this.containsFilter = value;
    return this;
  }

  maybeSingle() {
    this.singleResult = true;
    return this.execute();
  }

  then<TResult1 = { data: Row | Row[] | null; error: Row | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row | Row[] | null; error: Row | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private rows(): Row[] {
    const rows = this.table === "spogomi_event_creation_attempts"
      ? this.store.attempts
      : this.table === "spogomi_events"
        ? this.store.events
        : this.table === "actions"
          ? this.store.actions
          : this.store.organizers;
    return rows.filter((row) => this.filters.every(([column, value]) => row[column] === value))
      .filter((row) => this.nullFilters.every((column) => row[column] === null))
      .filter((row) => !this.containsFilter || Object.entries(this.containsFilter).every(([key, value]) => (row[key] as Row | null)?.[key] === value || (row.preparation_data as Row | null)?.[key] === value));
  }

  private async execute(): Promise<{ data: Row | Row[] | null; error: Row | null }> {
    if (this.operation === "insert") {
      const payload = this.payload ?? {};
      if (this.table === "spogomi_event_creation_attempts" && this.store.attempts.some((row) => row.idempotency_key === payload.idempotency_key)) {
        return { data: null, error: { code: "23505", message: "duplicate idempotency key" } };
      }
      if (this.table === "spogomi_events" && this.store.eventInsertFailures > 0) {
        this.store.eventInsertFailures -= 1;
        return { data: null, error: { code: "40001", message: "transient event insert failure" } };
      }
      const row: Row = { ...payload };
      if (this.table === "spogomi_event_creation_attempts") {
        row.id = `attempt-${this.store.attempts.length + 1}`;
        this.store.attempts.push(row);
      } else if (this.table === "spogomi_events") {
        row.id = `event-${this.store.events.length + 1}`;
        row.team_size_config = row.team_size_config ?? {};
        this.store.events.push(row);
        this.store.eventInsertCount += 1;
      }
      return { data: row, error: null };
    }

    const matching = this.rows();
    if (this.operation === "update") {
      for (const row of matching) Object.assign(row, this.payload ?? {});
      return { data: this.selected ? matching[0] ?? null : null, error: null };
    }
    return { data: this.selected ? (this.singleResult ? matching[0] ?? null : matching) : matching, error: null };
  }
}

function input(overrides: Partial<Parameters<typeof createSpogomiEvent>[0]["input"]> = {}) {
  return {
    idempotencyKey: "spogomi-test-key",
    name: "Compétition test",
    locationLabel: "Paris",
    mode: "casual" as const,
    startsAt: "2026-10-13T12:00:00.000Z",
    endsAt: null,
    ...overrides,
  };
}

function oldFingerprint(value: ReturnType<typeof input>, casualTeamSize: number | null) {
  const startsAt = new Date(value.startsAt).toISOString();
  return createHash("sha256").update(JSON.stringify({
    name: value.name,
    locationLabel: value.locationLabel,
    mode: value.mode,
    startsAt,
    endsAt: value.endsAt ? new Date(value.endsAt).toISOString() : null,
    casualTeamSize,
  })).digest("hex");
}

describe("SPOGOMI event creation contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUserIdentity.mockResolvedValue({ userId: "user-1", displayName: "Alex", handle: "alex", role: null, activeRole: null });
  });

  it.each([
    ["past", "2020-01-01T08:00:00.000Z", "2020-01-01T09:00:00.000Z"],
    ["future", "2099-01-01T08:00:00.000Z", "2099-01-01T09:00:00.000Z"],
    ["crossing-present", "2020-01-01T08:00:00.000Z", "2099-01-01T09:00:00.000Z"],
  ])("accepts a %s period without consulting the current date", async (_label, startsAt, endsAt) => {
    const store = new CreationStore();
    mocks.createAction.mockImplementation(async (_supabase: unknown, params: { userId: string; payload: Row }) => {
      store.actionInsertCount += 1;
      const id = `action-${store.actionInsertCount}`;
      store.actions.push({ id, created_by_clerk_id: params.userId, ...params.payload, preparation_data: params.payload.preparationData, action_date: params.payload.actionDate, location_label: params.payload.locationLabel, event_start_time: params.payload.eventStartTime, event_end_time: params.payload.eventEndTime });
      store.organizers.push({ action_id: id, organizer_clerk_id: params.userId });
      return { id };
    });

    const result = await createSpogomiEvent({ supabase: store as never, userId: "user-1", input: input({ idempotencyKey: `spogomi-${_label}`, startsAt, endsAt }) });

    expect(result.eventId).toBe("event-1");
    expect(store.events[0]).toMatchObject({ starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(), public_visibility: "private" });
    expect(store.events[0]).not.toHaveProperty("team_size_config.casual");
  });

  it("accepts a missing end date and rejects invalid or reversed dates", async () => {
    const store = new CreationStore();
    store.actions.push({ id: "action-1", created_by_clerk_id: "user-1", preparation_data: { spogomiCreationKey: "spogomi-test-key", spogomiCreationFingerprint: "" }, action_date: "2026-10-13", location_label: "Paris", event_start_time: "2026-10-13T12:00:00.000Z", event_end_time: null });
    store.organizers.push({ action_id: "action-1", organizer_clerk_id: "user-1" });
    mocks.createAction.mockResolvedValue({ id: "action-1" });
    const created = await createSpogomiEvent({ supabase: store as never, userId: "user-1", input: input({ endsAt: null }) });
    expect(created.eventId).toBe("event-1");
    expect(store.events[0]?.ends_at).toBeNull();
    await expect(createSpogomiEvent({ supabase: store as never, userId: "user-1", input: input({ idempotencyKey: "spogomi-invalid-start", startsAt: "not-a-date" }) })).rejects.toThrow(/date de début/i);
    await expect(createSpogomiEvent({ supabase: store as never, userId: "user-1", input: input({ idempotencyKey: "spogomi-invalid-end", endsAt: "not-a-date" }) })).rejects.toThrow(/date de fin/i);
    await expect(createSpogomiEvent({ supabase: store as never, userId: "user-1", input: input({ idempotencyKey: "spogomi-reversed", startsAt: "2026-10-13T12:00:00.000Z", endsAt: "2026-10-13T11:00:00.000Z" }) })).rejects.toThrow(/postérieure/i);
  });

  it("reuses one private action and event after a transient failure", async () => {
    const store = new CreationStore();
    store.eventInsertFailures = 1;
    mocks.createAction.mockImplementation(async (_supabase: unknown, params: { userId: string; payload: Row }) => {
      store.actionInsertCount += 1;
      const id = `action-${store.actionInsertCount}`;
      store.actions.push({ id, created_by_clerk_id: params.userId, preparation_data: params.payload.preparationData, action_date: params.payload.actionDate, location_label: params.payload.locationLabel, event_start_time: params.payload.eventStartTime, event_end_time: params.payload.eventEndTime });
      store.organizers.push({ action_id: id, organizer_clerk_id: params.userId });
      return { id };
    });

    await expect(createSpogomiEvent({ supabase: store as never, userId: "user-1", input: input() })).rejects.toThrow(/événement non finalisé/);
    expect(store.attempts[0]).toMatchObject({ state: "failed_recoverable", action_id: "action-1" });

    const result = await createSpogomiEvent({ supabase: store as never, userId: "user-1", input: input() });
    expect(result).toEqual({ eventId: "event-1", actionId: "action-1" });
    expect(store.actionInsertCount).toBe(1);
    expect(store.eventInsertCount).toBe(1);
    expect(store.attempts).toHaveLength(1);
    expect(store.events).toHaveLength(1);
  });

  it("replays a historical attempt whose fingerprint included team size", async () => {
    const store = new CreationStore();
    const value = input({ idempotencyKey: "spogomi-legacy-key" });
    const fingerprint = oldFingerprint(value, 5);
    store.actions.push({ id: "action-legacy", created_by_clerk_id: "user-1", preparation_data: { spogomiCreationKey: value.idempotencyKey, spogomiCreationFingerprint: fingerprint }, action_date: "2026-10-13", location_label: "Paris", event_start_time: value.startsAt, event_end_time: null });
    store.organizers.push({ action_id: "action-legacy", organizer_clerk_id: "user-1" });
    store.events.push({ id: "event-legacy", action_id: "action-legacy", created_by_clerk_id: "user-1", idempotency_key: value.idempotencyKey, name: value.name, location_label: value.locationLabel, mode: value.mode, starts_at: value.startsAt, ends_at: null, team_size_config: { casual: { minMembers: 5, maxMembers: 5 } }, state: "draft", public_visibility: "private" });
    store.attempts.push({ id: "attempt-legacy", idempotency_key: value.idempotencyKey, created_by_clerk_id: "user-1", action_id: "action-legacy", event_id: "event-legacy", state: "ready", intention_fingerprint: fingerprint, processing_token: null, processing_started_at: null });

    const result = await createSpogomiEvent({ supabase: store as never, userId: "user-1", input: value });

    expect(result).toEqual({ eventId: "event-legacy", actionId: "action-legacy" });
    expect(store.actionInsertCount).toBe(0);
    expect(store.eventInsertCount).toBe(0);
    expect(store.events[0]?.team_size_config).toEqual({ casual: { minMembers: 5, maxMembers: 5 } });
  });
});
