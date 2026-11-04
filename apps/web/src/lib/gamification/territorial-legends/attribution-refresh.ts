import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveActionTerritory, type ResolvedActionTerritory } from "@/lib/geo/action-territory-resolver";
import { campaignStartDate, campaignYearForCivilDate } from "./campaign";
import { buildTerritorialLegendAttribution } from "./attribution";
import { loadTerritorialLegendPages } from "./pagination";
import { TERRITORIAL_LEGEND_WINDOW_DAYS } from "./engine";

type CandidateRow = {
  id: string;
  updated_at: string;
  action_date: string;
  latitude: number | null;
  longitude: number | null;
  derived_geometry_kind: "point" | "polyline" | "polygon" | "multiline" | null;
  derived_geometry_geojson: string | null;
  department_code: string | null;
  department_name: string | null;
};

function parisDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function windowStart(now: Date): string {
  const current = parisDate(now);
  const [year, month, day] = current.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 12));
  start.setUTCDate(start.getUTCDate() - (TERRITORIAL_LEGEND_WINDOW_DAYS - 1));
  const campaignStart = new Date(`${campaignStartDate(campaignYearForCivilDate(current))}T12:00:00Z`);
  return parisDate(start < campaignStart ? campaignStart : start);
}

function resolvedAttribution(row: CandidateRow, resolved: ResolvedActionTerritory | null) {
  return buildTerritorialLegendAttribution({
    actionId: row.id,
    actionDate: row.action_date,
    resolved,
  });
}

export type TerritorialLegendAttributionRefreshResult = {
  refreshed: number;
  unverifiable: number;
};

/**
 * Controlled lifecycle/reconciliation path. Reads never call a geo provider;
 * only actions lacking a server-owned projection are considered here.
 */
export async function refreshMissingTerritorialLegendAttributions(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<TerritorialLegendAttributionRefreshResult> {
  const rows = await loadTerritorialLegendPages({
    resource: "territorial_legend_attribution_candidates",
    loadPage: async (from, to) => {
      const result = await supabase
        .from("actions")
        .select("id, updated_at, action_date, latitude, longitude, derived_geometry_kind, derived_geometry_geojson, department_code, department_name")
        .eq("status", "approved")
        .eq("action_phase", "post_action_complete")
        .not("published_at", "is", null)
        .eq("moderation_visibility", "visible")
        .eq("access_mode", "public")
        .or("review_state.is.null,review_state.in.(not_required,approved)")
        .gte("action_date", windowStart(now))
        .lte("action_date", parisDate(now))
        .is("territorial_legend_attribution", null)
        .order("id", { ascending: true })
        .range(from, to);
      return {
        data: Array.isArray(result.data) ? result.data as CandidateRow[] : result.data,
        error: result.error,
      };
    },
  });

  let refreshed = 0;
  let unverifiable = 0;
  for (const row of rows) {
    const resolved = await resolveActionTerritory({
      latitude: row.latitude,
      longitude: row.longitude,
      geometry: { kind: row.derived_geometry_kind, geojson: row.derived_geometry_geojson },
      departmentCode: row.department_code,
      departmentName: row.department_name,
    });
    const attribution = resolvedAttribution(row, resolved);
    if (!attribution) {
      unverifiable += 1;
      continue;
    }
    const result = await supabase
      .from("actions")
      .update({ territorial_legend_attribution: attribution })
      .eq("id", row.id)
      .eq("updated_at", row.updated_at)
      .is("territorial_legend_attribution", null)
      .select("id");
    if (result.error) throw result.error;
    if (Array.isArray(result.data) && result.data.length === 0) continue;
    refreshed += 1;
  }
  return { refreshed, unverifiable };
}
