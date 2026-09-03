export const ACTIVITY_STATUSES = ["active", "inactive"] as const;

export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export function readActivityStatus(metadata: unknown): ActivityStatus {
  if (!metadata || typeof metadata !== "object") {
    return "active";
  }

  return (metadata as Record<string, unknown>)["activity_status"] === "inactive"
    ? "inactive"
    : "active";
}

export function toggleActivityStatus(status: ActivityStatus): ActivityStatus {
  return status === "active" ? "inactive" : "active";
}
