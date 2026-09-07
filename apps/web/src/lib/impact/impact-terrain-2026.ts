import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";

export const BUTTS_PER_KG_REFERENCE = 2_500;

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
            "Repères de lecture : 1 sac indicatif = 5 kg ; 1 vélo mécanique indicatif = 15 kg.",
            "Reading aids: 1 indicative bag = 5 kg; 1 indicative mechanical bicycle = 15 kg.",
          ),
        },
        formula: text(
          `wasteKg_action = max(0, wasteKg_declare, wasteBreakdown.megotsKg, cigaretteButts / ${BUTTS_PER_KG_REFERENCE}) ; total = somme(wasteKg_action)`,
          `wasteKg_action = max(0, declared_wasteKg, wasteBreakdown.megotsKg, cigaretteButts / ${BUTTS_PER_KG_REFERENCE}); total = sum(wasteKg_action)`,
        ),
        assumptions: [
          text(
            `La conversion de secours utilise ${BUTTS_PER_KG_REFERENCE} mégots par kilogramme.`,
            `The fallback conversion uses ${BUTTS_PER_KG_REFERENCE} cigarette butts per kilogram.`,
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
            "Repères de lecture indicatifs : longueur mise bout à bout et poids moyen d’un mégot.",
            "Indicative reading aids: end-to-end length and average cigarette-butt weight.",
          ),
        },
        formula: text(
          "butts_action = max(0, cigaretteButts) ; total = somme(butts_action)",
          "butts_action = max(0, cigaretteButts); total = sum(butts_action)",
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
            "Les conversions pédagogiques ne sont pas des mesures supplémentaires et ne modifient pas le compteur.",
            "Pedagogical conversions are not additional measurements and do not modify the count.",
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
            "Des équivalences de distance ou de trajet peuvent aider à lire le résultat ; elles ne constituent pas une mesure d’émissions évitées.",
            "Distance or trip equivalents may help read the result; they are not a measurement of avoided emissions.",
          ),
        },
        formula: text(
          `co2e_kg = totalWasteKg × ${factors.co2KgPerWasteKg}`,
          `co2e_kg = totalWasteKg × ${factors.co2KgPerWasteKg}`,
        ),
        assumptions: [
          text(
            "Le facteur représente un proxy moyen de mix de déchets ; il ne décrit pas la composition exacte de chaque collecte.",
            "The factor is an average waste-mix proxy; it does not describe the exact composition of each collection.",
          ),
        ],
        references: [
          text(sources.co2, sources.co2),
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
            "Les repères de piscine ou de consommation rendent l’ordre de grandeur lisible sans changer le résultat source.",
            "Pool or consumption references make the order of magnitude readable without changing the source result.",
          ),
        },
        formula: text(
          `eau_L = totalButts × ${factors.waterLitersPerCigaretteButt}`,
          `water_L = totalButts × ${factors.waterLitersPerCigaretteButt}`,
        ),
        assumptions: [
          text(
            "Le facteur est un proxy de pollution potentielle par mégot et non une mesure locale de lixiviation.",
            "The factor is a potential-cigarette-butt-pollution proxy, not a local leaching measurement.",
          ),
        ],
        references: [
          text(sources.water, sources.water),
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
