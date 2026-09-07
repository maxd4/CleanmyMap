import type { ImpactTerrain2026PublicResults } from "@/lib/impact/impact-terrain-2026-results";
import type { ImpactTerrain2026StreetCleaningSavings } from "@/lib/impact/impact-terrain-2026";

/**
 * Configuration et helpers pour la page d'accueil
 */

/**
 * Résultats déjà calculés dans le snapshot public de la homepage.
 * Les composants de présentation ne doivent pas reconstruire ces valeurs.
 */
export type HomeImpactSnapshot = Readonly<{
  impactTerrain: ImpactTerrain2026PublicResults;
  streetCleaningSavings: ImpactTerrain2026StreetCleaningSavings;
}>;

export interface HomeMetric {
  key: string;
  label: string;
  value: string;
  category: string;
  accent: 'blue' | 'emerald' | 'amber';
}

export type HomeIconName =
  | 'layout-dashboard'
  | 'zap'
  | 'map'
  | 'target'
  | 'network'
  | 'book-open'
  | 'map-pin'
  | 'bar-chart-3'
  | 'users'
  | 'file-text'
  | 'shield';

export interface HomeBenefit {
  iconName: HomeIconName;
  title: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
}

export interface HomeCounters {
  wasteKg: number;
  butts: number;
  volunteers: number;
  co2AvoidedKg: number;
  waterSavedLiters: number;
  euroSaved: number;
}

/**
 * Génère les métriques d'impact pour la page d'accueil
 */
export function buildHomeMetrics(
  counters: HomeCounters,
  hasData: boolean
): HomeMetric[] {
  return [
    {
      key: 'wasteKg',
      label: 'Déchets récoltés',
      value: hasData
        ? `${counters.wasteKg.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`
        : 'n/a',
      category: 'Résultat',
      accent: 'blue' as const,
    },
    {
      key: 'butts',
      label: 'Mégots retirés',
      value: hasData ? `${counters.butts.toLocaleString('fr-FR')}` : 'n/a',
      category: 'Résultat',
      accent: 'blue' as const,
    },
    {
      key: 'volunteers',
      label: 'Bénévoles mobilisés',
      value: hasData
        ? `${counters.volunteers.toLocaleString('fr-FR')}`
        : 'n/a',
      category: 'Résultat',
      accent: 'blue' as const,
    },
    {
      key: 'co2',
      label: 'CO₂ évité',
      value: hasData
        ? `${counters.co2AvoidedKg.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`
        : 'n/a',
      category: 'Équivalent',
      accent: 'emerald' as const,
    },
    {
      key: 'water',
      label: 'Eau préservée',
      value: hasData
        ? `${counters.waterSavedLiters.toLocaleString('fr-FR')} L`
        : 'n/a',
      category: 'Équivalent',
      accent: 'emerald' as const,
    },
    {
      key: 'euro',
      label: 'Économie de voirie',
      value: hasData ? `${counters.euroSaved.toLocaleString('fr-FR')} €` : 'n/a',
      category: 'Économique',
      accent: 'amber' as const,
    },
  ];
}

/**
 * Configuration des bénéfices de la plateforme
 */
export const HOME_BENEFITS: HomeBenefit[] = [
  {
    iconName: 'map-pin',
    title: 'Centralisation terrain',
    desc: 'Lieux, dates, volumes et participants regroupés. Fini les tableurs éparpillés.',
    color: 'text-emerald-950',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200/80',
  },
  {
    iconName: 'map',
    title: 'Carte partagée',
    desc: 'Repérez les zones nettoyées et les points prioritaires en un coup d\'œil.',
    color: 'text-emerald-950',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200/80',
  },
  {
    iconName: 'bar-chart-3',
    title: 'Impact réel',
    desc: 'Indicateurs automatisés : kg collectés, mégots, CO2 évité et eau préservée.',
    color: 'text-emerald-950',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200/80',
  },
  {
    iconName: 'users',
    title: 'Réseau local',
    desc: 'Coordonnez vos actions avec les associations et les partenaires de quartier.',
    color: 'text-emerald-950',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200/80',
  },
  {
    iconName: 'file-text',
    title: 'Rapports RSE',
    desc: "Générez des dossiers d'impact certifiés pour vos subventions et bilans annuels.",
    color: 'text-emerald-950',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200/80',
  },
  {
    iconName: 'shield',
    title: 'Données certifiées',
    desc: "Méthodologie transparente et chiffres sourcés pour crédibiliser votre engagement.",
    color: 'text-emerald-950',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200/80',
  },
];
