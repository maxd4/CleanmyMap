export type OperationalZone = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  coveredAreas: string[];
};

export type WeatherRiskLevel = "vert" | "orange" | "rouge";

export type WeatherRiskAssessment = {
  level: WeatherRiskLevel;
  reasons: string[];
  equipment: string[];
  constraints: string[];
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

export const OPERATIONAL_ZONES: OperationalZone[] = [
  {
    id: "centre",
    label: "Paris centre",
    latitude: 48.8593,
    longitude: 2.347,
    coveredAreas: ["1e", "2e", "3e", "4e"],
  },
  {
    id: "nord",
    label: "Paris nord",
    latitude: 48.8897,
    longitude: 2.356,
    coveredAreas: ["9e", "10e", "18e", "19e"],
  },
  {
    id: "est",
    label: "Paris est",
    latitude: 48.8536,
    longitude: 2.409,
    coveredAreas: ["11e", "12e", "20e"],
  },
  {
    id: "sud",
    label: "Paris sud",
    latitude: 48.8327,
    longitude: 2.343,
    coveredAreas: ["5e", "6e", "13e", "14e"],
  },
  {
    id: "ouest",
    label: "Paris ouest",
    latitude: 48.8705,
    longitude: 2.286,
    coveredAreas: ["7e", "8e", "15e", "16e", "17e"],
  },
];

function maxLevel(levels: WeatherRiskLevel[]): WeatherRiskLevel {
  if (levels.includes("rouge")) {
    return "rouge";
  }
  if (levels.includes("orange")) {
    return "orange";
  }
  return "vert";
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
          "Hydratation obligatoire",
          "Couverture thermique",
        ]
      : level === "orange"
        ? ["Veste impermeable", "Gants adaptes", "Chaussures antiderapantes"]
        : ["Gants standards", "Eau", "Gilet visibilite"];

  const constraints =
    level === "rouge"
      ? [
          "Intervention courte <=45 min",
          "Pauses frequentes",
          "Binomes obligatoires",
        ]
      : level === "orange"
        ? [
            "Intervention <=90 min",
            "Pause toutes les 30 min",
            "Binomes recommandes",
          ]
        : [
            "Intervention standard",
            "Pause toutes les 60 min",
            "Brief securite initial",
          ];

  return {
    level,
    reasons: reasons.length > 0 ? reasons : ["Conditions meteo stables"],
    equipment,
    constraints,
  };
}

export function buildInterventionWindows(hourly: HourlyPoint[]): {
  recommended: InterventionWindow[];
  avoid: InterventionWindow[];
} {
  const next72h = hourly.slice(0, 72);
  const recommended: InterventionWindow[] = [];
  const avoid: InterventionWindow[] = [];

  for (let i = 0; i <= next72h.length - 2; i += 2) {
    const start = next72h[i];
    const end = next72h[i + 1];
    const startRisk = evaluateWeatherRisk({
      temperature: start.temperature,
      rain: start.rain,
      wind: start.wind,
    });
    const endRisk = evaluateWeatherRisk({
      temperature: end.temperature,
      rain: end.rain,
      wind: end.wind,
    });

    const level = maxLevel([startRisk.level, endRisk.level]);
    const window: InterventionWindow = {
      from: start.time,
      to: end.time,
      level,
      reason:
        level === "rouge"
          ? "Risque meteo eleve"
          : level === "orange"
            ? "Conditions prudentes"
            : "Fenetre favorable",
    };

    if (level === "rouge") {
      avoid.push(window);
    } else {
      recommended.push(window);
    }
  }

  return {
    recommended: recommended.slice(0, 5),
    avoid: avoid.slice(0, 5),
  };
}

export function zoneForArea(area: string): OperationalZone | null {
  return (
    OPERATIONAL_ZONES.find((zone) => zone.coveredAreas.includes(area)) ?? null
  );
}
