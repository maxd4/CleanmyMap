import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGraphDocument, parseOsmXml } from "./import-pedestrian-network.mjs";

const xml = `<?xml version="1.0"?>
<osm version="0.6">
  <node id="1" lat="48.8400" lon="2.3400" />
  <node id="2" lat="48.8410" lon="2.3400" />
  <node id="3" lat="48.8420" lon="2.3400" />
  <way id="10"><nd ref="1"/><nd ref="2"/><tag k="highway" v="footway"/><tag k="name" v="Rue &amp; Test"/></way>
  <way id="10"><nd ref="2"/><nd ref="3"/><tag k="highway" v="footway"/></way>
</osm>`;

test("pedestrian network import script parses OSM ways deterministically and decodes XML tags", () => {
    const ways = parseOsmXml(xml);
    assert.equal(ways.length, 1);
    assert.deepEqual(ways[0], {
      id: "10",
      tags: { highway: "footway", name: "Rue & Test" },
      nodes: [
        { id: "1", latitude: 48.84, longitude: 2.34 },
        { id: "2", latitude: 48.841, longitude: 2.34 },
      ],
    });
});

test("pedestrian network import script builds the same document twice for the same normalized source", () => {
    const source = {
      schemaVersion: 1,
      networkKey: "paris-pantheon-jardin-des-plantes",
      importerVersion: "pedestrian-network-v1",
      retrievedAt: "2026-11-04T11:00:00.000Z",
      endpoint: "https://api.openstreetmap.org/api/0.6/map",
      sha256: "b".repeat(64),
      tiles: [],
      bounds: { south: 48.8, west: 2.3, north: 48.9, east: 2.4 },
      ways: parseOsmXml(xml),
    };
    assert.deepEqual(buildGraphDocument(source), buildGraphDocument(source));
});
