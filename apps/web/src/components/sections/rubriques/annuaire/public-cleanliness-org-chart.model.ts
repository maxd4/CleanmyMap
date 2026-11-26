import type { PublicCleanlinessOrganizationNode } from "@/lib/partners/public-cleanliness-organization";

export const ORG_NODE_WIDTH = 220;
export const ORG_NODE_HEIGHT = 104;
const X_GAP = 24;
const Y_GAP = 48;
const MARGIN = 24;

export type OrgChartPosition = { id: string; x: number; y: number };
export type OrgChartLayout = { positions: Map<string, OrgChartPosition>; width: number; height: number };

/** Deterministic forest layout. Only the supplied hierarchy establishes ancestry. */
export function layoutPublicCleanlinessForest(
  roots: readonly PublicCleanlinessOrganizationNode[],
  childrenById: ReadonlyMap<string, readonly string[]>,
  includedIds: ReadonlySet<string>,
  collapsed: Readonly<Record<string, boolean>>,
  isSearching: boolean,
): OrgChartLayout {
  const positions = new Map<string, OrgChartPosition>();
  const active = new Set<string>();
  const children = (id: string) => !isSearching && collapsed[id]
    ? []
    : (childrenById.get(id) ?? []).filter(child => includedIds.has(child));
  let cursor = MARGIN;
  let maxY = MARGIN;
  const place = (id: string, depth: number): number | null => {
    if (active.has(id) || positions.has(id) || !includedIds.has(id)) return null;
    active.add(id);
    const childCenters = children(id).map(child => place(child, depth + 1)).filter((x): x is number => x !== null);
    const x = childCenters.length
      ? (childCenters[0] + childCenters[childCenters.length - 1]) / 2
      : cursor + ORG_NODE_WIDTH / 2;
    if (!childCenters.length) cursor += ORG_NODE_WIDTH + X_GAP;
    const y = MARGIN + depth * (ORG_NODE_HEIGHT + Y_GAP);
    positions.set(id, { id, x: x - ORG_NODE_WIDTH / 2, y });
    maxY = Math.max(maxY, y + ORG_NODE_HEIGHT);
    active.delete(id);
    return x;
  };
  // A separate grid retains independent roots without pretending they are subordinates.
  const detached = roots.filter(root => !children(root.id).length);
  for (const root of roots) {
    if (!detached.includes(root)) place(root.id, 0);
  }
  const columns = Math.max(1, Math.min(10, Math.ceil(Math.sqrt(detached.length))));
  const detachedTop = positions.size ? maxY + Y_GAP : MARGIN;
  detached.forEach((root, index) => {
    if (!includedIds.has(root.id) || positions.has(root.id)) return;
    const x = MARGIN + (index % columns) * (ORG_NODE_WIDTH + X_GAP);
    const y = detachedTop + Math.floor(index / columns) * (ORG_NODE_HEIGHT + Y_GAP);
    positions.set(root.id, { id: root.id, x, y });
  });
  let width = MARGIN * 2, height = MARGIN * 2;
  for (const position of positions.values()) {
    width = Math.max(width, position.x + ORG_NODE_WIDTH + MARGIN);
    height = Math.max(height, position.y + ORG_NODE_HEIGHT + MARGIN);
  }
  return { positions, width, height };
}

export function getOrgChartFitScale(
  viewportWidth: number, viewportHeight: number, width: number, height: number,
): number {
  if (viewportWidth <= 0 || viewportHeight <= 0 || width <= 0 || height <= 0) return 1;
  return Math.min(1, viewportWidth / width, viewportHeight / height);
}
