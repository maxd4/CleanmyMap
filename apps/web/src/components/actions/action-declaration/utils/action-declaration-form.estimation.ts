import { resolvePlaceTypeCategory } from "@/lib/actions/place-type-options";
import { toRequiredNumber } from"../model";

type EstimateWasteInput = {
 volunteersCount: string;
 durationMinutes: string;
 placeType: string;
};

const PLACE_TYPE_MULTIPLIER: Record<string, number> = {
urban_streets: 1.1,
parks_gardens: 1.3,
forests_countryside: 1.3,
rivers_lakes: 1.15,
coast_beaches: 1.15,
stations_covered_spaces: 1.25,
parking_activity_zones: 1.1,
roadside_areas: 1.15,
other: 1,
"N° Rue/Allée/Villa/Ruelle/Impasse": 1.05,
"Bois/Parc/Jardin/Square/Sentier": 1.3,
"Quai/Pont/Port": 1.15,
"N° Boulevard/Avenue/Place": 1.1,
"Gare/Station/Portique": 1.25,
"Galerie/Passage couvert": 0.95,
 Monument: 0.9,
};

function clamp(value: number, min: number, max: number): number {
 return Math.min(max, Math.max(min, value));
}

export function estimateWasteKg(input: EstimateWasteInput): number {
 const volunteers = clamp(
 Math.trunc(toRequiredNumber(input.volunteersCount, 1)),
 1,
 200,
 );
 const durationMinutes = clamp(toRequiredNumber(input.durationMinutes, 45), 5, 360);
 const durationHours = durationMinutes / 60;
 const placeFactor = PLACE_TYPE_MULTIPLIER[input.placeType] ?? PLACE_TYPE_MULTIPLIER[resolvePlaceTypeCategory(input.placeType) ?? ""] ?? 1;
 const baseKg = volunteers * durationHours * 1.2 * placeFactor;
 return Number(clamp(baseKg, 0.1, 1000).toFixed(1));
}
