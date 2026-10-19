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
  loadCachedPilotageCommunityEvents,
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
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range,
  };
  mocks.getSupabaseServerClient.mockReturnValue({ from: vi.fn(() => builder) });
  return range;
}

function setupScopedSources(params: {
  organizerRows: Array<ReturnType<typeof makeRow>>;
  linkedRows: Array<ReturnType<typeof makeRow>>;
  globalRows: Array<ReturnType<typeof makeRow>>;
}) {
  const builders: Array<{
    eq: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    range: ReturnType<typeof vi.fn>;
  }> = [];
  const from = vi.fn(() => {
    let source: "organizer" | "linked" | "global" = "global";
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => {
        source = "organizer";
        return builder;
      }),
      in: vi.fn(() => {
        source = "linked";
        return builder;
      }),
      order: vi.fn(() => builder),
      range: vi.fn(async () => ({
        data:
          source === "organizer"
            ? params.organizerRows
            : source === "linked"
              ? params.linkedRows
              : params.globalRows,
        error: null,
      })),
    };
    builders.push(builder);
    return builder;
  });
  mocks.getSupabaseServerClient.mockReturnValue({ from });
  return { builders, from };
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

  it("selects organizer-owned events before applying the scoped budget", async () => {
    const organizerEvent = makeRow(121);
    organizerEvent.organizer_clerk_id = "user-a";
    const globalRows = Array.from({ length: 120 }, (_, index) => makeRow(index));
    globalRows.push(organizerEvent);
    const { builders } = setupScopedSources({
      organizerRows: [organizerEvent],
      linkedRows: [],
      globalRows,
    });

    const result = await loadCachedPilotageCommunityEvents("user-a", [], 120);

    expect(result.items.map((event) => event.id)).toEqual(["event-121"]);
    expect(result.availability).toBe("available");
    expect(builders[0]?.eq).toHaveBeenCalledWith("organizer_clerk_id", "user-a");
    expect(builders[0]?.range).toHaveBeenCalledWith(0, 120);
  });

  it("selects linked event ids with a parameterized bounded filter and deduplicates", async () => {
    const linkedEvent = makeRow(122);
    linkedEvent.organizer_clerk_id = "user-b";
    const { builders } = setupScopedSources({
      organizerRows: [],
      linkedRows: [linkedEvent],
      globalRows: [makeRow(0)],
    });

    const result = await loadCachedPilotageCommunityEvents("user-a", ["event-122", "event-122"], 120);

    expect(result.items.map((event) => event.id)).toEqual(["event-122"]);
    expect(builders[1]?.in).toHaveBeenCalledWith("id", ["event-122"]);
  });

  it("does not include an event outside the organizer or linked-event scope", async () => {
    const externalEvent = makeRow(123);
    externalEvent.organizer_clerk_id = "user-b";
    setupScopedSources({
      organizerRows: [],
      linkedRows: [],
      globalRows: [externalEvent],
    });

    const result = await loadCachedPilotageCommunityEvents("user-a", [], 120);

    expect(result.items).toEqual([]);
  });

  it("deduplicates an event selected by both scoped sources", async () => {
    const sharedEvent = makeRow(124);
    sharedEvent.organizer_clerk_id = "user-a";
    setupScopedSources({
      organizerRows: [sharedEvent],
      linkedRows: [sharedEvent],
      globalRows: [],
    });

    const result = await loadCachedPilotageCommunityEvents("user-a", ["event-124"], 120);

    expect(result.items.map((event) => event.id)).toEqual(["event-124"]);
  });

  it("reports partial scoped coverage when the organizer result exceeds the budget", async () => {
    const page = Array.from({ length: 121 }, (_, index) => makeRow(index));
    setupScopedSources({ organizerRows: page, linkedRows: [], globalRows: [] });

    const result = await loadCachedPilotageCommunityEvents("user-a", [], 120);

    expect(result.items).toHaveLength(120);
    expect(result.availability).toBe("partial");
  });

  it("fails closed when a scoped event read fails", async () => {
    setupPages([new Error("scoped event read unavailable")]);

    await expect(loadCachedPilotageCommunityEvents("user-a", [], 120)).rejects.toThrow(
      "scoped event read unavailable",
    );
  });
});
