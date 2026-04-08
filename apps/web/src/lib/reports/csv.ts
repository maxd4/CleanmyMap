import type { ActionListItem, ActionStatus } from "@/lib/actions/types";

export type ActionCsvRow = Pick<
  ActionListItem,
  | "id"
  | "created_at"
  | "action_date"
  | "actor_name"
  | "location_label"
  | "latitude"
  | "longitude"
  | "waste_kg"
  | "cigarette_butts"
  | "volunteers_count"
  | "duration_minutes"
  | "status"
  | "notes"
>;
export type ActionCsvRowWithDrawing = ActionCsvRow & {
  notes_plain?: string | null;
  record_type?: "action" | "clean_place" | "spot" | "other" | null;
  source?: string | null;
  observed_at?: string | null;
  geometry_kind?: "point" | "polyline" | "polygon" | null;
  geometry_geojson?: string | null;
  manual_drawing_kind?: "polyline" | "polygon" | null;
  manual_drawing_points?: number | null;
  manual_drawing_coordinates_json?: string | null;
  manual_drawing_geojson?: string | null;
};

export type ReportQuery = {
  status: ActionStatus | null;
  limit: number;
  days: number;
};

export function parseStatusParam(raw: string | null): ActionStatus | null {
  if (raw === "pending" || raw === "approved" || raw === "rejected") {
    return raw;
  }
  return null;
}

export function parsePositiveInteger(raw: string | null, min: number, max: number, fallback: number): number {
  if (raw === null || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export function resolveReportQuery(url: URL): ReportQuery {
  return {
    status: parseStatusParam(url.searchParams.get("status")),
    limit: parsePositiveInteger(url.searchParams.get("limit"), 1, 1000, 250),
    days: parsePositiveInteger(url.searchParams.get("days"), 1, 3650, 90),
  };
}

export function buildDateFloor(daysWindow: number): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  now.setUTCDate(now.getUTCDate() - (daysWindow - 1));
  return now.toISOString().slice(0, 10);
}

function escapeCsvCell(value: string | number | null): string {
  const raw = value === null ? "" : String(value);
  if (!/[",\r\n]/.test(raw)) {
    return raw;
  }
  return `"${raw.replace(/"/g, "\"\"")}"`;
}

export function buildActionsCsv(rows: ActionCsvRowWithDrawing[]): string {
  const header = [
    "id",
    "created_at",
    "action_date",
    "actor_name",
    "location_label",
    "latitude",
    "longitude",
    "waste_kg",
    "cigarette_butts",
    "volunteers_count",
    "duration_minutes",
    "status",
    "notes",
    "notes_plain",
    "record_type",
    "source",
    "observed_at",
    "geometry_kind",
    "geometry_geojson",
    "manual_drawing_kind",
    "manual_drawing_points",
    "manual_drawing_coordinates_json",
    "manual_drawing_geojson",
  ];

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.created_at,
        row.action_date,
        row.actor_name,
        row.location_label,
        row.latitude,
        row.longitude,
        row.waste_kg,
        row.cigarette_butts,
        row.volunteers_count,
        row.duration_minutes,
        row.status,
        row.notes,
        row.notes_plain ?? null,
        row.record_type ?? null,
        row.source ?? null,
        row.observed_at ?? null,
        row.geometry_kind ?? null,
        row.geometry_geojson ?? null,
        row.manual_drawing_kind ?? null,
        row.manual_drawing_points ?? null,
        row.manual_drawing_coordinates_json ?? null,
        row.manual_drawing_geojson ?? null,
      ]
        .map((cell) => escapeCsvCell(cell as string | number | null))
        .join(","),
    );
  }
  return lines.join("\n");
}

export function buildActionsCsvFilename(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `cleanmymap_actions_${y}-${m}-${d}.csv`;
}
