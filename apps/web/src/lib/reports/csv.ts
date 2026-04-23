import type { ActionListItem, ActionStatus } from "@/lib/actions/types";
import { buildDeliverableFilename } from "./deliverable-name";
import type { ReportScope, ReportScopeKind } from "./scope";

export type ActionCsvRow = Pick<
  ActionListItem,
  | "id"
  | "created_at"
  | "action_date"
  | "actor_name"
  | "association_name"
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
  scopeKind: ReportScopeKind;
  scopeValue: string | null;
  association: string | null;
};

function parseAssociationParam(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  const value = raw.trim();
  if (!value) {
    return null;
  }
  return value.slice(0, 120);
}

export function parseStatusParam(raw: string | null): ActionStatus | null {
  if (raw === "pending" || raw === "approved" || raw === "rejected") {
    return raw;
  }
  return null;
}

export function parseReportScopeKindParam(
  raw: string | null,
): ReportScopeKind | null {
  if (raw === "global" || raw === "account" || raw === "association" || raw === "arrondissement") {
    return raw;
  }
  return null;
}

export function parseReportScopeValueParam(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  const value = raw.trim();
  return value.length > 0 ? value.slice(0, 120) : null;
}

export function resolveReportScopeFromQuery(url: URL): ReportScope {
  const scopeKind = (
    parseReportScopeKindParam(url.searchParams.get("scopeKind")) ??
    parseReportScopeKindParam(url.searchParams.get("scope")) ??
    (url.searchParams.get("arrondissement") ? "arrondissement" : null) ??
    (url.searchParams.get("account") ? "account" : null) ??
    (url.searchParams.get("association") ? "association" : null) ??
    "global"
  ) as ReportScopeKind;

  const scopeValue =
    parseReportScopeValueParam(url.searchParams.get("scopeValue")) ??
    parseReportScopeValueParam(url.searchParams.get(scopeKind)) ??
    parseReportScopeValueParam(url.searchParams.get("association")) ??
    null;

  return scopeKind === "global"
    ? { kind: "global", value: null }
    : { kind: scopeKind, value: scopeValue };
}

export function parsePositiveInteger(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
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
  const scope = resolveReportScopeFromQuery(url);
  return {
    status: parseStatusParam(url.searchParams.get("status")),
    limit: parsePositiveInteger(url.searchParams.get("limit"), 1, 1000, 250),
    days: parsePositiveInteger(url.searchParams.get("days"), 1, 3650, 90),
    scopeKind: scope.kind,
    scopeValue: scope.value,
    association: parseAssociationParam(url.searchParams.get("association")),
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
  return `"${raw.replace(/"/g, '""')}"`;
}

export function buildActionsCsv(rows: ActionCsvRowWithDrawing[]): string {
  const header = [
    "id",
    "created_at",
    "action_date",
    "actor_name",
    "association_name",
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
        row.association_name ?? null,
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
  return buildDeliverableFilename({
    rubrique: "export_actions",
    extension: "csv",
    date: now,
  });
}
