import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  loadCommunityEventRsvpSummaries: vi.fn(),
  unstableCache: vi.fn((callback: () => unknown) => callback),
}));

vi.mock("next/cache", () => ({ unstable_cache: mocks.unstableCache }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));
vi.mock("./event-rsvp-summaries", () => ({
  indexCommunityEventRsvpSummaries: (rows: unknown[]) =>
    new Map(rows.map((row) => [(row as { eventId: string }).eventId, row])),
  loadCommunityEventRsvpSummaries: mocks.loadCommunityEventRsvpSummaries,
}));

import {
  loadCachedReportCommunityEvents,
  loadCachedReportCommunityEventsWithAvailability,
} from "./report-events";

function makeRow(index: number) {
  return {
    id: `event-${index}`,
    created_at: `2026-01-01T00:00:${String(index % 60).padStart(2, "0")}Z`,
    organizer_clerk_id: `organizer-${index}`,
    title: `Événement ${index}`,
    event_date: "2026-01-01",
    location_label: "Paris 11e",
    latitude: null,
    longitude: null,
    location_source: null,
    description: null,
  };
}

function setupPages(pages: Array<Array<ReturnType<typeof makeRow>> | Error>) {
  const range = vi.fn(async (from: number) => {
    const page = pages[Math.floor(from / 120)];
    if (page instanceof Error) {
      throw page;
    }
    return { data: page ?? [], error: null };
  });
  const builder = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range,
  };
  mocks.getSupabaseServerClient.mockReturnValue({ from: vi.fn(() => builder) });
  return range;
}

describe("report community event loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadCommunityEventRsvpSummaries.mockResolvedValue([]);
  });

  it.each([119, 120, 121])("loads a %s-event corpus with deterministic page boundaries", async (count) => {
    const pages = [
      Array.from({ length: Math.min(count, 120) }, (_, index) => makeRow(index)),
      Array.from({ length: Math.max(0, count - 120) }, (_, index) => makeRow(index + 120)),
    ];
    const range = setupPages(pages);

    const result = await loadCachedReportCommunityEventsWithAvailability();

    expect(result.items).toHaveLength(count);
    expect(result.availability).toBe("available");
    expect(range).toHaveBeenCalledWith(0, 119);
    if (count > 120) {
      expect(range).toHaveBeenCalledWith(120, 239);
    }
  });

  it("keeps the compatibility consumer bounded to one page", async () => {
    const range = setupPages([
      Array.from({ length: 120 }, (_, index) => makeRow(index)),
      [makeRow(120)],
    ]);

    const result = await loadCachedReportCommunityEvents();

    expect(result).toHaveLength(120);
    expect(range).toHaveBeenCalledTimes(1);
  });

  it("marks the report corpus partial when the configured page budget is exhausted", async () => {
    const range = setupPages(
      [
        ...Array.from({ length: 10 }, () =>
        Array.from({ length: 120 }, (_, index) => makeRow(index)),
        ),
        [makeRow(1200)],
      ],
    );

    const result = await loadCachedReportCommunityEventsWithAvailability();

    expect(result.items).toHaveLength(1200);
    expect(result.availability).toBe("partial");
    expect(range).toHaveBeenCalledTimes(11);
  });

  it("fails closed when an intermediate page cannot be read", async () => {
    setupPages([
      Array.from({ length: 120 }, (_, index) => makeRow(index)),
      new Error("page unavailable"),
    ]);

    await expect(loadCachedReportCommunityEventsWithAvailability()).rejects.toThrow(
      "page unavailable",
    );
  });
});
