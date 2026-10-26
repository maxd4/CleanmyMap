import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";

export type PostActionImpactMetric = {
  id: "co2" | "water" | "surface";
  label: string;
  value: number | null;
  unit: string;
  method: string;
  confidence: number;
};

type BuildPostActionImpactMetricsInput = {
  wasteKg: number | null;
  cigaretteButts: number | null;
  durationMinutes: number | null;
  operationalVolunteerUnits: number | null;
  qualityScore: number;
};

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  const scaled = value * factor;
  return Number.isFinite(scaled) ? Math.round(scaled) / factor : value;
}

function finiteRoundedOrNull(value: number, digits = 1): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  const rounded = round(value, digits);
  return Number.isFinite(rounded) ? rounded : null;
}

function finiteNonNegativeOrNull(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value >= 0 ? value : null;
}

export function buildPostActionImpactMetrics({
  wasteKg,
  cigaretteButts,
  durationMinutes,
  operationalVolunteerUnits,
  qualityScore,
}: BuildPostActionImpactMetricsInput): PostActionImpactMetric[] {
  const factors = IMPACT_PROXY_CONFIG.factors;
  const normalizedWasteKg = finiteNonNegativeOrNull(wasteKg);
  const normalizedCigaretteButts = finiteNonNegativeOrNull(cigaretteButts);
  const normalizedDurationMinutes = finiteNonNegativeOrNull(durationMinutes);
  const normalizedOperationalVolunteerUnits = finiteNonNegativeOrNull(
    operationalVolunteerUnits,
  );

  return [
    {
      id: "co2",
      label: "CO₂e évité",
      value:
        normalizedWasteKg === null
          ? null
          : finiteRoundedOrNull(normalizedWasteKg * factors.co2KgPerWasteKg),
      unit: "kg CO₂e",
      method: `Proxy ${IMPACT_PROXY_CONFIG.version} · déchets enregistrés × ${factors.co2KgPerWasteKg} kg CO₂e/kg`,
      confidence: qualityScore,
    },
    {
      id: "water",
      label: "Eau protégée",
      value:
        normalizedCigaretteButts === null
          ? null
          : finiteRoundedOrNull(
              normalizedCigaretteButts * factors.waterLitersPerCigaretteButt,
              0,
            ),
      unit: "L",
      method: `Proxy ${IMPACT_PROXY_CONFIG.version} · mégots enregistrés × ${factors.waterLitersPerCigaretteButt} L/mégot`,
      confidence: qualityScore,
    },
    {
      id: "surface",
      label: "Surface nettoyée",
      value:
        normalizedWasteKg === null ||
        normalizedDurationMinutes === null ||
        normalizedOperationalVolunteerUnits === null
          ? null
          : finiteRoundedOrNull(
              normalizedWasteKg * factors.surfaceM2PerWasteKg +
                normalizedDurationMinutes * normalizedOperationalVolunteerUnits *
                  factors.surfaceM2PerVolunteerMinute,
            ),
      unit: "m²",
      method: `Proxy ${IMPACT_PROXY_CONFIG.version} · poids + temps bénévole`,
      confidence: qualityScore,
    },
  ];
}
