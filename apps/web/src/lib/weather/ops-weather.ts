export type WeatherRiskLevel = "vert" | "orange" | "rouge";

export const WEATHER_OPERATIONAL_RULE_VERSION = "weather-operational-rules-v1" as const;
export const WEATHER_OPERATIONAL_RULE_SOURCE = "apps/web/src/lib/weather/ops-weather" as const;

type WeatherOperationalRule = {
  version: typeof WEATHER_OPERATIONAL_RULE_VERSION;
  source: typeof WEATHER_OPERATIONAL_RULE_SOURCE;
  maxInterventionMinutes: number | null;
};

export type WeatherRiskAssessment = {
  level: WeatherRiskLevel;
  reasons: string[];
  equipment: string[];
  constraints: string[];
  operationalRule: WeatherOperationalRule;
  operationalLimitMinutes: number | null;
};

export type HourlyPoint = {
  time: string;
  temperature: number;
  rain: number;
  wind: number;
};

export type InterventionWindow = {
  from: string;
  to: string;
  level: WeatherRiskLevel;
  reason: string;
};

function localTimeParts(value: string): { date: string; minutes: number } | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  if (hour > 23 || minute > 59) return null;
  return { date: match[1]!, minutes: hour * 60 + minute };
}

function areAdjacentLocalHours(start: string, end: string): boolean {
  const startParts = localTimeParts(start);
  const endParts = localTimeParts(end);
  if (!startParts || !endParts || startParts.date !== endParts.date) return false;

  // Open-Meteo returns local civil times for the requested Europe/Paris
  // timezone. A repeated local hour can occur at the autumn DST transition;
  // the ordered provider rows are still adjacent in that case.
  return endParts.minutes === startParts.minutes || endParts.minutes - startParts.minutes === 60;
}

function maxLevel(levels: WeatherRiskLevel[]): WeatherRiskLevel {
  if (levels.includes("rouge")) {
    return "rouge";
  }
  if (levels.includes("orange")) {
    return "orange";
  }
  return "vert";
}
function riskRank(level: WeatherRiskLevel): number {
  return level === "rouge" ? 2 : level === "orange" ? 1 : 0;
}

function appendContinuousWindow(
  windows: InterventionWindow[],
  window: InterventionWindow,
): void {
  const previous = windows.at(-1);
  if (previous && previous.to === window.from && previous.level === window.level) {
    previous.to = window.to;
    return;
  }
  windows.push(window);
}
function weatherOperationalRuleForLevel(
  level: WeatherRiskLevel,
): WeatherOperationalRule {
  return {
    version: WEATHER_OPERATIONAL_RULE_VERSION,
    source: WEATHER_OPERATIONAL_RULE_SOURCE,
    // These limits are the existing operational guidance below, not a speed
    // or collection coefficient. Green conditions intentionally have no limit.
    maxInterventionMinutes: level === "rouge" ? 45 : level === "orange" ? 90 : null,
  };
}
export function evaluateWeatherRisk(input: {
  temperature: number;
  rain: number;
  wind: number;
}): WeatherRiskAssessment {
  const reasons: string[] = [];
  const levels: WeatherRiskLevel[] = [];

  if (input.rain >= 3) {
    levels.push("rouge");
    reasons.push("Pluie forte (>=3 mm/h)");
  } else if (input.rain >= 0.8) {
    levels.push("orange");
    reasons.push("Pluie moderee (>=0.8 mm/h)");
  } else {
    levels.push("vert");
  }

  if (input.wind >= 45) {
    levels.push("rouge");
    reasons.push("Vent fort (>=45 km/h)");
  } else if (input.wind >= 30) {
    levels.push("orange");
    reasons.push("Vent sensible (>=30 km/h)");
  } else {
    levels.push("vert");
  }

  if (input.temperature >= 33) {
    levels.push("rouge");
    reasons.push("Chaleur forte (>=33 C)");
  } else if (input.temperature >= 28) {
    levels.push("orange");
    reasons.push("Chaleur (>=28 C)");
  } else if (input.temperature <= 0) {
    levels.push("rouge");
    reasons.push("Froid intense (<=0 C)");
  } else if (input.temperature <= 4) {
    levels.push("orange");
    reasons.push("Froid (<=4 C)");
  } else {
    levels.push("vert");
  }

  const level = maxLevel(levels);
  const equipment =
    level === "rouge"
      ? [
          "EPI complet pluie/vent",
          "Gants renforces",
          "Hydratation à envisager selon la durée et les conditions",
          "Couverture thermique",
        ]
      : level === "orange"
        ? ["Veste impermeable", "Gants adaptes", "Chaussures antiderapantes"]
        : ["Gants standards", "Eau", "Gilet visibilite"];

  const constraints =
    level === "rouge"
      ? [
          "Durée indicative : jusqu’à 45 min",
          "Pauses frequentes",
          "Binôme à envisager selon les conditions",
        ]
      : level === "orange"
        ? [
            "Durée indicative : jusqu’à 90 min",
            "Pauses à prévoir selon les conditions",
            "Binôme à envisager selon les conditions",
          ]
        : [
            "Intervention standard",
            "Durée indicative : 90 à 120 min",
            "Pauses à prévoir selon la durée",
            "Brief sécurité à envisager",
        ];

  const operationalRule = weatherOperationalRuleForLevel(level);

  return {
    level,
    reasons: reasons.length > 0 ? reasons : ["Aucun seuil de vigilance dépassé"],
    equipment,
    constraints,
    operationalRule,
    operationalLimitMinutes: operationalRule.maxInterventionMinutes,
  };
}

export function evaluateWeatherWindowRisk(
  hourly: readonly HourlyPoint[],
): WeatherRiskAssessment | null {
  if (
    hourly.length === 0 ||
    hourly.some((point) =>
      !Number.isFinite(point.temperature) ||
      !Number.isFinite(point.rain) ||
      !Number.isFinite(point.wind),
    )
  ) {
    return null;
  }

  const assessments = hourly.map((point) => evaluateWeatherRisk(point));
  const level = maxLevel(assessments.map((assessment) => assessment.level));
  const reasons = [...new Set(
    assessments
      .filter((assessment) => riskRank(assessment.level) === riskRank(level))
      .flatMap((assessment) => assessment.reasons),
  )];
  const representative = evaluateWeatherRisk({
    temperature: level === "rouge" ? 33 : level === "orange" ? 28 : 20,
    rain: level === "rouge" ? 3 : level === "orange" ? 0.8 : 0,
    wind: level === "rouge" ? 45 : level === "orange" ? 30 : 10,
  });

  return {
    ...representative,
    reasons: reasons.length > 0 ? reasons : representative.reasons,
  };
}

export function buildInterventionWindows(hourly: HourlyPoint[]): {
  recommended: InterventionWindow[];
  avoid: InterventionWindow[];
} {
  const recommended: InterventionWindow[] = [];
  const avoid: InterventionWindow[] = [];

  let i = 0;
  while (i <= hourly.length - 2) {
    const start = hourly[i];
    const end = hourly[i + 1];
    if (!start || !end) {
      i += 1;
      continue;
    }
    if (!areAdjacentLocalHours(start.time, end.time)) {
      i += 1;
      continue;
    }
    const windowRisk = evaluateWeatherWindowRisk([start, end]);
    if (!windowRisk) {
      i += 1;
      continue;
    }
    const window: InterventionWindow = {
      from: start.time,
      to: end.time,
      level: windowRisk.level,
      reason:
        windowRisk.level === "rouge"
          ? "Risque meteo eleve"
          : windowRisk.level === "orange"
            ? "Conditions prudentes"
            : "Fenetre favorable",
    };

    if (windowRisk.level === "rouge") {
      appendContinuousWindow(avoid, window);
    } else {
      appendContinuousWindow(recommended, window);
    }
    i += 1;
  }

  return {
    recommended: recommended.slice(0, 5),
    avoid: avoid.slice(0, 5),
  };
}
