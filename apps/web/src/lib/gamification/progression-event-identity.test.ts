import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type LogicalEvent = {
  user_id: string;
  event_type: string;
  source_table: string;
  source_id: string;
  status_phase: "pending" | "validated" | "rejected";
  occurred_on: string;
};

function logicalIdentity(event: LogicalEvent): string {
  return [
    event.user_id,
    event.event_type,
    event.source_table,
    event.source_id,
    event.status_phase,
  ].join("\u001f");
}

const baseEvent: LogicalEvent = {
  user_id: "user-1",
  event_type: "action_declare_validation",
  source_table: "actions",
  source_id: "action-1",
  status_phase: "validated",
  occurred_on: "2026-01-01",
};

function eventWith(overrides: Partial<LogicalEvent>): LogicalEvent {
  return { ...baseEvent, ...overrides };
}

describe("progression event logical identity", () => {
  it("A: rejects an exact replay of the same logical event", () => {
    expect(logicalIdentity(baseEvent)).toBe(logicalIdentity(eventWith({})));
  });

  it("B: allows two users on the same source and event", () => {
    expect(logicalIdentity(baseEvent)).not.toBe(
      logicalIdentity(eventWith({ user_id: "user-2" })),
    );
  });

  it("C: allows two sources for one user and event", () => {
    expect(logicalIdentity(baseEvent)).not.toBe(
      logicalIdentity(eventWith({ source_id: "action-2" })),
    );
  });

  it("D: allows different event types on one user and source", () => {
    expect(logicalIdentity(baseEvent)).not.toBe(
      logicalIdentity(eventWith({ event_type: "action_declare_pending" })),
    );
  });

  it("E: allows pending and validated phases for one event source", () => {
    expect(logicalIdentity(baseEvent)).not.toBe(
      logicalIdentity(eventWith({ status_phase: "pending" })),
    );
  });

  it("F: does not use the date as the sole deduplication key", () => {
    expect(logicalIdentity(baseEvent)).not.toBe(
      logicalIdentity(eventWith({ source_id: "action-2", occurred_on: baseEvent.occurred_on })),
    );
  });

  it("keeps the canonical identity in the append-only migration", () => {
    const migration = readFileSync(
      new URL(
        "../../../supabase/migrations/20260924000000_progression_event_logical_identity.sql",
        import.meta.url,
      ),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(migration).toMatch(
      /create unique index if not exists uq_progression_events_logical_identity on public\.progression_events \( user_id, event_type, source_table, source_id, status_phase \)/i,
    );
    expect(migration).toContain("drop index if exists public.uq_progression_events_daily_by_type");
    expect(migration).toContain("drop index if exists public.uq_progression_events_source_phase");
    expect(migration).toContain("drop index if exists public.uq_progression_events_user_source");
    expect(migration).not.toMatch(
      /create unique index[^;]+uq_progression_events_(daily_by_type|source_phase|user_source)/i,
    );
    expect(migration).not.toMatch(
      /create unique index[^;]+\(\s*user_id\s*,\s*event_type\s*,\s*occurred_on/i,
    );
  });
});
