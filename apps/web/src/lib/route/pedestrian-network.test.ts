import { describe, expect, it } from "vitest";
import {
  buildPedestrianNetwork,
  routeThroughPedestrianNetwork,
  type OsmNodeInput,
  type OsmWayInput,
} from "./pedestrian-network";

const bounds = { south: 48.8, west: 2.3, north: 48.9, east: 2.4 };
const node = (id: string, latitude: number, longitude: number): OsmNodeInput => ({ id, latitude, longitude });
const way = (id: string, tags: Record<string, string>, ...nodes: OsmNodeInput[]): OsmWayInput => ({ id, tags, nodes });

function build(ways: OsmWayInput[]) {
  return buildPedestrianNetwork({
    ways,
    bounds,
    sourceSha256: "a".repeat(64),
    sourceRetrievedAt: "2026-11-04T11:00:00.000Z",
  });
}

describe("pedestrian network importer and graph", () => {
  it("retains directed connections, intersections, lengths, and components", () => {
    const result = build([
      way("10", { highway: "footway", name: "Rue A" }, node("1", 48.84, 2.34), node("2", 48.841, 2.34), node("3", 48.842, 2.34)),
      way("11", { highway: "footway", name: "Rue B" }, node("2", 48.841, 2.34), node("4", 48.841, 2.341)),
    ]);

    expect(result.edges).toHaveLength(6);
    expect(result.connections).toHaveLength(result.edges.length);
    expect(result.edges.every((edge) => edge.lengthM > 0)).toBe(true);
    expect(result.counts.intersectionNodes).toBeGreaterThan(0);
    expect(result.counts.components).toBe(1);
    expect(result.diagnostics.some((entry) => entry.reasonCode === "connected_component")).toBe(true);
    expect(result.edges.find((edge) => edge.edgeKey === "10:0:reverse")?.coordinates).toEqual([
      [48.841, 2.34],
      [48.84, 2.34],
    ]);
  });

  it("does not turn unknown or forbidden access into a safe edge", () => {
    const result = build([
      way("20", { highway: "residential" }, node("20a", 48.84, 2.35), node("20b", 48.841, 2.35)),
      way("21", { highway: "footway", access: "private" }, node("21a", 48.84, 2.36), node("21b", 48.841, 2.36)),
      way("22", { highway: "service", foot: "yes" }, node("22a", 48.84, 2.37), node("22b", 48.841, 2.37)),
    ]);

    expect(result.edges.map((edge) => edge.osmWayId)).toEqual(["22", "22"]);
    expect(result.diagnostics.map((entry) => entry.reasonCode)).toEqual(expect.arrayContaining([
      "access_unknown",
      "access_forbidden",
    ]));
    expect(result.counts.rejectedWays).toBe(2);
  });

  it("respects pedestrian-specific and generic one-way tags", () => {
    const result = build([
      way("30", { highway: "footway", oneway: "yes" }, node("30a", 48.84, 2.34), node("30b", 48.841, 2.34)),
      way("31", { highway: "footway", oneway: "yes", "oneway:foot": "no" }, node("31a", 48.84, 2.35), node("31b", 48.841, 2.35)),
      way("32", { highway: "footway", oneway: "-1" }, node("32a", 48.84, 2.36), node("32b", 48.841, 2.36)),
    ]);

    expect(result.edges.filter((edge) => edge.osmWayId === "30").map((edge) => edge.direction)).toEqual(["forward"]);
    expect(result.edges.filter((edge) => edge.osmWayId === "31")).toHaveLength(2);
    expect(result.edges.filter((edge) => edge.osmWayId === "32").map((edge) => edge.direction)).toEqual(["reverse"]);
  });

  it("routes through the stored directed graph without an OSM/provider call", () => {
    const result = build([
      way("40", { highway: "footway", oneway: "yes" }, node("40a", 48.84, 2.34), node("40b", 48.841, 2.34)),
      way("41", { highway: "footway", oneway: "yes" }, node("40b", 48.841, 2.34), node("40c", 48.842, 2.34)),
    ]);
    const graph = {
      versionId: "pilot-v1",
      networkKey: result.networkKey,
      sourceRetrievedAt: result.sourceRetrievedAt,
      bounds: result.bounds,
      edges: result.edges,
    };

    const forward = routeThroughPedestrianNetwork(graph, [[48.84, 2.34], [48.842, 2.34]], { topology: "open" });
    const reverse = routeThroughPedestrianNetwork(graph, [[48.842, 2.34], [48.84, 2.34]], { topology: "open" });
    expect(forward?.provider).toBe("stored-network");
    expect(forward?.coordinates).toEqual([[48.84, 2.34], [48.841, 2.34], [48.842, 2.34]]);
    expect(reverse).toBeNull();
  });

  it("is deterministic and idempotent for the same source", () => {
    const ways = [way("50", { highway: "footway" }, node("50a", 48.84, 2.34), node("50b", 48.841, 2.34))];
    expect(build(ways)).toEqual(build(ways));
  });
});
