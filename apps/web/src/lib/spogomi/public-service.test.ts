import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const serviceMocks = vi.hoisted(() => ({
  organizer: vi.fn(),
  organizers: vi.fn(),
  gallery: vi.fn(),
  projection: vi.fn(),
}));

vi.mock("./partner-impact-service", () => ({ loadSpogomiOrganizerForAction: serviceMocks.organizer, loadSpogomiPublicOrganizersForActions: serviceMocks.organizers }));
vi.mock("./photo-gallery-service", () => ({ loadPublishedSpogomiGalleryForAction: serviceMocks.gallery }));
vi.mock("./results/results-projection-service", () => ({ loadSpogomiResultsProjection: serviceMocks.projection }));

import {
  classifySpogomiPublicLifecycle,
  listPublishedSpogomiEvents,
  loadPublishedSpogomiEventBySlug,
  loadPublishedSpogomiEventForAction,
  loadPublishedSpogomiEventResultsBySlug,
  isReservedSpogomiEventSlug,
  normalizeSpogomiEventSlug,
} from "./public-service";

function makeSupabase(inputRows?: Array<Record<string, unknown>>) {
  const calls: string[] = [];
  const from = vi.fn((table: string) => {
    calls.push(table);
    let selectValue = "";
    const defaultRow = {
      id: "event-1",
      event_slug: "paris-2026",
      name: "SPOGOMI Paris",
      location_label: "Paris",
      mode: "casual",
      state: "certified",
      starts_at: "2026-10-01T08:00:00.000Z",
      ends_at: "2026-10-01T12:00:00.000Z",
      action_id: "action-1",
      public_results_visibility: "certified",
    };
    const rows = inputRows ?? [defaultRow];
    const excludedStates = new Set<string>();
    let requestedSlug: string | null = null;
    let requestedVisibility: string | null = null;
    const query = {
      select: vi.fn((value: string) => { selectValue = value; return query; }),
      eq: vi.fn((column: string, value: unknown) => {
        if (table === "spogomi_events" && column === "event_slug") requestedSlug = String(value);
        if (table === "spogomi_events" && column === "public_visibility") requestedVisibility = String(value);
        return query;
      }),
      neq: vi.fn((column: string, value: unknown) => { if (table === "spogomi_events" && column === "state") excludedStates.add(String(value)); return query; }),
      not: vi.fn(() => query),
      in: vi.fn(() => query),
      order: vi.fn(() => query),
      range: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        if (table === "spogomi_event_routes") {
          return { data: { source: "official_reference", file_name: "route.gpx", point_count: 3, reference_distance_km: 2.5, inferred_topology: "loop", geometry_geojson: { coordinates: [[2.3, 48.8], [2.4, 48.9]] } }, error: null };
        }
        if (table === "spogomi_events") return { data: rows.find((candidate) => (!requestedSlug || candidate.event_slug === requestedSlug) && (!requestedVisibility || candidate.public_visibility === requestedVisibility || candidate.public_visibility === undefined) && !excludedStates.has(String(candidate.state))) ?? null, error: null };
        return { data: null, error: null };
      }),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        if (table === "spogomi_events") return Promise.resolve({ data: rows.filter((candidate) => (!requestedSlug || candidate.event_slug === requestedSlug) && (!requestedVisibility || candidate.public_visibility === requestedVisibility || candidate.public_visibility === undefined) && !excludedStates.has(String(candidate.state))), error: null }).then(resolve, reject);
        if (table === "actions") return Promise.resolve({ data: [{ id: "action-1", status: "approved", published_at: "2026-09-01", moderation_visibility: "public" }], error: null }).then(resolve, reject);
        if (table === "spogomi_teams") return Promise.resolve({ data: [{ id: "team-1", division_id: "division-1", team_number: 1, public_name: "Alpha", composition_state: "locked" }], error: null }).then(resolve, reject);
        return Promise.resolve({ data: [], error: null }).then(resolve, reject);
      },
    };
    void selectValue;
    return query;
  });
  return { from, calls };
}

describe("SPOGOMI public identity and lifecycle", () => {
  it("normalizes a stable URL slug without accents or unsafe separators", () => {
    expect(normalizeSpogomiEventSlug("Coupe d'été — Paris 2026")).toBe("coupe-d-ete-paris-2026");
    expect(normalizeSpogomiEventSlug("***")).toBe("evenement-spogomi");
    expect(normalizeSpogomiEventSlug("")).toBe("evenement-spogomi");
    expect(normalizeSpogomiEventSlug(`${"!".repeat(10_000)}Été---Paris${"!".repeat(10_000)}`)).toBe("ete-paris");
    expect(normalizeSpogomiEventSlug(`${"a".repeat(71)}--b`)).toBe("a".repeat(71));
    expect(normalizeSpogomiEventSlug("a".repeat(72))).toBe("a".repeat(72));
    expect(normalizeSpogomiEventSlug("Été___---Paris")).toBe("ete-paris");
    expect(isReservedSpogomiEventSlug("nouveau")).toBe(true);
    expect(isReservedSpogomiEventSlug("mes-evenements")).toBe(true);
    expect(isReservedSpogomiEventSlug("paris-2026")).toBe(false);
  });

  it("classifies only from event dates and terminal states", () => {
    const now = new Date("2026-10-12T12:00:00.000Z");
    expect(classifySpogomiPublicLifecycle("2026-10-13T12:00:00.000Z", null, "draft", now)).toBe("upcoming");
    expect(classifySpogomiPublicLifecycle("2026-10-12T10:00:00.000Z", "2026-10-12T14:00:00.000Z", "in_progress", now)).toBe("in_progress");
    expect(classifySpogomiPublicLifecycle("2026-10-11T10:00:00.000Z", "2026-10-11T14:00:00.000Z", "in_progress", now)).toBe("finished");
    expect(classifySpogomiPublicLifecycle("2026-10-13T10:00:00.000Z", null, "certified", now)).toBe("upcoming");
  });

  it("loads the published event projections without exposing unpublished actions", async () => {
    const supabase = makeSupabase();
    serviceMocks.organizer.mockResolvedValue({ name: "Association Clean" });
    serviceMocks.organizers.mockResolvedValue(new Map([["action-1", { name: "Association Clean" }]]));
    serviceMocks.gallery.mockResolvedValue([{ id: "photo-1" }]);
    serviceMocks.projection.mockResolvedValue({ results: { visibility: "certified" } });

    await expect(listPublishedSpogomiEvents(supabase as never)).resolves.toMatchObject([{
      slug: "paris-2026",
      actionHref: "/actions/map?actionId=action-1",
      organizer: { name: "Association Clean" },
    }]);

    await expect(loadPublishedSpogomiEventBySlug("paris-2026", supabase as never)).resolves.toMatchObject({
      route: { fileName: "route.gpx", pointCount: 3 },
      teams: [{ teamNumber: 1, publicName: "Alpha" }],
      gallery: [{ id: "photo-1" }],
      results: { visibility: "certified" },
    });
    await expect(loadPublishedSpogomiEventResultsBySlug("paris-2026", supabase as never)).resolves.toEqual({ visibility: "certified" });
    await expect(loadPublishedSpogomiEventForAction("action-1", supabase as never)).resolves.toEqual({ slug: "paris-2026", name: "SPOGOMI Paris" });
  });

  it("keeps active editions first, sorts finished editions newest-first, and excludes cancellations from the catalogue", async () => {
    const rows = [
      { id: "in-progress", event_slug: "in-progress", name: "En cours", location_label: "Paris", mode: "casual", state: "active", starts_at: "2026-11-08T08:00:00.000Z", ends_at: "2026-11-10T12:00:00.000Z", action_id: "action-1", public_results_visibility: "hidden" },
      { id: "upcoming", event_slug: "upcoming", name: "À venir", location_label: "Lyon", mode: "world_cup", state: "draft", starts_at: "2026-12-01T08:00:00.000Z", ends_at: null, action_id: "action-1", public_results_visibility: "hidden" },
      { id: "finished-new", event_slug: "finished-new", name: "Terminée récente", location_label: "Nice", mode: "casual", state: "active", starts_at: "2026-10-10T08:00:00.000Z", ends_at: "2026-10-10T12:00:00.000Z", action_id: "action-1", public_results_visibility: "hidden" },
      { id: "finished-old", event_slug: "finished-old", name: "Terminée ancienne", location_label: "Bordeaux", mode: "casual", state: "active", starts_at: "2026-09-10T08:00:00.000Z", ends_at: "2026-09-10T12:00:00.000Z", action_id: "action-1", public_results_visibility: "hidden" },
      { id: "cancelled", event_slug: "cancelled", name: "Annulée", location_label: "Lille", mode: "casual", state: "cancelled", starts_at: "2026-12-20T08:00:00.000Z", ends_at: null, action_id: "action-1", public_results_visibility: "hidden" },
    ];
    serviceMocks.organizer.mockResolvedValue(null);
    serviceMocks.organizers.mockResolvedValue(new Map([["action-1", null]]));
    serviceMocks.projection.mockClear();
    serviceMocks.projection.mockResolvedValue({ results: { lifecycleStatus: "unavailable" } });

    const events = await listPublishedSpogomiEvents(makeSupabase(rows) as never);
    expect(events.map((event) => event.slug)).toEqual(["in-progress", "upcoming", "finished-new", "finished-old"]);
    expect(events.every((event) => event.state !== "cancelled")).toBe(true);
    expect(serviceMocks.projection).not.toHaveBeenCalled();
  });

  it("keeps a published cancelled edition directly addressable without exposing its roster", async () => {
    serviceMocks.organizer.mockResolvedValue(null);
    serviceMocks.projection.mockResolvedValue({ results: { lifecycleStatus: "unavailable" } });
    const event = await loadPublishedSpogomiEventBySlug("cancelled", makeSupabase([{
      id: "cancelled", event_slug: "cancelled", name: "Annulée", location_label: "Lille", mode: "casual", state: "cancelled",
      starts_at: "2026-12-20T08:00:00.000Z", ends_at: null, action_id: "action-1", public_visibility: "published", public_results_visibility: "hidden",
    }]) as never);
    expect(event).toMatchObject({ slug: "cancelled", lifecycle: "cancelled", state: "cancelled", teams: [], actionHref: null });
  });

  it("does not expose a private edition through either catalogue or direct slug lookup", async () => {
    const supabase = makeSupabase([{
      id: "private", event_slug: "private", name: "Privée", location_label: "Lille", mode: "casual", state: "draft",
      starts_at: "2026-12-20T08:00:00.000Z", ends_at: null, action_id: "action-1", public_visibility: "private", public_results_visibility: "hidden",
    }]);
    await expect(listPublishedSpogomiEvents(supabase as never)).resolves.toEqual([]);
    await expect(loadPublishedSpogomiEventBySlug("private", supabase as never)).resolves.toBeNull();
  });

  it("batches public registration and organizer reads across catalog editions", async () => {
    serviceMocks.organizers.mockClear();
    const supabase = makeSupabase([
      { id: "event-1", event_slug: "paris", name: "Paris", location_label: "Paris", mode: "casual", state: "active", starts_at: "2026-11-08T08:00:00.000Z", ends_at: null, action_id: "action-1", public_results_visibility: "hidden" },
      { id: "event-2", event_slug: "lyon", name: "Lyon", location_label: "Lyon", mode: "casual", state: "active", starts_at: "2026-12-08T08:00:00.000Z", ends_at: null, action_id: "action-2", public_results_visibility: "hidden" },
    ]);
    serviceMocks.organizers.mockResolvedValue(new Map([["action-1", null], ["action-2", null]]));
    serviceMocks.projection.mockResolvedValue({ results: { lifecycleStatus: "unavailable" } });

    await listPublishedSpogomiEvents(supabase as never);

    expect(supabase.calls.filter((table) => table === "spogomi_divisions")).toHaveLength(1);
    expect(supabase.calls.filter((table) => table === "spogomi_participants")).toHaveLength(1);
    expect(serviceMocks.organizers).toHaveBeenCalledTimes(1);
    expect(serviceMocks.organizers.mock.calls[0]?.[0]).toMatchObject({ actionIds: ["action-1", "action-2"] });
  });
});
