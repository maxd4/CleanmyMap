type PollutionScoreInputs = {
  wasteKg: number;
  cigaretteButts: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
}

// Calibration metier: contribution normalisee des dechets et megots
// vers un score de pollution sur 100.
const WASTE_REFERENCE_KG = 20;
const BUTTS_REFERENCE_COUNT = 2000;
const WASTE_WEIGHT = 0.65;
const BUTTS_WEIGHT = 0.35;

export function computePollutionScore(inputs: PollutionScoreInputs): number {
  const wasteKg = safeNumber(inputs.wasteKg);
  const cigaretteButts = safeNumber(inputs.cigaretteButts);

  if (wasteKg === 0 && cigaretteButts === 0) {
    return 0;
  }

  const wasteContribution = clamp((wasteKg / WASTE_REFERENCE_KG) * 100, 0, 100);
  const buttsContribution = clamp(
    (cigaretteButts / BUTTS_REFERENCE_COUNT) * 100,
    0,
    100,
  );

  const weightedScore =
    wasteContribution * WASTE_WEIGHT + buttsContribution * BUTTS_WEIGHT;

  return Math.round(clamp(weightedScore, 0, 100));
}
