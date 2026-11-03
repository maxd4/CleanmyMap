const ACTION_BASE_SELECT_FIELDS = [
  "id",
  "created_at",
  "updated_at",
  "created_by_clerk_id",
  "actor_name",
  "organizer_type",
  "organizer_id",
  "organizer_name",
  "action_context",
  "action_context_source",
  "school_context_confirmed",
  "school_context_confirmed_at",
  "school_context_confirmed_by_clerk_id",
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
  "children_count",
  "adult_count",
  "retired_count",
  "duration_minutes",
  "event_start_time",
  "event_end_time",
  "notes",
  "status",
  "review_state",
  "review_submitted_at",
  "review_decided_at",
  "review_decided_by_clerk_id",
  "review_reason",
  "review_operation_id",
  "published_at",
  "public_visibility_started_at",
  "results_published_at",
  "access_mode",
  "cancelled_at",
  "cancelled_by_clerk_id",
  "cancellation_reason",
  "cancelled_from_status",
] as const;

const ACTION_MODERATION_SELECT_FIELDS = [
  "moderation_visibility",
  "hidden_at",
  "hidden_by_clerk_id",
  "hidden_reason",
] as const;

const ACTION_SELECT_FIELDS = [
  ...ACTION_BASE_SELECT_FIELDS,
  ...ACTION_MODERATION_SELECT_FIELDS,
] as const;

export const ACTION_SELECT_FIELDS_WITH_PHASE = [
  ...ACTION_SELECT_FIELDS,
  "action_phase",
  "preparation_data",
].join(", ");

const ACTION_SELECT_FIELDS_LEGACY = ACTION_BASE_SELECT_FIELDS
  .filter(
    (field) =>
      field !== "published_at" &&
      field !== "public_visibility_started_at" &&
      field !== "results_published_at" &&
      field !== "cancelled_at" &&
      field !== "cancelled_by_clerk_id" &&
      field !== "cancellation_reason" &&
      field !== "cancelled_from_status" &&
      field !== "children_count" &&
      field !== "adult_count" &&
      field !== "retired_count" &&
      !field.startsWith("action_context") &&
      !field.startsWith("school_context_confirmed"),
  )
  .join(", ");

const ACTION_SELECT_FIELDS_LEGACY_WITHOUT_DEPARTMENT = ACTION_BASE_SELECT_FIELDS
  .filter(
    (field) =>
      field !== "department_code" &&
      field !== "department_name" &&
      field !== "event_start_time" &&
      field !== "event_end_time" &&
      field !== "published_at" &&
      field !== "public_visibility_started_at" &&
      field !== "results_published_at" &&
      field !== "cancelled_at" &&
      field !== "cancelled_by_clerk_id" &&
      field !== "cancellation_reason" &&
      field !== "cancelled_from_status" &&
      field !== "children_count" &&
      field !== "adult_count" &&
      field !== "retired_count" &&
      !field.startsWith("action_context") &&
      !field.startsWith("school_context_confirmed"),
  )
  .join(", ");

export const ACTION_SELECT_FIELDS_LEGACY_WITHOUT_ACCESS_MODE = ACTION_SELECT_FIELDS_LEGACY
  .split(", ")
  .filter((field) => field !== "access_mode")
  .join(", ");

export const ACTION_SELECT_FIELDS_LEGACY_WITHOUT_DEPARTMENT_AND_ACCESS_MODE = ACTION_SELECT_FIELDS_LEGACY_WITHOUT_DEPARTMENT
  .split(", ")
  .filter((field) => field !== "access_mode")
  .join(", ");

const ACTION_COLUMN_MARKERS = [
  "action_phase",
  "access_mode",
  "organizer_id",
  "organizer_name",
  "preparation_data",
  "moderation_visibility",
  "hidden_at",
  "hidden_by_clerk_id",
  "hidden_reason",
  "department_code",
  "department_name",
  "event_start_time",
  "event_end_time",
  "published_at",
  "public_visibility_started_at",
  "results_published_at",
  "cancelled_at",
  "cancelled_by_clerk_id",
  "cancellation_reason",
  "cancelled_from_status",
  "action_context",
  "action_context_source",
  "school_context_confirmed",
  "school_context_confirmed_at",
  "school_context_confirmed_by_clerk_id",
  "children_count",
  "adult_count",
  "retired_count",
] as const;

function getActionColumnErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return "";
}

export function isMissingActionColumnError(error: unknown): boolean {
  const normalized = getActionColumnErrorMessage(error).toLowerCase();
  return normalized.includes("does not exist") && ACTION_COLUMN_MARKERS.some((marker) => normalized.includes(marker));
}
