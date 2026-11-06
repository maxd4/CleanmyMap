import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadActivePedestrianRiskProjection } from "./pedestrian-risk-projection-store";

const sourceVersions = {
  networkKey: "pilot",
  networkImporterVersion: "importer-v1",
  networkSourceSha256: "a".repeat(64),
  networkSourceRetrievedAt: "2026-11-04T08:00:00.000Z",
  pressureSnapshotId: "pressure-1",
  pressureSchemaVersion: "paris-pressure-v1",
  pressureGeneratedAt: "2026-11-04T07:00:00.000Z",
  pressureRefreshedAt: "2026-11-04T07:30:00.000Z",
  riskModelVersion: "paris-pressure-risk-v3-urban-morphology",
  serviceabilitySnapshotId: null,
  serviceabilitySchemaVersion: null,
  serviceabilityModelVersion: null,
  serviceabilityGeneratedAt: null,
  serviceabilityRefreshedAt: null,
};

function row(index: number, overrides: Record<string, unknown> = {}) {
  return {
    projection_version_id: "projection-v1",
    projection_key: "paris-pantheon-jardin-des-plantes",
    schema_version: "paris-pedestrian-risk-projection-v1",
    policy_version: "segment-zonal-neutral-v1",
    network_version_id: "network-v1",
    generated_at: "2026-11-04T09:00:00.000Z",
    publication_revision: 1,
    source_versions: sourceVersions,
    projection_segment_id: `segment-${index}`,
    edge_key: `edge-${String(index).padStart(5, "0")}`,
    osm_way_id: index,
    segment_index: 0,
    direction: "forward",
    from_node_id: index,
    to_node_id: index + 1,
    zone_id: "iris-1",
    intersected_zone_ids: ["iris-1"],
    length_m: 12,
    intersection_length_m: 12,
    effective_resolution: "iris",
    risk_status: "predicted",
    waste_risk: 40,
    cigarette_butt_risk: 60,
    mixed_risk: 50,
    geometry_geojson: { coordinates: [[2.35 + index / 100000, 48.84], [2.3501 + index / 100000, 48.84]] },
    midpoint_geojson: { coordinates: [2.35005 + index / 100000, 48.84] },
    waste_confidence: null,
    cigarette_butt_confidence: null,
    waste_factors: null,
    cigarette_butt_factors: null,
    available_factors: { waste: [], cigaretteButts: [] },
    missing_factors: { waste: [], cigaretteButts: [] },
    serviceability: null,
    provenance: [],
    notes: [],
    ...overrides,
  };
}

function clientForPages(pages: unknown[][]) {
  const rpc = vi.fn(async (_name: string, args: { p_offset: number }) => ({
    data: pages[Math.floor(args.p_offset / 900)] ?? [],
    error: null,
  }));
  return { rpc } as never as Parameters<typeof loadActivePedestrianRiskProjection>[0] & { rpc: typeof rpc };
}

const points = [{ latitude: 48.84, longitude: 2.35 }];

describe("loadActivePedestrianRiskProjection", () => {
  it("assembles more than the API row cap through stable pages", async () => {
    const allRows = Array.from({ length: 1001 }, (_, index) => row(index));
    const supabase = clientForPages([allRows.slice(0, 901), allRows.slice(900)]);

    const projection = await loadActivePedestrianRiskProjection(supabase, points);

    expect(projection?.segments).toHaveLength(1001);
    expect(projection?.counts.projectedSegments).toBe(1001);
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, "get_active_pedestrian_risk_projection_page", expect.objectContaining({ p_offset: 900 }));
  });

  it("fails closed when a page changes projection or graph identity", async () => {
    const firstPage = Array.from({ length: 901 }, (_, index) => row(index));
    const changed = row(900, { network_version_id: "network-v2" });
    const supabase = clientForPages([firstPage, [changed]]);

    await expect(loadActivePedestrianRiskProjection(supabase, points)).resolves.toBeNull();
  });

  it("fails closed when a republication changes only the publication revision", async () => {
    const firstPage = Array.from({ length: 901 }, (_, index) => row(index));
    const changed = row(900, { publication_revision: 2 });
    const supabase = clientForPages([firstPage, [changed]]);

    await expect(loadActivePedestrianRiskProjection(supabase, points)).resolves.toBeNull();
  });

  it("fails closed when the publication revision is absent", async () => {
    const supabase = clientForPages([[row(0, { publication_revision: undefined })]]);

    await expect(loadActivePedestrianRiskProjection(supabase, points)).resolves.toBeNull();
  });

  it("fails closed on an interrupted page and does not accept a partial projection", async () => {
    const firstPage = Array.from({ length: 901 }, (_, index) => row(index));
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("temporary failure") });
    const supabase = { rpc } as never as Parameters<typeof loadActivePedestrianRiskProjection>[0];

    await expect(loadActivePedestrianRiskProjection(supabase, points)).resolves.toBeNull();
  });

  it("fails closed when a continuation page disappears after a full first page", async () => {
    const firstPage = Array.from({ length: 901 }, (_, index) => row(index));
    const supabase = clientForPages([firstPage, []]);

    await expect(loadActivePedestrianRiskProjection(supabase, points)).resolves.toBeNull();
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
  });

  it("keeps unavailable segments and uses persisted generation time", async () => {
    const unavailable = row(0, {
      zone_id: null,
      intersected_zone_ids: [],
      risk_status: "unavailable",
      waste_risk: null,
      cigarette_butt_risk: null,
      mixed_risk: null,
    });
    const supabase = clientForPages([[unavailable]]);

    const projection = await loadActivePedestrianRiskProjection(supabase, points);

    expect(projection?.generatedAt).toBe("2026-11-04T09:00:00.000Z");
    expect(projection?.sourceVersions.pressureGeneratedAt).toBe("2026-11-04T07:00:00.000Z");
    expect(projection?.segments[0]?.riskStatus).toBe("unavailable");
    expect(projection?.segments[0]?.wasteRisk).toBeNull();
  });

  it("returns no snapshot when the first page is empty or has no exact graph", async () => {
    await expect(loadActivePedestrianRiskProjection(clientForPages([[]]), points)).resolves.toBeNull();
    await expect(loadActivePedestrianRiskProjection(clientForPages([[row(0, { network_version_id: null })]]), points)).resolves.toBeNull();
  });
});
