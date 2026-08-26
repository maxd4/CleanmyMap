import type { MethodDefinition } from "./overview.types";
import { buildActionImpactMethodology } from "@/lib/actions/impact-calculators";

const OVERVIEW_RECALC_DESCRIPTION =
  "Déclenché lors du rafraîchissement de l'overview. Fraîcheur/cache : cache serveur jusqu'à 10 min pour la vue reports/pilotage.";

export function buildMethods(): MethodDefinition[] {
  const impact = buildActionImpactMethodology();
  return [
    {
      id: "impact-volume",
      kpi: "Impact terrain (kg)",
      formula: `Somme de ${impact.formulas.wasteKg} sur les actions approuvees du perimetre de la fenetre.`,
      source: `Calcul canonique ${impact.version}. Valeur declaree puis estimation de secours; sources proxy: ${impact.sources.co2}`,
      recalc: OVERVIEW_RECALC_DESCRIPTION,
      limits: "Valeur declarative ou estimee selon les donnees disponibles; ce n'est pas une mesure instrumentale.",
    },
    {
      id: "mobilization",
      kpi: "Mobilisation",
      formula: `Somme de ${impact.formulas.volunteers} sur les actions approuvees du perimetre de la fenetre.`,
      source: "Champs volunteersCount des declarations valides.",
      recalc: OVERVIEW_RECALC_DESCRIPTION,
      limits: "Mesure declarative, sensible aux oublis de saisie.",
    },
    {
      id: "field-load",
      kpi: "Charge terrain",
      formula: "Somme de volunteersCount x durationMinutes sur actions approuvees.",
      source: "Champs volunteersCount et durationMinutes des declarations valides.",
      recalc: OVERVIEW_RECALC_DESCRIPTION,
      limits: "Mesure d'intensite utile, mais pas une duree d'intervention reelle.",
    },
    {
      id: "place-context",
      kpi: "Contexte lieu",
      formula: "Taux de placeType renseigne et repartition des formats declares par type de lieu.",
      source: "Champ placeType des actions valides.",
      recalc: OVERVIEW_RECALC_DESCRIPTION,
      limits: "Depend du niveau de precision de la saisie terrain.",
    },
    {
      id: "route-profile",
      kpi: "Profil trajet",
      formula: "Part des actions avec routeStyle et routeAdjustmentMessage renseignes.",
      source: "Champs routeStyle et routeAdjustmentMessage des actions valides.",
      recalc: OVERVIEW_RECALC_DESCRIPTION,
      limits: "Le profil décrit l'intention declarative, pas le parcours GPS final.",
    },
    {
      id: "quality-score",
      kpi: "Qualite data",
      formula:
        "Moyenne des scores de qualité exprimés en % (completude, coherence, geoloc, trace, fraicheur).",
      source: "Moteur evaluateActionQuality centralise.",
      recalc: OVERVIEW_RECALC_DESCRIPTION,
      limits: "Score d'aide a la decision, pas un audit exhaustif.",
    },
    {
      id: "coverage",
      kpi: "Geo-couverture",
      formula: "(actions geolocalisees valides / actions approuvees) x 100.",
      source: "Latitude/longitude dans la source unifiee.",
      recalc: OVERVIEW_RECALC_DESCRIPTION,
      limits:
        "Coordonnees valides sans trace detaillee peuvent surestimer la couverture.",
    },
    {
      id: "moderation-delay",
      kpi: "Delai moderation",
      formula: "Mediane age (jours) des actions pending.",
      source: "createdAt/importedAt des enregistrements pending.",
      recalc: OVERVIEW_RECALC_DESCRIPTION,
      limits: "Sensibles aux reprises batch et imports historiques.",
    },
  ];
}
