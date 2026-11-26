import { describe, expect, it } from "vitest";
import { PARIS_PUBLIC_CLEANLINESS_DATASET } from "@/lib/partners/public-cleanliness-organization";
import { getOrgChartFitScale, layoutPublicCleanlinessForest, ORG_NODE_HEIGHT, ORG_NODE_WIDTH } from "./public-cleanliness-org-chart.model";

describe("institutional forest layout", () => {
  const { nodes, relations } = PARIS_PUBLIC_CLEANLINESS_DATASET;
  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const edge of relations.filter(edge => edge.kind === "hierarchy")) {
    children.set(edge.from, [...(children.get(edge.from) ?? []), edge.to]);
    hasParent.add(edge.to);
  }
  const roots = nodes.filter(node => !hasParent.has(node.id));
  const included = new Set(nodes.map(node => node.id));
  it("lays out every documented entity, including detached roots, without overlapping cards", () => {
    const result = layoutPublicCleanlinessForest(roots, children, included, {}, false);
    expect([...result.positions.keys()].sort()).toEqual([...included].sort());
    const positions = [...result.positions.values()];
    for (const [i, a] of positions.entries()) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x + ORG_NODE_WIDTH).toBeLessThanOrEqual(result.width);
      expect(a.y + ORG_NODE_HEIGHT).toBeLessThanOrEqual(result.height);
      for (const b of positions.slice(i + 1)) {
        expect(Math.abs(a.x - b.x) >= ORG_NODE_WIDTH || Math.abs(a.y - b.y) >= ORG_NODE_HEIGHT).toBe(true);
      }
    }
    const scale = getOrgChartFitScale(700, 450, result.width, result.height);
    expect(result.width * scale).toBeLessThanOrEqual(700.000001);
    expect(result.height * scale).toBeLessThanOrEqual(450.000001);
  });
  it("collapses descendants without losing detached nodes and restores matches during search", () => {
    const collapsed = layoutPublicCleanlinessForest(roots, children, included, { dpe: true }, false);
    const expanded = layoutPublicCleanlinessForest(roots, children, included, { dpe: true }, true);
    expect(collapsed.positions.has("dpe")).toBe(true);
    expect(collapsed.positions.has("stpp")).toBe(false);
    expect(expanded.positions.has("stpp")).toBe(true);
    expect(expanded.positions.size).toBe(nodes.length);
  });
});
