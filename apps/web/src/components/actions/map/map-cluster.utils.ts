export type ClusterDensityTier = "low" | "medium" | "high" | "dense";

export function resolveClusterRadius(zoom: number): number {
  if (zoom <= 12) {
    return 84;
  }

  if (zoom <= 14) {
    return 66;
  }

  if (zoom <= 16) {
    return 48;
  }

  return 34;
}

export function resolveClusterDensityTier(childCount: number): ClusterDensityTier {
  if (childCount >= 40) {
    return "dense";
  }

  if (childCount >= 20) {
    return "high";
  }

  if (childCount >= 8) {
    return "medium";
  }

  return "low";
}

export function resolveClusterIconSize(childCount: number): number {
  const tier = resolveClusterDensityTier(childCount);

  if (tier === "dense") {
    return 64;
  }

  if (tier === "high") {
    return 56;
  }

  if (tier === "medium") {
    return 48;
  }

  return 42;
}

export function formatClusterCount(childCount: number): string {
  if (childCount >= 100) {
    return "99+";
  }

  return `${childCount}`;
}

export function resolveClusterAriaLabel(childCount: number): string {
  const label = childCount > 1 ? "actions regroupées" : "action regroupée";
  return `${childCount} ${label}`;
}
