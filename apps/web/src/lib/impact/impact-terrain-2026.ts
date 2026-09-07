import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import type { ActionMegotsCondition } from "@/lib/actions/types";
import {
  CO2_GRAMS_PER_CAR_KILOMETER,
  CO2_GRAMS_PER_PARIS_NEW_YORK_FLIGHT,
  FRENCH_PERSON_ANNUAL_WATER_LITERS,
  OLYMPIC_POOL_LITERS,
  PARIS_MOSCOW_ROAD_DISTANCE_KM,
  WATER_LITERS_PER_CIGARETTE_BUTT,
} from "./impact-terrain-2026-constants";

export {
  CO2_GRAMS_PER_CAR_KILOMETER,
  CO2_GRAMS_PER_PARIS_NEW_YORK_FLIGHT,
  FRENCH_PERSON_ANNUAL_WATER_LITERS,
  OLYMPIC_POOL_LITERS,
  PARIS_MOSCOW_ROAD_DISTANCE_KM,
  WATER_LITERS_PER_CIGARETTE_BUTT,
} from "./impact-terrain-2026-constants";

export const BUTTS_PER_KG_REFERENCE = 2_500;
export const WASTE_KG_PER_50L_BAG = 5;
export const WASTE_KG_PER_MECHANICAL_BICYCLE = 20;
export const BUTT_LENGTH_METERS = 0.025;

export const MEGOTS_CONDITIONS = ["propre", "humide", "mouille"] as const;

export const CONDITION_WEIGHT_FACTORS: Record<
  ActionMegotsCondition,
  number
> = {
  propre: 1,
  humide: 0.7,
  mouille: 0.4,
};

export const MEGOTS_CONDITION_LABELS: Record<
  ActionMegotsCondition,
  ImpactTerrain2026LocalizedText
> = {
  propre: { fr: "Propre", en: "Clean" },
  humide: { fr: "Humide", en: "Damp" },
  mouille: { fr: "Mouillé", en: "Wet" },
};

export function computeButtsCount(
  weightKg: number,
  condition: ActionMegotsCondition,
): number {
  return Math.round(
    Math.max(0, weightKg) *
      BUTTS_PER_KG_REFERENCE *
      CONDITION_WEIGHT_FACTORS[condition],
  );
}

export function estimateButtsWeightKg(
  count: number,
  condition?: ActionMegotsCondition | null,
): number {
  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }

  const factor = condition ? CONDITION_WEIGHT_FACTORS[condition] : 1;
  return count / (BUTTS_PER_KG_REFERENCE * factor);
}

export type ImpactTerrain2026Co2Conversions = {
  co2eKg: number;
  co2eGrams: number;
  carKilometers: number;
  parisMoscowCarTrips: number;
  parisNewYorkFlightShares: number;
};

export function computeImpactTerrain2026Co2Conversions(
  wasteKg: number,
): ImpactTerrain2026Co2Conversions {
  const normalizedWasteKg = Number.isFinite(wasteKg)
    ? Math.max(0, wasteKg)
    : 0;
  const co2eKg =
    normalizedWasteKg * IMPACT_PROXY_CONFIG.factors.co2KgPerWasteKg;
  const co2eGrams = co2eKg * 1_000;

  return {
    co2eKg,
    co2eGrams,
    carKilometers: co2eGrams / CO2_GRAMS_PER_CAR_KILOMETER,
    parisMoscowCarTrips:
      co2eGrams /
      (PARIS_MOSCOW_ROAD_DISTANCE_KM * CO2_GRAMS_PER_CAR_KILOMETER),
    parisNewYorkFlightShares:
      co2eGrams / CO2_GRAMS_PER_PARIS_NEW_YORK_FLIGHT,
  };
}

export type ImpactTerrain2026WaterConversions = {
  waterLiters: number;
  olympicPools: number;
  frenchPersonYears: number;
};

export function computeImpactTerrain2026WaterConversions(
  cigaretteButts: number,
): ImpactTerrain2026WaterConversions {
  const normalizedButts = Number.isFinite(cigaretteButts)
    ? Math.max(0, cigaretteButts)
    : 0;
  const waterLiters =
    normalizedButts *
    IMPACT_PROXY_CONFIG.factors.waterLitersPerCigaretteButt;

  return {
    waterLiters,
    olympicPools: waterLiters / OLYMPIC_POOL_LITERS,
    frenchPersonYears: waterLiters / FRENCH_PERSON_ANNUAL_WATER_LITERS,
  };
}

export type ImpactTerrain2026KpiKey =
  | "wasteKg"
  | "butts"
  | "volunteers"
  | "co2"
  | "water"
  | "euro";

export type ImpactTerrain2026LocalizedText = {
  fr: string;
  en: string;
};

export type ImpactTerrain2026KpiMethod = {
  key: ImpactTerrain2026KpiKey;
  label: ImpactTerrain2026LocalizedText;
  semantics: {
    terrainData: ImpactTerrain2026LocalizedText;
    aggregation: ImpactTerrain2026LocalizedText;
    result: ImpactTerrain2026LocalizedText;
    pedagogicalConversion: ImpactTerrain2026LocalizedText;
  };
  formula: ImpactTerrain2026LocalizedText;
  assumptions: readonly ImpactTerrain2026LocalizedText[];
  references: readonly ImpactTerrain2026LocalizedText[];
  limits: readonly ImpactTerrain2026LocalizedText[];
};

export type ImpactTerrain2026Methodology = {
  version: string;
  scope: ImpactTerrain2026LocalizedText;
  semanticLayers: readonly ImpactTerrain2026LocalizedText[];
  kpis: readonly ImpactTerrain2026KpiMethod[];
};

const text = (
  fr: string,
  en: string,
): ImpactTerrain2026LocalizedText => ({ fr, en });

const IMPACT_TERRAIN_2026_SEMANTIC_LAYERS = [
  text(
    "Donnée terrain mesurée ou déclarée",
    "Measured or declared field data",
  ),
  text("Agrégat", "Aggregate"),
  text("Proxy d’impact", "Impact proxy"),
  text("Conversion pédagogique", "Pedagogical conversion"),
  text("Référence méthodologique", "Methodological reference"),
] as const;

export function buildImpactTerrain2026Methodology(): ImpactTerrain2026Methodology {
  const { factors, sources, version } = IMPACT_PROXY_CONFIG;

  return {
    version,
    scope: text(
      "Actions approuvées et visibles, après application du périmètre public de la surface qui consomme l’agrégat.",
      "Approved and visible actions after applying the public surface scope used by the aggregate.",
    ),
    semanticLayers: IMPACT_TERRAIN_2026_SEMANTIC_LAYERS,
    kpis: [
      {
        key: "wasteKg",
        label: text("Déchets récoltés", "Collected waste"),
        semantics: {
          terrainData: text(
            "Poids déclaré, poids de mégots détaillé, ou nombre de mégots utilisé comme signal de secours.",
            "Declared weight, detailed cigarette-butt weight, or cigarette-butt count used as a fallback signal.",
          ),
          aggregation: text(
            "Pour chaque action, on retient la masse la plus élevée disponible, puis on additionne les actions éligibles.",
            "For each action, the highest available mass is retained, then eligible actions are summed.",
          ),
          result: text(
            "Résultat terrain agrégé en kilogrammes ; il ne prétend pas mesurer les déchets non déclarés.",
            "Aggregated field result in kilograms; it does not claim to measure undeclared waste.",
          ),
          pedagogicalConversion: text(
            `Repères de lecture : 1 sac de 50 L indicatif = ${WASTE_KG_PER_50L_BAG} kg ; 1 Vélib' mécanique indicatif = ${WASTE_KG_PER_MECHANICAL_BICYCLE} kg.`,
            `Reading aids: 1 indicative 50 L bag = ${WASTE_KG_PER_50L_BAG} kg; 1 indicative mechanical Vélib' = ${WASTE_KG_PER_MECHANICAL_BICYCLE} kg.`,
          ),
        },
        formula: text(
          `masse(cigaretteButts, état) = cigaretteButts / (${BUTTS_PER_KG_REFERENCE} × facteur_état) ; wasteKg_action = max(0, wasteKg_declare, wasteBreakdown.megotsKg, masse(cigaretteButts, megotsCondition)) ; total = somme(wasteKg_action)`,
          `mass(cigaretteButts, condition) = cigaretteButts / (${BUTTS_PER_KG_REFERENCE} × condition_factor); wasteKg_action = max(0, declared_wasteKg, wasteBreakdown.megotsKg, mass(cigaretteButts, megotsCondition)); total = sum(wasteKg_action)`,
        ),
        assumptions: [
          text(
            `La conversion de secours utilise ${BUTTS_PER_KG_REFERENCE} mégots par kilogramme, ajustée par l’état lorsqu’il est qualifié.`,
            `The fallback conversion uses ${BUTTS_PER_KG_REFERENCE} cigarette butts per kilogram, adjusted by the condition when qualified.`,
          ),
          text(
            "Les valeurs négatives ou non exploitables sont ramenées à zéro.",
            "Negative or unusable values are clamped to zero.",
          ),
        ],
        references: [
          text(
            "Contrat d’action et calculateur runtime CleanMyMap.",
            "CleanMyMap action contract and runtime calculator.",
          ),
          text(
            "Référence de conversion mégots → masse du domaine Impact terrain 2026.",
            "Cigarette-butt-to-mass conversion reference from the Impact terrain 2026 domain.",
          ),
        ],
        limits: [
          text(
            "Un poids déclaré reste une déclaration terrain ; le proxy mégots ne transforme pas une estimation en pesée.",
            "A declared weight remains field-reported; the cigarette-butt proxy does not turn an estimate into a weighing.",
          ),
        ],
      },
      {
        key: "butts",
        label: text("Mégots retirés", "Cigarette butts removed"),
        semantics: {
          terrainData: text(
            "Nombre de mégots déclaré ou enregistré dans l’action.",
            "Cigarette-butt count declared or recorded in the action.",
          ),
          aggregation: text(
            "Somme des nombres de mégots non négatifs sur les actions éligibles.",
            "Sum of non-negative cigarette-butt counts across eligible actions.",
          ),
          result: text(
            "Résultat terrain agrégé en unités ; ce KPI ne déduit pas un nombre à partir du poids.",
            "Aggregated field result in units; this KPI does not infer a count from weight.",
          ),
          pedagogicalConversion: text(
            `Repères de lecture indicatifs : ${BUTT_LENGTH_METERS * 100} cm par mégot pour la longueur mise bout à bout ; la masse provient du calcul qualifié lorsqu’un état est disponible.`,
            `Indicative reading aids: ${BUTT_LENGTH_METERS * 100} cm per butt for end-to-end length; mass comes from the qualified calculation when a condition is available.`,
          ),
        },
        formula: text(
          `butts_action = max(0, cigaretteButts) ; distance_m = butts_total × ${BUTT_LENGTH_METERS} ; masse_qualifiee = somme(cigaretteButts_condition / (${BUTTS_PER_KG_REFERENCE} × facteur_etat))`,
          `butts_action = max(0, cigaretteButts); distance_m = total_butts × ${BUTT_LENGTH_METERS}; qualified_mass = sum(condition_butts / (${BUTTS_PER_KG_REFERENCE} × condition_factor))`,
        ),
        assumptions: [
          text(
            "Le compteur est traité comme une déclaration ou observation d’action, pas comme une mesure instrumentale universelle.",
            "The count is treated as an action report or observation, not as a universal instrument measurement.",
          ),
        ],
        references: [
          text(
            "Champ cigaretteButts du contrat d’action.",
            "cigaretteButts field in the action contract.",
          ),
          text(
            "Configuration runtime Impact terrain 2026.",
            "Impact terrain 2026 runtime configuration.",
          ),
        ],
        limits: [
          text(
            "La répartition qualifiée ne comprend que les mégots dont l’état est réellement disponible ; les autres restent non qualifiés.",
            "The qualified distribution only includes butts whose condition is actually available; the others remain unqualified.",
          ),
        ],
      },
      {
        key: "volunteers",
        label: text("Bénévoles mobilisés", "Volunteers mobilized"),
        semantics: {
          terrainData: text(
            "Nombre de participants déclaré dans chaque action via volunteersCount.",
            "Number of participants declared for each action through volunteersCount.",
          ),
          aggregation: text(
            "participantsTotal = somme(volunteersCount) sur les actions éligibles ; chaque action de répartition compte une seule fois.",
            "participantsTotal = sum(volunteersCount) across eligible actions; each distribution action is counted once.",
          ),
          result: text(
            "Agrégat de mobilisation. Le type d’organisateur sépare les structures ; une action spontanée est classée d’après son nombre de participants.",
            "Mobilization aggregate. Organizer type separates structures; a spontaneous action is classified from its participant count.",
          ),
          pedagogicalConversion: text(
            "La répartition peut présenter Solo, Duo, Trio, Quatuor, Quintet, Sextet, etc., sans plafond artificiel.",
            "The distribution can present Solo, Duo, Trio, Quatuor, Quintet, Sextet, etc., with no artificial cap.",
          ),
        },
        formula: text(
          "participantsTotal = somme(max(0, volunteersCount)) ; actionDistribution = une catégorie par action selon organizerType",
          "participantsTotal = sum(max(0, volunteersCount)); actionDistribution = one category per action from organizerType",
        ),
        assumptions: [
          text(
            "Une donnée legacy sans type exploitable tombe dans Autres avec un warning administratif, sans inférer depuis le nom de l’organisateur.",
            "Legacy data without an exploitable type falls into Autres with an administrative warning; no organizer-name inference is made.",
          ),
        ],
        references: [
          text(
            "Agrégat public load_public_landing_action_summary et référentiel canonique Organisateur.",
            "Public load_public_landing_action_summary aggregate and canonical Organizer directory.",
          ),
        ],
        limits: [
          text(
            "participantsTotal n’est pas une mesure de personnes uniques sur plusieurs actions.",
            "participantsTotal is not a measure of unique people across multiple actions.",
          ),
        ],
      },
      {
        key: "co2",
        label: text("CO₂ évité", "CO₂ avoided"),
        semantics: {
          terrainData: text(
            "Masse de déchets retenue par les actions éligibles ; le CO₂ n’est pas mesuré directement sur le terrain.",
            "Waste mass retained by eligible actions; CO₂ is not directly measured in the field.",
          ),
          aggregation: text(
            "L’agrégat de masse est transmis au calculateur avant application du facteur CO₂e.",
            "The waste-mass aggregate is passed to the calculator before applying the CO₂e factor.",
          ),
          result: text(
            "Proxy d’impact exprimé en kilogrammes de CO₂e évités, à lire comme un ordre de grandeur reproductible.",
            "Impact proxy expressed as kilograms of avoided CO₂e, to be read as a reproducible order of magnitude.",
          ),
          pedagogicalConversion: text(
            `Conversions pédagogiques : CO₂_g = CO₂e_kg × 1 000 ; km voiture = CO₂_g / ${CO2_GRAMS_PER_CAR_KILOMETER} ; part Paris–New York = CO₂_g / ${CO2_GRAMS_PER_PARIS_NEW_YORK_FLIGHT} ; part Paris–Moscou en voiture = CO₂_g / (${PARIS_MOSCOW_ROAD_DISTANCE_KM} × ${CO2_GRAMS_PER_CAR_KILOMETER}). Ces équivalences ne constituent pas une mesure d’émissions évitées.`,
            `Pedagogical conversions: CO₂_g = CO₂e_kg × 1,000; car km = CO₂_g / ${CO2_GRAMS_PER_CAR_KILOMETER}; Paris–New York flight share = CO₂_g / ${CO2_GRAMS_PER_PARIS_NEW_YORK_FLIGHT}; Paris–Moscow car-trip share = CO₂_g / (${PARIS_MOSCOW_ROAD_DISTANCE_KM} × ${CO2_GRAMS_PER_CAR_KILOMETER}). These equivalents are not a measurement of avoided emissions.`,
          ),
        },
        formula: text(
          `CO₂e_kg = totalWasteKg × ${factors.co2KgPerWasteKg} ; CO₂_g = CO₂e_kg × 1 000 ; km_voiture = CO₂_g / ${CO2_GRAMS_PER_CAR_KILOMETER} ; part_vol_Paris_NY = CO₂_g / ${CO2_GRAMS_PER_PARIS_NEW_YORK_FLIGHT} ; part_Paris_Moscou_voiture = CO₂_g / (${PARIS_MOSCOW_ROAD_DISTANCE_KM} × ${CO2_GRAMS_PER_CAR_KILOMETER})`,
          `CO₂e_kg = totalWasteKg × ${factors.co2KgPerWasteKg}; CO₂_g = CO₂e_kg × 1,000; car_km = CO₂_g / ${CO2_GRAMS_PER_CAR_KILOMETER}; Paris_NY_flight_share = CO₂_g / ${CO2_GRAMS_PER_PARIS_NEW_YORK_FLIGHT}; Paris_Moscow_car_trip_share = CO₂_g / (${PARIS_MOSCOW_ROAD_DISTANCE_KM} × ${CO2_GRAMS_PER_CAR_KILOMETER})`,
        ),
        assumptions: [
          text(
            "Le facteur représente un proxy moyen de mix de déchets ; il ne décrit pas la composition exacte de chaque collecte.",
            "The factor is an average waste-mix proxy; it does not describe the exact composition of each collection.",
          ),
        ],
        references: [
          text(sources.co2, sources.co2),
          text(
            `Références de conversion : ${CO2_GRAMS_PER_CAR_KILOMETER} g CO₂e/km ; ${CO2_GRAMS_PER_PARIS_NEW_YORK_FLIGHT.toLocaleString("fr-FR")} g CO₂e pour une part de vol Paris–New York ; ${PARIS_MOSCOW_ROAD_DISTANCE_KM.toLocaleString("fr-FR")} km par route pour Paris–Moscou.`,
            `Conversion references: ${CO2_GRAMS_PER_CAR_KILOMETER} g CO₂e/km; ${CO2_GRAMS_PER_PARIS_NEW_YORK_FLIGHT.toLocaleString("en-US")} g CO₂e for a Paris–New York flight share; ${PARIS_MOSCOW_ROAD_DISTANCE_KM.toLocaleString("en-US")} road km for Paris–Moscow.`,
          ),
          text(`Version runtime : ${version}.`, `Runtime version: ${version}.`),
        ],
        limits: [
          text(
            "Le résultat n’est ni une mesure instrumentale, ni une certification carbone, ni une preuve d’émissions évitées au sens réglementaire.",
            "The result is neither an instrument measurement, a carbon certification, nor regulatory proof of avoided emissions.",
          ),
        ],
      },
      {
        key: "water",
        label: text("Eau préservée", "Water preserved"),
        semantics: {
          terrainData: text(
            "Nombre de mégots retirés par les actions éligibles ; l’eau n’est pas mesurée directement.",
            "Number of cigarette butts removed by eligible actions; water is not directly measured.",
          ),
          aggregation: text(
            "L’agrégat de mégots est multiplié par le facteur de risque hydrique configuré.",
            "The cigarette-butt aggregate is multiplied by the configured water-risk factor.",
          ),
          result: text(
            "Proxy exprimé en litres potentiellement préservés, et non volume d’eau effectivement traité.",
            "Proxy expressed as potentially preserved liters, not as a volume of water actually treated.",
          ),
          pedagogicalConversion: text(
            `Conversions pédagogiques : piscines = eau_L / ${OLYMPIC_POOL_LITERS.toLocaleString("fr-FR")} ; années de consommation = eau_L / ${FRENCH_PERSON_ANNUAL_WATER_LITERS.toLocaleString("fr-FR")}. Il s’agit d’un proxy de potentiel, pas d’une mesure directe.`,
            `Pedagogical conversions: pools = water_L / ${OLYMPIC_POOL_LITERS.toLocaleString("en-US")}; consumption years = water_L / ${FRENCH_PERSON_ANNUAL_WATER_LITERS.toLocaleString("en-US")}. This is a potential proxy, not a direct measurement.`,
          ),
        },
        formula: text(
          `eau_L = totalButts × ${factors.waterLitersPerCigaretteButt} ; piscines = eau_L / ${OLYMPIC_POOL_LITERS} ; années = eau_L / ${FRENCH_PERSON_ANNUAL_WATER_LITERS}`,
          `water_L = totalButts × ${factors.waterLitersPerCigaretteButt}; pools = water_L / ${OLYMPIC_POOL_LITERS}; years = water_L / ${FRENCH_PERSON_ANNUAL_WATER_LITERS}`,
        ),
        assumptions: [
          text(
            "Le facteur est un proxy de pollution potentielle par mégot et non une mesure locale de lixiviation.",
            "The factor is a potential-cigarette-butt-pollution proxy, not a local leaching measurement.",
          ),
        ],
        references: [
          text(sources.water, sources.water),
          text(
            `Références de conversion : ${WATER_LITERS_PER_CIGARETTE_BUTT} L par mégot ; ${OLYMPIC_POOL_LITERS.toLocaleString("fr-FR")} L pour une piscine olympique ; ${FRENCH_PERSON_ANNUAL_WATER_LITERS.toLocaleString("fr-FR")} L/an/personne.`,
            `Conversion references: ${WATER_LITERS_PER_CIGARETTE_BUTT} L per cigarette butt; ${OLYMPIC_POOL_LITERS.toLocaleString("en-US")} L for an Olympic pool; ${FRENCH_PERSON_ANNUAL_WATER_LITERS.toLocaleString("en-US")} L/person/year.`,
          ),
          text(`Version runtime : ${version}.`, `Runtime version: ${version}.`),
        ],
        limits: [
          text(
            "Le résultat ne permet pas d’affirmer qu’un volume équivalent d’eau a été dépollué ou économisé.",
            "The result does not establish that an equivalent volume of water was cleaned or saved.",
          ),
        ],
      },
      {
        key: "euro",
        label: text("Économie de voirie", "Road-service savings"),
        semantics: {
          terrainData: text(
            "Masse de déchets retenue par les actions ; le coût réel d’une intervention de voirie n’est pas observé dans le contrat d’action.",
            "Waste mass retained by actions; the actual cost of a road-service intervention is not observed in the action contract.",
          ),
          aggregation: text(
            "Le calcul runtime actuel agrège la masse puis applique le facteur euro par kilogramme.",
            "The current runtime calculation aggregates waste mass and applies the euro-per-kilogram factor.",
          ),
          result: text(
            "Proxy économique indicatif, pas facture évitée ni économie budgétaire constatée.",
            "Indicative economic proxy, not an avoided invoice or an observed budget saving.",
          ),
          pedagogicalConversion: text(
            "La durée totale des actions est agrégée séparément pour les évolutions futures ; elle ne remplace pas la formule runtime actuelle dans ce lot.",
            "Total action duration is aggregated separately for future iterations; it does not replace the current runtime formula in this lot.",
          ),
        },
        formula: text(
          `economie_voirie_EUR = totalWasteKg × ${factors.euroSavedPerWasteKg}`,
          `road_service_savings_EUR = totalWasteKg × ${factors.euroSavedPerWasteKg}`,
        ),
        assumptions: [
          text(
            "Le facteur représente une moyenne opérationnelle configurée, indépendante du tarif réel de chaque collectivité.",
            "The factor is a configured operational average, independent of each municipality's actual rate.",
          ),
        ],
        references: [
          text(sources.roi, sources.roi),
          text(
            "totalDurationMinutes est un agrégat canonique distinct ; aucune personne-heure n’est calculée ici.",
            "totalDurationMinutes is a separate canonical aggregate; no person-hours are calculated here.",
          ),
        ],
        limits: [
          text(
            "Le proxy ne constitue pas une valorisation contractuelle, comptable ou réglementaire du travail bénévole.",
            "The proxy is not a contractual, accounting, or regulatory valuation of volunteer work.",
          ),
        ],
      },
    ],
  };
}
