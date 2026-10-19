import type {
  PlannerWeatherContext,
  PlannerWeatherContextRequest,
} from "@/lib/weather/planner-weather";
import {
  isPlannerWeatherContextCompatible,
  plannerWeatherOperationalAssessment,
} from "@/lib/weather/planner-weather";
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

export const ACTION_WEATHER_STATES = ["idle", "loading", "success", "unavailable", "error"] as const;
export type ActionWeatherState = (typeof ACTION_WEATHER_STATES)[number];

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
  weatherState: ActionWeatherState;
  weatherMessage: string;
  weatherForecast?: {
    fetchedAt: string;
    coveredWindow: { startAt: string; endAt: string };
  } | null;
  weatherContext?: PlannerWeatherContext | null;
  weatherRequest?: PlannerWeatherContextRequest | null;
  staffing: {
    source: "confirmed" | "expected" | "unknown";
    count: number | null;
    label: string;
  };
  insufficiencies: string[];
};

export type ActionVolunteerWeatherRequest = Pick<
  PlannerWeatherContextRequest,
  "latitude" | "longitude" | "scheduledStartAt" | "scheduledEndAt"
>;

export type ActionVolunteerChecklistPublic = Omit<ActionVolunteerChecklist, "weatherContext" | "weatherRequest"> & {
  weatherRequest?: ActionVolunteerWeatherRequest | null;
};

export type ActionVolunteerChecklistInput = {
  preparation: ActionPreparationData | null | undefined;
  confirmedParticipants?: number | null;
  weatherContext?: PlannerWeatherContext | null;
  weatherRequest?: PlannerWeatherContextRequest | null;
  weatherState?: ActionWeatherState;
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

function isStructuredGlovesSuggestionCovered(
  preparation: ActionPreparationData | null | undefined,
  staffing: ActionVolunteerChecklist["staffing"],
): boolean {
  const stock = inventoryValue(preparation, "glovesPairs");
  return staffing.count !== null && stock !== null && stock >= staffing.count;
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
    addRecommendation(items, item(key, label.trim(), provenance, detail));
  };

  if (preparation?.recommendedMaterials?.trim()) {
    add(preparation.recommendedMaterials, "preparation", "preparation-recommended-materials");
  }

  for (const suggestion of preparation?.suggestedMaterials ?? []) {
    const label = ACTION_MATERIAL_SUGGESTIONS.find((candidate) => candidate.value === suggestion)?.label;
    if (!label || (suggestion === "gloves" && isStructuredGlovesSuggestionCovered(preparation, staffing))) continue;
    add(label, "preparation", `preparation-suggestion-${suggestion}`);
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

function buildWeatherRecommendations(
  context: PlannerWeatherContext | null | undefined,
  request: PlannerWeatherContextRequest | null | undefined,
  requestedState?: ActionWeatherState,
): Pick<ActionVolunteerChecklist, "weatherRecommendations" | "weatherStatus" | "weatherMessage"> {
  const state = requestedState ?? (
    !request
      ? "idle"
      : context?.status === "available" && isPlannerWeatherContextCompatible(context, request)
        ? "success"
        : "unavailable"
  );
  if (state === "idle") {
    return {
      weatherRecommendations: [],
      weatherStatus: "unavailable",
      weatherMessage: "",
    };
  }
  if (state === "loading") {
    return {
      weatherRecommendations: [],
      weatherStatus: "unavailable",
      weatherMessage: "Analyse des prévisions météo…",
    };
  }
  if (state === "error") {
    return {
      weatherRecommendations: [],
      weatherStatus: "unavailable",
      weatherMessage: "Impossible d’analyser les prévisions météo. Réessayez.",
    };
  }
  if (!isPlannerWeatherContextCompatible(context, request)) {
    return {
      weatherRecommendations: [],
      weatherStatus: "unavailable",
      weatherMessage: "Prévisions météo indisponibles pour cette action.",
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
  weatherRequest = null,
  weatherState,
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
  const resolvedWeatherState = weatherState ?? (
    !weatherRequest
      ? "idle"
      : weatherContext?.status === "available" && isPlannerWeatherContextCompatible(weatherContext, weatherRequest)
        ? "success"
        : "unavailable"
  );
  const weather = buildWeatherRecommendations(weatherContext, weatherRequest, resolvedWeatherState);
  const weatherForecast = resolvedWeatherState === "success" && weatherContext?.coveredWindow
    ? { fetchedAt: weatherContext.fetchedAt, coveredWindow: weatherContext.coveredWindow }
    : null;

  return {
    toBring: toBring.items,
    weatherRecommendations: weather.weatherRecommendations,
    provided,
    weatherStatus: weather.weatherStatus,
    weatherState: resolvedWeatherState,
    weatherMessage: weather.weatherMessage,
    ...(weatherForecast ? { weatherForecast } : {}),
    ...(weatherContext ? { weatherContext } : {}),
    ...(weatherRequest ? { weatherRequest } : {}),
    staffing,
    insufficiencies: toBring.insufficiencies,
  };
}

function projectWeatherRequest(
  request: PlannerWeatherContextRequest | null | undefined,
): ActionVolunteerWeatherRequest | null {
  if (!request) return null;
  return {
    latitude: request.latitude,
    longitude: request.longitude,
    ...(request.scheduledStartAt ? { scheduledStartAt: request.scheduledStartAt } : {}),
    ...(request.scheduledEndAt ? { scheduledEndAt: request.scheduledEndAt } : {}),
  };
}

function projectChecklistItems(items: ActionVolunteerChecklistItem[]): ActionVolunteerChecklistItem[] {
  return items.map(({ key, label, detail, provenance }) => ({
    key,
    label,
    detail,
    provenance: [...provenance],
  }));
}

/**
 * Projects the internal checklist for public and confirmed-volunteer HTTP
 * responses. Forecast context and planner evaluation objects stay server-side;
 * only the bounded request needed by the explicit weather action is retained.
 */
export function projectActionVolunteerChecklistForPublic(
  checklist: ActionVolunteerChecklist,
): ActionVolunteerChecklistPublic {
  return {
    toBring: projectChecklistItems(checklist.toBring),
    weatherRecommendations: projectChecklistItems(checklist.weatherRecommendations),
    provided: projectChecklistItems(checklist.provided),
    weatherStatus: checklist.weatherStatus,
    weatherState: checklist.weatherState,
    weatherMessage: checklist.weatherMessage,
    ...(checklist.weatherForecast ? {
      weatherForecast: {
        fetchedAt: checklist.weatherForecast.fetchedAt,
        coveredWindow: { ...checklist.weatherForecast.coveredWindow },
      },
    } : {}),
    ...(checklist.weatherRequest ? { weatherRequest: projectWeatherRequest(checklist.weatherRequest) } : {}),
    staffing: { ...checklist.staffing },
    insufficiencies: [...checklist.insufficiencies],
  };
}

export const buildActionVolunteerChecklist = deriveActionVolunteerChecklist;
