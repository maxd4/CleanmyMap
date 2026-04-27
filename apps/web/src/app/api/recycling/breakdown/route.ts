import { NextResponse } from"next/server";
import { fetchUnifiedActionContracts } from"@/lib/actions/unified-source";
import { requireAuthenticatedAccess } from"@/lib/authz";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import { getSupabaseServerClient } from"@/lib/supabase/server";

export const runtime ="nodejs";

type WasteCategory ="megots" |"plastique" |"verre" |"metal" |"mixte";

export async function GET() {
 const access = await requireAuthenticatedAccess();
 if (!access.ok) {
 return unauthorizedJsonResponse();
 }

 try {
 const supabase = getSupabaseServerClient();
 const { items: contracts } = await fetchUnifiedActionContracts(supabase, {
 limit: 2000,
 status:"approved",
 floorDate: null,
 requireCoordinates: false,
 types: ["action","clean_place","spot"],
 });

 const categories: Record<WasteCategory, { kg: number; entries: number }> = {
 megots: { kg: 0, entries: 0 },
 plastique: { kg: 0, entries: 0 },
 verre: { kg: 0, entries: 0 },
 metal: { kg: 0, entries: 0 },
 mixte: { kg: 0, entries: 0 },
 };

 let triQualityHigh = 0;
 let triQualityMedium = 0;
 let triQualityLow = 0;

 for (const contract of contracts) {
 const breakdown = contract.metadata.wasteBreakdown;
 if (!breakdown) {
 categories.mixte.kg += Number(contract.metadata.wasteKg || 0);
 categories.mixte.entries += 1;
 continue;
 }
 const add = (category: WasteCategory, value: number | undefined) => {
 const kg = Number(value ?? 0);
 if (kg <= 0) {
 return;
 }
 categories[category].kg += kg;
 categories[category].entries += 1;
 };
 add("megots", breakdown.megotsKg);
 add("plastique", breakdown.plastiqueKg);
 add("verre", breakdown.verreKg);
 add("metal", breakdown.metalKg);
 add("mixte", breakdown.mixteKg);

 if (breakdown.triQuality ==="elevee") triQualityHigh += 1;
 else if (breakdown.triQuality ==="moyenne") triQualityMedium += 1;
 else if (breakdown.triQuality ==="faible") triQualityLow += 1;
 }

 const totalKg =
 Object.values(categories).reduce((acc, entry) => acc + entry.kg, 0) || 0;
 const lines = (
 Object.entries(categories) as Array<
 [WasteCategory, { kg: number; entries: number }]
 >
 ).map(([category, entry]) => ({
 category,
 kg: Number(entry.kg.toFixed(2)),
 sharePercent:
 totalKg > 0 ? Number(((entry.kg / totalKg) * 100).toFixed(1)) : 0,
 entries: entry.entries,
 }));

 return NextResponse.json({
 status:"ok",
 totalKg: Number(totalKg.toFixed(2)),
 lines,
 triQuality: {
 elevee: triQualityHigh,
 moyenne: triQualityMedium,
 faible: triQualityLow,
 },
 generatedAt: new Date().toISOString(),
 });
 } catch (error) {
 const message = error instanceof Error ? error.message :"Unknown error";
 return NextResponse.json({ error: message }, { status: 500 });
 }
}
