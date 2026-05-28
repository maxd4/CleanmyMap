import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getInfiniteBadgeTotals(userId: string): Promise<{
  wasteKg: number;
  butts: number;
  newPlaces: number;
}> {
  const supabase = getSupabaseServerClient(true);

  const row = await supabase
    .from("user_badge_totals")
    .select("waste_kg, butts, places_count")
    .eq("user_id", userId)
    .maybeSingle();

  if (row.error) throw row.error;
  if (!row.data) return { wasteKg: 0, butts: 0, newPlaces: 0 };

  return {
    wasteKg: Number(row.data.waste_kg ?? 0),
    butts: Number(row.data.butts ?? 0),
    newPlaces: Number(row.data.places_count ?? 0),
  };
}

