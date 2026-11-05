import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { loadActivePedestrianNetwork } from "./pedestrian-network-store";

function row(index: number, version = "network-v1") {
  return {
    network_version_id: version,
    network_key: "paris-pilot",
    source_retrieved_at: "2026-11-04T00:00:00.000Z",
    bounds: { type: "Polygon", coordinates: [[[2.3, 48.8], [2.4, 48.8], [2.4, 48.9], [2.3, 48.9], [2.3, 48.8]]] },
    edge_key: `edge-${String(index).padStart(5, "0")}`,
    from_node_id: index,
    to_node_id: index + 1,
    length_m: 10,
    name: null,
    highway: "footway",
    osm_way_id: index,
    segment_index: 0,
    direction: "forward" as const,
    pedestrian_access_status: "allowed" as const,
    geometry_geojson: { type: "LineString", coordinates: [[2.3 + index / 100000, 48.85], [2.30001 + index / 100000, 48.85]] },
    tags: { highway: "footway" },
  };
}

type TestClient = { rpc: ReturnType<typeof vi.fn> };

function client(rows: ReturnType<typeof row>[], mutatePage?: (page: typeof rows) => typeof rows): TestClient {
  const rpc = vi.fn(async (_name: string, args: { p_offset: number; p_limit: number }) => ({
      data: mutatePage && args.p_offset > 0
        ? mutatePage(rows.slice(args.p_offset, args.p_offset + args.p_limit + 1))
        : rows.slice(args.p_offset, args.p_offset + args.p_limit + 1),
      error: null,
    }));
  return { rpc };
}

describe("loadActivePedestrianNetwork", () => {
  it("loads more than 1000 edges through bounded pages", async () => {
    const rows = Array.from({ length: 1001 }, (_, index) => row(index));
    const supabase = client(rows);
    const graph = await loadActivePedestrianNetwork(supabase as never, [{ latitude: 48.85, longitude: 2.35 }]);

    expect(graph?.edges).toHaveLength(1001);
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, "get_active_pedestrian_network_page", expect.objectContaining({ p_limit: 900, p_offset: 0 }));
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, "get_active_pedestrian_network_page", expect.objectContaining({ p_limit: 900, p_offset: 900 }));
  });

  it("rejects a network whose version changes between pages", async () => {
    const rows = Array.from({ length: 901 }, (_, index) => row(index));
    const supabase = client(rows, (page) => page.map((item) => ({ ...item, network_version_id: "network-v2" })));

    await expect(loadActivePedestrianNetwork(supabase as never, [{ latitude: 48.85, longitude: 2.35 }])).resolves.toBeNull();
  });

  it("rejects malformed rows instead of silently accepting a partial graph", async () => {
    const malformed = row(0);
    malformed.geometry_geojson = { type: "LineString", coordinates: [[2.3, 48.85]] };
    const supabase = client([malformed]);

    await expect(loadActivePedestrianNetwork(supabase as never, [{ latitude: 48.85, longitude: 2.35 }])).resolves.toBeNull();
  });
});
