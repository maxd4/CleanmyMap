import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const serviceMocks = vi.hoisted(() => ({
  organizer: vi.fn(),
  gallery: vi.fn(),
  projection: vi.fn(),
}));

vi.mock("./partner-impact-service", () => ({ loadSpogomiOrganizerForAction: serviceMocks.organizer }));
vi.mock("./photo-gallery-service", () => ({ loadPublishedSpogomiGalleryForAction: serviceMocks.gallery }));
vi.mock("./results-projection-service", () => ({ loadSpogomiResultsProjection: serviceMocks.projection }));

import {
  classifySpogomiPublicLifecycle,
  listPublishedSpogomiEvents,
  loadPublishedSpogomiEventBySlug,
  loadPublishedSpogomiEventForAction,
  loadPublishedSpogomiEventResultsBySlug,
  isReservedSpogomiEventSlug,
  normalizeSpogomiEventSlug,
} from "./public-service";

function makeSupabase() {
  const from = vi.fn((table: string) => {
    let selectValue = "";
    const row = {
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
    const query = {
      select: vi.fn((value: string) => { selectValue = value; return query; }),
      eq: vi.fn(() => query),
      neq: vi.fn(() => query),
      not: vi.fn(() => query),
      in: vi.fn(() => query),
      order: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        if (table === "spogomi_event_routes") {
          return { data: { source: "official_reference", file_name: "route.gpx", point_count: 3, reference_distance_km: 2.5, inferred_topology: "loop", geometry_geojson: { coordinates: [[2.3, 48.8], [2.4, 48.9]] } }, error: null };
        }
        if (table === "spogomi_events") return { data: row, error: null };
        return { data: null, error: null };
      }),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        if (table === "spogomi_events") return Promise.resolve({ data: [row], error: null }).then(resolve, reject);
        if (table === "actions") return Promise.resolve({ data: [{ id: "action-1", status: "approved", published_at: "2026-09-01", moderation_visibility: "public" }], error: null }).then(resolve, reject);
        if (table === "spogomi_teams") return Promise.resolve({ data: [{ id: "team-1", division_id: "division-1", team_number: 1, public_name: "Alpha", composition_state: "locked" }], error: null }).then(resolve, reject);
        return Promise.resolve({ data: [], error: null }).then(resolve, reject);
      },
    };
    void selectValue;
    return query;
  });
  return { from };
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
    expect(classifySpogomiPublicLifecycle("2026-10-13T10:00:00.000Z", null, "certified", now)).toBe("finished");
  });

  it("loads the published event projections without exposing unpublished actions", async () => {
    const supabase = makeSupabase();
    serviceMocks.organizer.mockResolvedValue({ name: "Association Clean" });
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
});
