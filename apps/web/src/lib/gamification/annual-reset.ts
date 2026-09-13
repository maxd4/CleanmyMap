import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateActionQualityScore, toFloat, toInt } from "./progression-utils";
import type { ActionRow } from "./progression-types";
import { isSpontaneousActionNotes } from "./progression-data";
import { getTimeScopeFloorDate } from "@/lib/time-scopes";
import { runActionQuery } from "@/lib/actions/query";

export function getCurrentYearStartDate(): string {
  return getTimeScopeFloorDate("yearToDate") ?? new Date().toISOString().slice(0, 10);
}

export function getYearToDateStartDate(): string {
  return getCurrentYearStartDate();
}

export async function loadUserAnnualImpactStats(
  supabase: SupabaseClient,
): Promise<
  Map<
    string,
    {
      qualityAverage: number;
      validatedActions: number;
      wasteKg: number;
      wasteCoverageRate: number;
      totalButts: number;
    }
  >
> {
  const startDate = getYearToDateStartDate();

  // Fetch only approved actions from this year
  const result = await runActionQuery<ActionRow>(supabase, (query) =>
    query
      .select(
        "id, created_at, created_by_clerk_id, actor_name, action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, status, notes",
      )
      .eq("status", "approved")
      .gte("action_date", startDate)
      .limit(10000),
  );

  const grouped = new Map<
    string,
    {
      qualitySum: number;
      validatedActions: number;
      wasteKg: number;
      wasteKnownActions: number;
      totalButts: number;
    }
  >();

  for (const row of result) {
    if (!isSpontaneousActionNotes(row.notes)) {
      continue;
    }
    const quality = evaluateActionQualityScore(row).score;
    const previous = grouped.get(row.created_by_clerk_id) ?? {
      qualitySum: 0,
      validatedActions: 0,
      wasteKg: 0,
      wasteKnownActions: 0,
      totalButts: 0,
    };
    previous.qualitySum += quality;
    previous.validatedActions += 1;
    if (row.waste_kg !== null && Number.isFinite(Number(row.waste_kg)) && Number(row.waste_kg) >= 0) {
      previous.wasteKg += toFloat(row.waste_kg, 0);
      previous.wasteKnownActions += 1;
    }
    previous.totalButts += toInt(row.cigarette_butts, 0);
    grouped.set(row.created_by_clerk_id, previous);
  }

  const output = new Map<
    string,
    {
      qualityAverage: number;
      validatedActions: number;
      wasteKg: number;
      wasteCoverageRate: number;
      totalButts: number;
    }
  >();

  for (const [userId, value] of grouped.entries()) {
    output.set(userId, {
      qualityAverage:
        value.validatedActions > 0
          ? Math.round((value.qualitySum / value.validatedActions) * 10) / 10
          : 0,
      validatedActions: value.validatedActions,
      wasteKg: Math.round(value.wasteKg * 10) / 10,
      wasteCoverageRate:
        value.validatedActions > 0
          ? (value.wasteKnownActions / value.validatedActions) * 100
          : 0,
      totalButts: value.totalButts,
    });
  }

  return output;
}

export async function getUserAnnualImpact(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  wasteKg: number;
  validatedActions: number;
  wasteKnownActions: number;
  wasteCoverageRate: number;
}> {
  const startDate = getYearToDateStartDate();
  
  const result = await runActionQuery<Pick<ActionRow, "waste_kg" | "status" | "notes">>(supabase, (query) =>
    query
      .select("waste_kg, status, notes")
      .eq("created_by_clerk_id", userId)
      .eq("status", "approved")
      .gte("action_date", startDate),
  );

  let wasteKg = 0;
  let validatedActions = 0;
  let wasteKnownActions = 0;

  for (const row of result) {
    if (!isSpontaneousActionNotes((row as { notes?: string | null }).notes ?? null)) {
      continue;
    }
    validatedActions += 1;
    if (row.waste_kg !== null && Number.isFinite(Number(row.waste_kg)) && Number(row.waste_kg) >= 0) {
      wasteKg += toFloat(row.waste_kg, 0);
      wasteKnownActions += 1;
    }
  }

  return {
    wasteKg,
    validatedActions,
    wasteKnownActions,
    wasteCoverageRate:
      validatedActions > 0 ? (wasteKnownActions / validatedActions) * 100 : 0,
  };
}

export function getCurrentMonthlyMilestone(currentKg: number, wasteCoverageRate?: number): {
  id: string;
  month: number;
  year: number;
  description: string;
  targetKg: number;
  currentKg: number;
  isCompleted: boolean;
} {
  const date = new Date();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  // Example of a simple short-term goal : Collect 10kg per month
  const targetKg = 10;
  
  return {
    id: `milestone-${year}-${month}`,
    month,
    year,
    description: `Objectif du mois : Collecter ${targetKg}kg de déchets !`,
    targetKg,
    currentKg: Math.round(currentKg * 10) / 10,
    isCompleted:
      (wasteCoverageRate === undefined || wasteCoverageRate >= 100) &&
      currentKg >= targetKg,
  };
}
