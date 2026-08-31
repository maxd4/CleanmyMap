import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { loadEventPressureByArrondissement } from "./recommendation-assistant";

type EventRow = {
  id: string;
  title: string;
  event_date: string;
  location_label: string;
  description: string | null;
};

type RsvpRow = {
  event_id: string;
  status: "yes" | "maybe" | "no";
};

function buildQuery<T>(data: T[]) {
  const query = {
    select: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    order: vi.fn(() => query),
    in: vi.fn(() => query),
    limit: vi.fn(async () => ({ data, error: null })),
  };

  return query;
}

function buildSupabase(events: EventRow[], rsvps: RsvpRow[]): SupabaseClient {
  const eventsQuery = buildQuery(events);
  const rsvpsQuery = buildQuery(rsvps);

  return {
    from: vi.fn((table: string) =>
      table === "community_events" ? eventsQuery : rsvpsQuery,
    ),
  } as unknown as SupabaseClient;
}

function event(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: "event-1",
    title: "Collecte du canal",
    event_date: new Date().toISOString().slice(0, 10),
    location_label: "Paris 4e",
    description: null,
    ...overrides,
  };
}

describe("loadEventPressureByArrondissement", () => {
  it("uses serialized capacityTarget from EVENT_OPS", async () => {
    const result = await loadEventPressureByArrondissement(
      buildSupabase(
        [
          event({
            description: 'Description publique\n[EVENT_OPS]{"capacityTarget":48}',
          }),
        ],
        [
          { event_id: "event-1", status: "yes" },
          { event_id: "event-1", status: "maybe" },
        ],
      ),
    );

    expect(result.pressureByArrondissement.get(4)).toBe(9.5);
    expect(result.eventSignals[0]).toContain("pression estimee 9.5");
  });

  it("treats a description without EVENT_OPS as zero capacity", async () => {
    const result = await loadEventPressureByArrondissement(
      buildSupabase(
        [event({ description: "Description publique uniquement" })],
        [{ event_id: "event-1", status: "yes" }],
      ),
    );

    expect(result.pressureByArrondissement.get(4)).toBe(1);
    expect(result.eventSignals[0]).toContain("pression estimee 1.0");
  });

  it("treats corrupted EVENT_OPS as zero capacity without throwing", async () => {
    const result = await loadEventPressureByArrondissement(
      buildSupabase(
        [event({ description: "Description publique\n[EVENT_OPS]{not-json" })],
        [{ event_id: "event-1", status: "maybe" }],
      ),
    );

    expect(result.pressureByArrondissement.get(4)).toBe(0.5);
    expect(result.eventSignals[0]).toContain("pression estimee 0.5");
  });
});
