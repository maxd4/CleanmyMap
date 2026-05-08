import { toFrNumber, toFrInt } from "@/components/reports/web-document/analytics";
import { buildPersonalImpactMethodology } from "@/lib/gamification/progression-impact";

export function computeEnvironmentalProxies(totalButts: number, totalKg: number, pollutionScoreAverage: number) {
  const waterProtectedLiters = Math.round(totalButts * 500);
  const co2AvoidedKg = totalButts * 0.0014;
  const recyclableKg = totalKg * 0.55;
  const triIndex = totalKg > 0 
    ? Math.max(0, Math.min(100, 100 - (totalButts / Math.max(totalKg, 1)) * 0.7)) 
    : 0;

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
      tri: `${toFrNumber(triIndex)}/100 (Indice de tri)`,
    }
  };
}

export function computeWeatherOperationalAdvice(params: {
  temperature: number;
  rain: number;
  wind: number;
}) {
  if (params.rain >= 3 || params.wind >= 40) {
    return {
      status: "caution",
      advice: "Niveau météo prudent : renforcer EPI, réduire durée et sécuriser les points d'appui.",
      color: "amber"
    };
  }
  if (params.temperature >= 28) {
    return {
      status: "hot",
      advice: "Niveau météo chaud : prévoir eau, pauses et roulement de l'équipe.",
      color: "orange"
    };
  }
  if (params.temperature <= 3) {
    return {
      status: "cold",
      advice: "Niveau météo froid : cycles courts et protection renforcée des mains.",
      color: "blue"
    };
  }
  return {
    status: "optimal",
    advice: "Niveau météo favorable : fenêtre opérationnelle standard.",
    color: "emerald"
  };
}
