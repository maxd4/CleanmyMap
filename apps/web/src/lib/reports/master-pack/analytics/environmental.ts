import { computeEnvironmentalProxyMetrics } from "@/lib/reports/report-model/metrics";
import { toFrNumber, toFrInt } from "@/lib/reports/report-model/formatters";
import { buildPersonalImpactMethodology } from "@/lib/gamification/progression-impact";
import { formatScorePercent } from "@/lib/formatters/score";

export function computeEnvironmentalProxies(totalButts: number, totalKg: number, pollutionScoreAverage: number) {
  const { waterProtectedLiters, co2AvoidedKg, recyclableKg, triIndex } =
    computeEnvironmentalProxyMetrics(totalButts, totalKg);

  const methodology = buildPersonalImpactMethodology(pollutionScoreAverage);

  return {
    waterProtectedLiters,
    co2AvoidedKg,
    recyclableKg,
    triIndex,
    methodology,
    display: {
      water: `${toFrInt(waterProtectedLiters)} L d'eau préservés`,
      co2: `${toFrNumber(co2AvoidedKg)} kg CO2e évités`,
      tri: `${formatScorePercent(triIndex)} (Indice de tri)`,
    }
  };
}
