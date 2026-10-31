import { env } from "@/lib/env";
import {
  STREET_CLEANING_EUROS_PER_WASTE_KG,
  WATER_LITERS_PER_CIGARETTE_BUTT,
} from "@/lib/impact/impact-terrain-2026-constants";

export type ImpactProxyFactors = {
  waterLitersPerCigaretteButt: number;
  co2KgPerWasteKg: number;
  surfaceM2PerWasteKg: number;
  surfaceM2PerVolunteerMinute: number;
  euroSavedPerWasteKg: number;
};

export type ImpactProxyConfig = {
  /** Human-readable/configuration identity retained for legacy snapshots. */
  configuredVersion: string;
  /** Stable fingerprint of the effective factor set used by new calculations. */
  factorsFingerprint: string;
  /** Version plus effective-factor fingerprint; this is the calculation identity. */
  effectiveVersion: string;
  /** Compatibility alias: consumers must use the effective version. */
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
  waterLitersPerCigaretteButt: WATER_LITERS_PER_CIGARETTE_BUTT,
  co2KgPerWasteKg: 1.2,
  surfaceM2PerWasteKg: 2.5,
  surfaceM2PerVolunteerMinute: 0.12,
  euroSavedPerWasteKg: STREET_CLEANING_EUROS_PER_WASTE_KG,
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

function fingerprintFactors(factors: ImpactProxyFactors): string {
  const canonical = [
    ["co2KgPerWasteKg", factors.co2KgPerWasteKg],
    ["euroSavedPerWasteKg", factors.euroSavedPerWasteKg],
    ["surfaceM2PerVolunteerMinute", factors.surfaceM2PerVolunteerMinute],
    ["surfaceM2PerWasteKg", factors.surfaceM2PerWasteKg],
    ["waterLitersPerCigaretteButt", factors.waterLitersPerCigaretteButt],
  ]
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("|");
  let hash = 2_166_136_261;
  for (const character of canonical) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

const configuredVersion = parseVersion(env.IMPACT_PROXY_VERSION);
const factors: ImpactProxyFactors = {
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
  euroSavedPerWasteKg: DEFAULT_IMPACT_PROXY_FACTORS.euroSavedPerWasteKg,
};
const factorsFingerprint = fingerprintFactors(factors);
const effectiveVersion = `${configuredVersion}+factors-${factorsFingerprint}`;

const EFFECTIVE_VERSION_SUFFIX = /\+factors-[0-9a-f]{8}$/;

/**
 * Accepts the pre-fingerprint configured identity and fingerprinted identities
 * already persisted by older runtimes. This is for historical reads only.
 */
export function isKnownImpactProxyVersion(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    (value === configuredVersion || EFFECTIVE_VERSION_SUFFIX.test(value))
  );
}

export function isCurrentImpactProxyVersion(value: unknown): boolean {
  return value === effectiveVersion;
}

export const IMPACT_PROXY_CONFIG: ImpactProxyConfig = {
  configuredVersion,
  factorsFingerprint,
  effectiveVersion,
  version: effectiveVersion,
  factors,
  sources: {
    water: "Risk assessment proxy - Ocean Conservancy / WHO reports.",
    co2: "Moyenne mix de déchets ménagers - Base Empreinte ADEME.",
    surface: "Modèle opérationnel CleanMyMap basé sur le ratio poids/temps/surface observés.",
    roi: "Moyenne coûts de nettoyage urbain vs ramassage bénévole - Proxy collectivités.",
  },
};
