import type { MethodDefinition } from "./overview.types";

export function buildMethods(): MethodDefinition[] {
  return [
    {
      id: "impact-volume",
      kpi: "Impact terrain (kg)",
      formula: "Somme des wasteKg sur actions approuvées (validées QC).",
      source: "Proxys scientifiques CleanMyMap-v1 basés sur ADEME/Ocean Conservancy. Voir page Méthodologie.",
      recalc: "Temps réel.",
      limits: "Incertitude liée à l'estimation déclarative (marge +/- 30%).",
    },
    {
      id: "mobilization",
      kpi: "Mobilisation",
      formula: "Somme des volunteersCount sur actions approuvees.",
      source: "Champs volunteersCount des declarations valides.",
      recalc: "A chaque chargement de page / API.",
      limits: "Mesure declarative, sensible aux oublis de saisie.",
    },
    {
      id: "field-load",
      kpi: "Charge terrain",
      formula: "Somme de volunteersCount x durationMinutes sur actions approuvees.",
      source: "Champs volunteersCount et durationMinutes des declarations valides.",
      recalc: "A chaque chargement de page / API.",
      limits: "Mesure d'intensite utile, mais pas une duree d'intervention reelle.",
    },
    {
      id: "place-context",
      kpi: "Contexte lieu",
      formula: "Taux de placeType renseigne et repartition des formats declares par type de lieu.",
      source: "Champ placeType des actions valides.",
      recalc: "A chaque chargement de page / API.",
      limits: "Depend du niveau de precision de la saisie terrain.",
    },
    {
      id: "route-profile",
      kpi: "Profil trajet",
      formula: "Part des actions avec routeStyle et routeAdjustmentMessage renseignes.",
      source: "Champs routeStyle et routeAdjustmentMessage des actions valides.",
      recalc: "A chaque chargement de page / API.",
      limits: "Le profil décrit l'intention declarative, pas le parcours GPS final.",
    },
    {
      id: "quality-score",
      kpi: "Qualite data",
      formula:
        "Moyenne des scores /100 (completude, coherence, geoloc, trace, fraicheur).",
      source: "Moteur evaluateActionQuality centralise.",
      recalc: "A chaque chargement de page / API.",
      limits: "Score d'aide a la decision, pas un audit exhaustif.",
    },
    {
      id: "coverage",
      kpi: "Geo-couverture",
      formula: "(actions geolocalisees valides / actions approuvees) x 100.",
      source: "Latitude/longitude dans la source unifiee.",
      recalc: "A chaque chargement de page / API.",
      limits:
        "Coordonnees valides sans trace detaillee peuvent surestimer la couverture.",
    },
    {
      id: "moderation-delay",
      kpi: "Delai moderation",
      formula: "Mediane age (jours) des actions pending.",
      source: "createdAt/importedAt des enregistrements pending.",
      recalc: "A chaque chargement de page / API.",
      limits: "Sensibles aux reprises batch et imports historiques.",
    },
  ];
}
