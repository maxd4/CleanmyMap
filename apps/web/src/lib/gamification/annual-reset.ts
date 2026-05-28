import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateActionQualityScore, toFloat, toInt } from "./progression-utils";
import type { ActionRow } from "./progression-types";
import { isSpontaneousActionNotes } from "./progression-data";

export function getCurrentYearStartDate(): string {
  const year = new Date().getFullYear();
  return `${year}-01-01T00:00:00.000Z`;
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
      totalButts: number;
    }
  >
> {
  const startDate = getCurrentYearStartDate();

  // Fetch only approved actions from this year
  const result = await supabase
    .from("actions")
    .select(
      "id, created_at, created_by_clerk_id, actor_name, action_date, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, status, notes, manual_drawing",
    )
    .eq("status", "approved")
    .gte("action_date", startDate.slice(0, 10)) // Using YYYY-MM-DD
    .limit(10000);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const grouped = new Map<
    string,
    {
      qualitySum: number;
      validatedActions: number;
      wasteKg: number;
      totalButts: number;
    }
  >();

  for (const row of (result.data ?? []) as ActionRow[]) {
    if (!isSpontaneousActionNotes(row.notes)) {
      continue;
    }
    const quality = evaluateActionQualityScore(row).score;
    const previous = grouped.get(row.created_by_clerk_id) ?? {
      qualitySum: 0,
      validatedActions: 0,
      wasteKg: 0,
      totalButts: 0,
    };
    previous.qualitySum += quality;
    previous.validatedActions += 1;
    previous.wasteKg += toFloat(row.waste_kg, 0);
    previous.totalButts += toInt(row.cigarette_butts, 0);
    grouped.set(row.created_by_clerk_id, previous);
  }

  const output = new Map<
    string,
    {
      qualityAverage: number;
      validatedActions: number;
      wasteKg: number;
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
      totalButts: value.totalButts,
    });
  }

  return output;
}

export async function getUserAnnualImpact(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ wasteKg: number; validatedActions: number }> {
  const startDate = getCurrentYearStartDate();
  
  const result = await supabase
    .from("actions")
    .select("waste_kg, status, notes")
    .eq("created_by_clerk_id", userId)
    .eq("status", "approved")
    .gte("action_date", startDate.slice(0, 10));

  if (result.error) {
    throw new Error(result.error.message);
  }

  let wasteKg = 0;
  let validatedActions = 0;

  for (const row of result.data ?? []) {
    if (!isSpontaneousActionNotes((row as { notes?: string | null }).notes ?? null)) {
      continue;
    }
    wasteKg += toFloat(row.waste_kg, 0);
    validatedActions += 1;
  }

  return { wasteKg, validatedActions };
}

export function getCurrentMonthlyMilestone(currentKg: number): {
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
    isCompleted: currentKg >= targetKg,
  };
}
