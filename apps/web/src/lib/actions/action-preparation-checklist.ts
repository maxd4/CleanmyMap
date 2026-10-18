import type { PlannerWeatherContext } from "@/lib/weather/planner-weather";
import { plannerWeatherOperationalAssessment } from "@/lib/weather/planner-weather";
import { buildWasteFieldGuidance } from "@/lib/waste";
import type { ActionPreparationData } from "./types";
import {
  ACTION_EQUIPMENT_INVENTORY,
  ACTION_MATERIAL_SUGGESTIONS,
  ACTION_REFRESHMENT_OPTIONS,
  isActionEquipmentProvided,
} from "./preparation-contract";

export const ACTION_CHECKLIST_PROVENANCES = [
  "preparation",
  "organizer",
  "waste_catalog",
  "weather_forecast",
] as const;

export type ActionChecklistProvenance = (typeof ACTION_CHECKLIST_PROVENANCES)[number];

export type ActionVolunteerChecklistItem = {
  key: string;
  label: string;
  detail: string | null;
  provenance: ActionChecklistProvenance[];
};

export type ActionVolunteerChecklist = {
  toBring: ActionVolunteerChecklistItem[];
  weatherRecommendations: ActionVolunteerChecklistItem[];
  provided: ActionVolunteerChecklistItem[];
  weatherStatus: "available" | "unavailable";
  weatherMessage: string;
  staffing: {
    source: "confirmed" | "expected" | "unknown";
    count: number | null;
    label: string;
  };
  insufficiencies: string[];
};

export type ActionVolunteerChecklistInput = {
  preparation: ActionPreparationData | null | undefined;
  confirmedParticipants?: number | null;
  weatherContext?: PlannerWeatherContext | null;
};

const PROVENANCE_LABELS: Record<ActionChecklistProvenance, string> = {
  preparation: "préparation générale",
  organizer: "déclaration de l’organisateur",
  waste_catalog: "catalogue Waste",
  weather_forecast: "prévision météo",
};

export function actionChecklistProvenanceLabel(value: ActionChecklistProvenance): string {
  return PROVENANCE_LABELS[value];
}

function normalizedText(value: string): string {
  return value.trim().toLocaleLowerCase("fr-FR");
}

function finiteCount(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function resolveStaffing(preparation: ActionPreparationData | null | undefined, confirmedParticipants: number | null | undefined) {
  const confirmed = finiteCount(confirmedParticipants);
  if (confirmed !== null) {
    return { source: "confirmed" as const, count: confirmed, label: `${confirmed} bénévole(s) confirmé(s)` };
  }

  const expected = finiteCount(preparation?.volunteersExpected);
  if (expected !== null) {
    return { source: "expected" as const, count: expected, label: `Prévision saisie : ${expected} bénévole(s)` };
  }

  return { source: "unknown" as const, count: null, label: "Effectif exploitable non renseigné" };
}

function item(
  key: string,
  label: string,
  provenance: ActionChecklistProvenance | ActionChecklistProvenance[],
  detail: string | null = null,
): ActionVolunteerChecklistItem {
  return {
    key,
    label,
    detail,
    provenance: Array.isArray(provenance) ? [...new Set(provenance)] : [provenance],
  };
}

function addRecommendation(
  list: ActionVolunteerChecklistItem[],
  value: ActionVolunteerChecklistItem,
): void {
  const existing = list.find((candidate) => normalizedText(candidate.label) === normalizedText(value.label));
  if (!existing) {
    list.push(value);
    return;
  }
  existing.provenance = [...new Set([...existing.provenance, ...value.provenance])];
  if (!existing.detail && value.detail) existing.detail = value.detail;
}

function declaredEquipment(preparation: ActionPreparationData | null | undefined): ActionVolunteerChecklistItem[] {
  const inventory = preparation?.equipmentInventory;
  if (!inventory) return [];

  return ACTION_EQUIPMENT_INVENTORY.flatMap((option) => {
    const value = inventory[option.key];
    if (!isActionEquipmentProvided(option, value)) return [];
    const label = option.kind === "quantity" ? `${option.label} : ${value}` : option.label;
    return [item(`provided-${option.key}`, label, "organizer")];
  });
}

function declaredRefreshments(preparation: ActionPreparationData | null | undefined): ActionVolunteerChecklistItem[] {
  const refreshments = preparation?.refreshmentsProvided;
  if (!refreshments) return [];
  return ACTION_REFRESHMENT_OPTIONS.flatMap((option) => refreshments[option.key]
    ? [item(`provided-${option.key}`, option.label, "organizer")]
    : []);
}

function inventoryValue(
  preparation: ActionPreparationData | null | undefined,
  key: "glovesPairs" | "garbageBags" | "grabbers" | "highVisibilityVests",
): number | null {
  const value = preparation?.equipmentInventory?.[key];
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function isCoveredByKnownInventory(
  preparation: ActionPreparationData | null | undefined,
  recommendation: string,
): boolean {
  const text = normalizedText(recommendation);
  if (text.includes("gant")) return (inventoryValue(preparation, "glovesPairs") ?? 0) > 0;
  if (text.includes("pince")) return (inventoryValue(preparation, "grabbers") ?? 0) > 0;
  if (text.includes("sac")) return (inventoryValue(preparation, "garbageBags") ?? 0) > 0;
  if (text.includes("gilet")) return (inventoryValue(preparation, "highVisibilityVests") ?? 0) > 0;
  return false;
}

function buildToBring(
  preparation: ActionPreparationData | null | undefined,
  staffing: ActionVolunteerChecklist["staffing"],
  guidance: ReturnType<typeof buildWasteFieldGuidance>,
): { items: ActionVolunteerChecklistItem[]; insufficiencies: string[] } {
  const items: ActionVolunteerChecklistItem[] = [];
  const insufficiencies: string[] = [];
  const add = (label: string, provenance: ActionChecklistProvenance, key: string, detail: string | null = null) => {
    if (!label.trim()) return;
    if (isCoveredByKnownInventory(preparation, label)) return;
    addRecommendation(items, item(key, label.trim(), provenance, detail));
  };

  if (preparation?.recommendedMaterials?.trim()) {
    add(preparation.recommendedMaterials, "preparation", "preparation-recommended-materials");
  }

  for (const suggestion of preparation?.suggestedMaterials ?? []) {
    const label = ACTION_MATERIAL_SUGGESTIONS.find((candidate) => candidate.value === suggestion)?.label;
    if (label) add(label, "preparation", `preparation-suggestion-${suggestion}`);
  }

  for (const recommendation of guidance.toPrepare) {
    add(recommendation, "waste_catalog", `waste-material-${normalizedText(recommendation)}`);
  }

  const gloves = inventoryValue(preparation, "glovesPairs");
  if (staffing.count !== null && staffing.count > 0 && gloves !== null && gloves < staffing.count) {
    const missing = staffing.count - gloves;
    const label = gloves === 0
      ? "Gants : aucune paire fournie"
      : `Gants : quantité limitée (${gloves} paire(s) fournie(s) pour ${staffing.count})`;
    const detail = `Prévoir ${missing} paire(s) complémentaire(s) au minimum selon l’effectif ${staffing.label.toLocaleLowerCase()}.`;
    addRecommendation(items, item("shortage-gloves", label, "organizer", detail));
    insufficiencies.push(detail);
  }

  // A zero or an unknown quantity is never converted into a shortage without
  // an explicit, usable staffing count. Collective stock has no invented ratio.
  return { items, insufficiencies };
}

function validWeatherContext(context: PlannerWeatherContext | null | undefined): context is PlannerWeatherContext {
  return Boolean(
    context?.status === "available" &&
      context.coveredWindow &&
      context.hourly.length > 0 &&
      context.hourly.every((point) =>
        typeof point.time === "string" &&
        Number.isFinite(point.temperatureC) &&
        Number.isFinite(point.precipitationMm) &&
        Number.isFinite(point.windKmh),
      ),
  );
}

function buildWeatherRecommendations(
  context: PlannerWeatherContext | null | undefined,
): Pick<ActionVolunteerChecklist, "weatherRecommendations" | "weatherStatus" | "weatherMessage"> {
  if (!validWeatherContext(context)) {
    return {
      weatherRecommendations: [],
      weatherStatus: "unavailable",
      weatherMessage: "Prévisions météo indisponibles pour cette action",
    };
  }

  const points = context.hourly;
  const recommendations: ActionVolunteerChecklistItem[] = [];
  const temperatures = points.map((point) => point.temperatureC).filter((value): value is number => Number.isFinite(value));
  const precipitation = points.map((point) => point.precipitationMm).filter((value): value is number => Number.isFinite(value));
  const wind = points.map((point) => point.windKmh).filter((value): value is number => Number.isFinite(value));
  if (precipitation.some((value) => value > 0)) {
    addRecommendation(recommendations, item("weather-rain", "Prévoir une veste imperméable", "weather_forecast"));
  }
  if (temperatures.some((value) => value <= 4)) {
    addRecommendation(recommendations, item("weather-cold", "Prévoir des couches chaudes et une protection adaptée", "weather_forecast"));
  }
  if (temperatures.some((value) => value >= 28)) {
    addRecommendation(recommendations, item("weather-heat", "Prévoir de l’hydratation et organiser des pauses", "weather_forecast"));
  }
  if (wind.some((value) => value >= 30)) {
    addRecommendation(recommendations, item("weather-wind", "Prévoir un coupe-vent et suivre les précautions opérationnelles", "weather_forecast"));
  }

  const operational = plannerWeatherOperationalAssessment(context);
  if (operational?.operationalLimitMinutes !== null && operational?.operationalLimitMinutes !== undefined) {
    addRecommendation(
      recommendations,
      item(
        "weather-operational-limit",
        `Prévoir des pauses et une durée indicative jusqu’à ${operational.operationalLimitMinutes} minutes`,
        "weather_forecast",
        "Cette indication ne constitue pas une garantie de sécurité et ne remplace pas les consignes opérationnelles.",
      ),
    );
  }

  return {
    weatherRecommendations: recommendations,
    weatherStatus: "available",
    weatherMessage: "Prévisions météo disponibles pour le créneau sélectionné",
  };
}

export function deriveActionVolunteerChecklist({
  preparation,
  confirmedParticipants,
  weatherContext = null,
}: ActionVolunteerChecklistInput): ActionVolunteerChecklist {
  const staffing = resolveStaffing(preparation, confirmedParticipants);
  const guidance = buildWasteFieldGuidance(preparation?.expectedWasteCategories);
  const provided = [
    ...(preparation?.materialsProvided?.trim()
      ? [item("provided-materials", preparation.materialsProvided.trim(), "organizer")]
      : []),
    ...declaredEquipment(preparation),
    ...declaredRefreshments(preparation),
  ];
  const toBring = buildToBring(preparation, staffing, guidance);
  const weather = buildWeatherRecommendations(weatherContext);

  return {
    toBring: toBring.items,
    weatherRecommendations: weather.weatherRecommendations,
    provided,
    weatherStatus: weather.weatherStatus,
    weatherMessage: weather.weatherMessage,
    staffing,
    insufficiencies: toBring.insufficiencies,
  };
}

export const buildActionVolunteerChecklist = deriveActionVolunteerChecklist;
