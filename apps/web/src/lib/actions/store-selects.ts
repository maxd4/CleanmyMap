export const ACTION_BASE_SELECT_FIELDS = [
  "id",
  "created_at",
  "updated_at",
  "created_by_clerk_id",
  "actor_name",
  "organizer_type",
  "organizer_id",
  "organizer_name",
  "action_date",
  "location_label",
  "department_code",
  "department_name",
  "latitude",
  "longitude",
  "derived_geometry_kind",
  "derived_geometry_geojson",
  "geometry_confidence",
  "geometry_source",
  "waste_kg",
  "cigarette_butts",
  "volunteers_count",
  "duration_minutes",
  "event_start_time",
  "event_end_time",
  "notes",
  "status",
  "published_at",
  "cancelled_at",
  "cancelled_by_clerk_id",
  "cancellation_reason",
  "cancelled_from_status",
] as const;

export const ACTION_MODERATION_SELECT_FIELDS = [
  "moderation_visibility",
  "hidden_at",
  "hidden_by_clerk_id",
  "hidden_reason",
] as const;

export const ACTION_SELECT_FIELDS = [
  ...ACTION_BASE_SELECT_FIELDS,
  ...ACTION_MODERATION_SELECT_FIELDS,
] as const;

export const ACTION_SELECT_FIELDS_WITH_PHASE = [
  ...ACTION_SELECT_FIELDS,
  "action_phase",
  "preparation_data",
].join(", ");

export const ACTION_SELECT_FIELDS_LEGACY = ACTION_BASE_SELECT_FIELDS
  .filter(
    (field) =>
      field !== "published_at" &&
      field !== "cancelled_at" &&
      field !== "cancelled_by_clerk_id" &&
      field !== "cancellation_reason" &&
      field !== "cancelled_from_status",
  )
  .join(", ");

export const ACTION_SELECT_FIELDS_LEGACY_WITHOUT_DEPARTMENT = ACTION_BASE_SELECT_FIELDS
  .filter(
    (field) =>
      field !== "department_code" &&
      field !== "department_name" &&
      field !== "event_start_time" &&
      field !== "event_end_time" &&
      field !== "published_at" &&
      field !== "cancelled_at" &&
      field !== "cancelled_by_clerk_id" &&
      field !== "cancellation_reason" &&
      field !== "cancelled_from_status",
  )
  .join(", ");

export function isMissingActionColumnError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";
  const normalized = message.toLowerCase();

  return (
      normalized.includes("does not exist") &&
    (normalized.includes("action_phase") ||
      normalized.includes("organizer_id") ||
      normalized.includes("organizer_name") ||
      normalized.includes("preparation_data") ||
      normalized.includes("moderation_visibility") ||
      normalized.includes("hidden_at") ||
      normalized.includes("hidden_by_clerk_id") ||
      normalized.includes("hidden_reason") ||
      normalized.includes("department_code") ||
      normalized.includes("department_name") ||
      normalized.includes("event_start_time") ||
      normalized.includes("event_end_time") ||
      normalized.includes("published_at") ||
      normalized.includes("cancelled_at") ||
      normalized.includes("cancelled_by_clerk_id") ||
      normalized.includes("cancellation_reason") ||
      normalized.includes("cancelled_from_status"))
  );
}
