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
  operationalVolunteerUnits: number;
  qualityScore: number;
};

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function buildPostActionImpactMetrics({
  wasteKg,
  cigaretteButts,
  durationMinutes,
  operationalVolunteerUnits,
  qualityScore,
}: BuildPostActionImpactMetricsInput): PostActionImpactMetric[] {
  const factors = IMPACT_PROXY_CONFIG.factors;

  return [
    {
      id: "co2",
      label: "CO₂e évité",
      value: wasteKg === null ? null : round(wasteKg * factors.co2KgPerWasteKg),
      unit: "kg CO₂e",
      method: `Proxy ${IMPACT_PROXY_CONFIG.version} · déchets enregistrés × ${factors.co2KgPerWasteKg} kg CO₂e/kg`,
      confidence: qualityScore,
    },
    {
      id: "water",
      label: "Eau protégée",
      value:
        cigaretteButts === null
          ? null
          : Math.round(cigaretteButts * factors.waterLitersPerCigaretteButt),
      unit: "L",
      method: `Proxy ${IMPACT_PROXY_CONFIG.version} · mégots enregistrés × ${factors.waterLitersPerCigaretteButt} L/mégot`,
      confidence: qualityScore,
    },
    {
      id: "surface",
      label: "Surface nettoyée",
      value:
        wasteKg === null || durationMinutes === null
          ? null
          : round(
              wasteKg * factors.surfaceM2PerWasteKg +
                durationMinutes * operationalVolunteerUnits *
                  factors.surfaceM2PerVolunteerMinute,
            ),
      unit: "m²",
      method: `Proxy ${IMPACT_PROXY_CONFIG.version} · poids + temps bénévole`,
      confidence: qualityScore,
    },
  ];
}
