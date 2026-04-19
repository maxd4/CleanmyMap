import type { MethodDefinition } from "./overview-types";

export function buildMethods(): MethodDefinition[] {
  return [
    {
      id: "impact-volume",
      kpi: "Impact terrain (kg)",
      formula: "Somme des wasteKg sur actions approuvees de la fenetre.",
      source: "Unified actions (actions + spots normalises).",
      recalc: "A chaque chargement de page / API.",
      limits: "Depend de la qualite de saisie sur le poids collecte.",
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
