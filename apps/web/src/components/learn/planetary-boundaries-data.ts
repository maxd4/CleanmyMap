import { Cloud, Droplets, Factory, Leaf, Mountain, Thermometer, Users, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const PLANETARY_BOUNDARIES_REFERENCE = {
  year: 2026,
  checkedAt: "2026-11-25",
  label: "Planetary Health Check 2026",
  url: "https://www.planetaryhealthcheck.org/2026-planetary-health-check-launched-at-new-york-climate-week/",
  frameworkUrl: "https://www.planetaryhealthcheck.org/planetary-boundaries/",
} as const;

type Localized = { fr: string; en: string };
export type PlanetaryBoundary = {
  id: string;
  name: string;
  nameEn: string;
  icon: LucideIcon;
  status: "safe" | "transgressed";
  controlVariable: Localized;
  description: Localized;
  impacts: Localized[];
  solutions: Localized[];
};

// Categorical projection of the dated assessment: no fabricated comparable radii,
// current physical measurements, or numeric thresholds across unlike variables.
export const PLANETARY_BOUNDARIES: PlanetaryBoundary[] = [
  { id: "climate-change", name: "Climat", nameEn: "Climate", icon: Thermometer, status: "transgressed",
    controlVariable: { fr: "CO₂ atmosphérique et forçage radiatif", en: "Atmospheric CO₂ and radiative forcing" },
    description: { fr: "Le bilan énergétique du système Terre est modifié par les gaz à effet de serre. La limite planétaire n'est pas l'objectif de température de l'Accord de Paris.", en: "Greenhouse gases change Earth's energy balance. The planetary boundary is not the Paris Agreement temperature goal." },
    impacts: [{ fr: "Risques climatiques croissants", en: "Increasing climate risks" }], solutions: [{ fr: "Réduire les émissions de gaz à effet de serre", en: "Reduce greenhouse gas emissions" }] },
  { id: "biodiversity-loss", name: "Intégrité de la biosphère", nameEn: "Biosphere integrity", icon: Leaf, status: "transgressed",
    controlVariable: { fr: "Diversité génétique et fonctionnement de la biosphère", en: "Genetic diversity and biosphere functioning" },
    description: { fr: "La diversité et le fonctionnement du vivant contribuent à la stabilité des écosystèmes.", en: "Biodiversity and biosphere functioning contribute to ecosystem stability." },
    impacts: [{ fr: "Perte de résilience", en: "Loss of resilience" }], solutions: [{ fr: "Préserver et restaurer les habitats", en: "Protect and restore habitats" }] },
  { id: "biogeochemical-flows", name: "Azote et phosphore", nameEn: "Nitrogen and phosphorus", icon: Factory, status: "transgressed",
    controlVariable: { fr: "Flux d'azote et de phosphore", en: "Nitrogen and phosphorus flows" },
    description: { fr: "Les apports anthropiques de nutriments modifient les cycles biogéochimiques.", en: "Human nutrient inputs alter biogeochemical cycles." },
    impacts: [{ fr: "Eutrophisation des milieux aquatiques", en: "Eutrophication of aquatic systems" }], solutions: [{ fr: "Limiter les excès d'apports nutritifs", en: "Limit excess nutrient inputs" }] },
  { id: "land-system-change", name: "Occupation des sols", nameEn: "Land system change", icon: Mountain, status: "transgressed",
    controlVariable: { fr: "Couverture forestière par rapport à son état de référence", en: "Forest cover relative to its reference state" },
    description: { fr: "Les transformations d'usage des terres affectent les habitats, les cycles de l'eau et le climat.", en: "Land-use changes affect habitats, water cycles and climate." },
    impacts: [{ fr: "Fragmentation des habitats", en: "Habitat fragmentation" }], solutions: [{ fr: "Préserver les forêts et restaurer les milieux dégradés", en: "Protect forests and restore degraded ecosystems" }] },
  { id: "freshwater-change", name: "Eau douce", nameEn: "Freshwater change", icon: Droplets, status: "transgressed",
    controlVariable: { fr: "Débits des cours d'eau et humidité des sols (eau bleue et verte)", en: "Streamflow and soil moisture (blue and green water)" },
    description: { fr: "Le cadre distingue les modifications de l'eau de surface et de l'humidité des sols.", en: "The framework distinguishes changes in surface water and soil moisture." },
    impacts: [{ fr: "Perturbations des systèmes hydriques", en: "Disruption of water systems" }], solutions: [{ fr: "Gérer l'eau à l'échelle des bassins", en: "Manage water at basin scale" }] },
  { id: "ocean-acidification", name: "Acidification des océans", nameEn: "Ocean acidification", icon: Waves, status: "transgressed",
    controlVariable: { fr: "Saturation en aragonite des eaux de surface", en: "Surface-water aragonite saturation" },
    description: { fr: "Le CO₂ dissous modifie la chimie océanique. Cette limite a été évaluée comme franchie en 2025.", en: "Dissolved CO₂ alters ocean chemistry. This boundary was assessed as transgressed in 2025." },
    impacts: [{ fr: "Pressions sur certains organismes calcifiants", en: "Pressure on some calcifying organisms" }], solutions: [{ fr: "Réduire les émissions de CO₂", en: "Reduce CO₂ emissions" }] },
  { id: "atmospheric-aerosols", name: "Aérosols atmosphériques", nameEn: "Atmospheric aerosol loading", icon: Cloud, status: "safe",
    controlVariable: { fr: "Charge et distribution des aérosols atmosphériques", en: "Atmospheric aerosol loading and distribution" },
    description: { fr: "La limite globale n'est pas classée comme franchie ; cela n'exclut pas les risques sanitaires et dépassements régionaux.", en: "The global boundary is not classified as transgressed; regional exceedances and health risks remain possible." },
    impacts: [{ fr: "Perturbations climatiques et sanitaires régionales", en: "Regional climate and health impacts" }], solutions: [{ fr: "Réduire les émissions de particules et de leurs précurseurs", en: "Reduce particle and precursor emissions" }] },
  { id: "ozone-depletion", name: "Ozone stratosphérique", nameEn: "Stratospheric ozone", icon: Cloud, status: "safe",
    controlVariable: { fr: "Concentration d'ozone stratosphérique", en: "Stratospheric ozone concentration" },
    description: { fr: "L'ozone stratosphérique protège contre une partie du rayonnement ultraviolet. Le protocole de Montréal soutient sa restauration.", en: "Stratospheric ozone shields Earth from part of ultraviolet radiation. The Montreal Protocol supports its recovery." },
    impacts: [{ fr: "Exposition aux UV en cas d'appauvrissement", en: "UV exposure when depleted" }], solutions: [{ fr: "Maintenir les restrictions des substances appauvrissant l'ozone", en: "Maintain restrictions on ozone-depleting substances" }] },
  { id: "novel-entities", name: "Entités nouvelles", nameEn: "Novel entities", icon: Users, status: "transgressed",
    controlVariable: { fr: "Introduction d'entités nouvelles et évaluation de leur sécurité", en: "Introduction of novel entities and safety assessment" },
    description: { fr: "Les substances et matériaux introduits par l'activité humaine peuvent créer des pressions difficiles à caractériser ou à inverser.", en: "Human-introduced substances and materials can create pressures that are difficult to characterize or reverse." },
    impacts: [{ fr: "Accumulation de polluants persistants", en: "Accumulation of persistent pollutants" }], solutions: [{ fr: "Prévenir les émissions et évaluer la sécurité des substances", en: "Prevent releases and assess substance safety" }] },
];
