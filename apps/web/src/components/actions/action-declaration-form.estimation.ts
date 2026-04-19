import { toRequiredNumber } from "./action-declaration-form.model";

type EstimateWasteInput = {
  volunteersCount: string;
  durationMinutes: string;
  placeType: string;
  wasteMegotsKg: string;
};

const PLACE_TYPE_MULTIPLIER: Record<string, number> = {
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
  const placeFactor = PLACE_TYPE_MULTIPLIER[input.placeType] ?? 1;
  const megotsKg = clamp(toRequiredNumber(input.wasteMegotsKg, 0), 0, 100);

  const baseKg = volunteers * durationHours * 1.2 * placeFactor;
  const estimated = baseKg + megotsKg * 0.6;
  return Number(clamp(estimated, 0.1, 1000).toFixed(1));
}
