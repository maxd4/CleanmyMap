import { env } from "@/lib/env";

export type ImpactProxyFactors = {
  waterLitersPerCigaretteButt: number;
  co2KgPerWasteKg: number;
  surfaceM2PerWasteKg: number;
  surfaceM2PerVolunteerMinute: number;
  euroSavedPerWasteKg: number;
};

export type ImpactProxyConfig = {
  version: string;
  factors: ImpactProxyFactors;
  sources: {
    water: string;
    co2: string;
    surface: string;
    roi: string;
  };
};

const DEFAULT_IMPACT_PROXY_VERSION = "impact-proxy-2026.04-v1";

const DEFAULT_IMPACT_PROXY_FACTORS: ImpactProxyFactors = {
  waterLitersPerCigaretteButt: 500,
  co2KgPerWasteKg: 1.2,
  surfaceM2PerWasteKg: 2.5,
  surfaceM2PerVolunteerMinute: 0.12,
  euroSavedPerWasteKg: 1.5,
};

const MAX_PROXY_FACTOR = 1_000_000;

function parseFactor(raw: string | undefined, fallback: number): number {
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  if (parsed < 0 || parsed > MAX_PROXY_FACTOR) {
    return fallback;
  }
  return parsed;
}

function parseVersion(raw: string | undefined): string {
  const value = raw?.trim();
  return value && value.length > 0 ? value : DEFAULT_IMPACT_PROXY_VERSION;
}

export const IMPACT_PROXY_CONFIG: ImpactProxyConfig = {
  version: parseVersion(env.IMPACT_PROXY_VERSION),
  factors: {
    waterLitersPerCigaretteButt: parseFactor(
      env.IMPACT_PROXY_WATER_LITERS_PER_CIGARETTE_BUTT,
      DEFAULT_IMPACT_PROXY_FACTORS.waterLitersPerCigaretteButt,
    ),
    co2KgPerWasteKg: parseFactor(
      env.IMPACT_PROXY_CO2_KG_PER_WASTE_KG,
      DEFAULT_IMPACT_PROXY_FACTORS.co2KgPerWasteKg,
    ),
    surfaceM2PerWasteKg: parseFactor(
      env.IMPACT_PROXY_SURFACE_M2_PER_WASTE_KG,
      DEFAULT_IMPACT_PROXY_FACTORS.surfaceM2PerWasteKg,
    ),
    surfaceM2PerVolunteerMinute: parseFactor(
      env.IMPACT_PROXY_SURFACE_M2_PER_VOLUNTEER_MINUTE,
      DEFAULT_IMPACT_PROXY_FACTORS.surfaceM2PerVolunteerMinute,
    ),
    euroSavedPerWasteKg: 1.5, // Reference calculation for cities
  },
  sources: {
    water: "Estimation 500L/mégot (Risk assessment proxy - Ocean Conservancy / WHO reports).",
    co2: "Facteur 1.2kg CO2eq/kg déchets (Moyenne mix de déchets ménagers - Base Empreinte ADEME).",
    surface: "Modèle opérationnel CleanMyMap basé sur le ratio poids/temps/surface observés.",
    roi: "Estimation 1.5€/kg évité (Moyenne coûts de nettoyage urbain vs ramassage bénévole - Proxy collectivités).",
  },
};

