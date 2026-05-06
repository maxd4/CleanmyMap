/**
 * Configuration et helpers pour la page d'accueil
 */

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

export interface HomePillar {
  iconName: HomeIconName;
  title: string;
  preview: {
    mobile: string[];
    desktop: string[];
  };
  iconBg: string;
  iconColor: string;
  accent: string;
  ring: string;
  dot: string;
  href: string;
}

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

type HomeSpaceId =
  | "home"
  | "act"
  | "visualize"
  | "impact"
  | "network"
  | "learn"
  | "pilot";

type HomePillarDraft = HomePillar & {
  spaceId: HomeSpaceId;
};

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
      value: hasData ? `${counters.wasteKg.toFixed(1)} kg` : 'n/a',
      category: 'Résultat',
      accent: 'blue' as const,
    },
    {
      key: 'butts',
      label: 'Mégots retirés',
      value: hasData ? `${counters.butts.toLocaleString()}` : 'n/a',
      category: 'Résultat',
      accent: 'blue' as const,
    },
    {
      key: 'volunteers',
      label: 'Bénévoles mobilisés',
      value: hasData
        ? `${counters.volunteers.toLocaleString()}`
        : 'n/a',
      category: 'Résultat',
      accent: 'blue' as const,
    },
    {
      key: 'co2',
      label: 'CO₂e évité',
      value: hasData ? `${counters.co2AvoidedKg.toFixed(1)} kg` : 'n/a',
      category: 'Équivalent',
      accent: 'emerald' as const,
    },
    {
      key: 'water',
      label: 'Eau préservée',
      value: hasData
        ? `${counters.waterSavedLiters.toLocaleString()} L`
        : 'n/a',
      category: 'Équivalent',
      accent: 'emerald' as const,
    },
    {
      key: 'euro',
      label: 'Économie de voirie',
      value: hasData ? `${counters.euroSaved.toLocaleString()} €` : 'n/a',
      category: 'Économique',
      accent: 'amber' as const,
    },
  ];
}

/**
 * Configuration des piliers de la plateforme
 */
export function buildHomePillars(
  getSpacePreview: (spaceId: HomeSpaceId) => { mobile: string[]; desktop: string[] },
  isSpaceVisible: (spaceId: HomeSpaceId) => boolean = () => true,
): HomePillar[] {
  const pillars: HomePillarDraft[] = [
  {
      spaceId: "home",
      iconName: 'layout-dashboard',
      title: 'Accueil',
      preview: getSpacePreview('home'),
      iconBg: 'bg-[#F97316]/70',
      iconColor: 'text-white',
      accent: 'from-[#F97316]/35 to-[#FB923C]/12',
      ring: 'ring-[#FB923C]/28',
      dot: 'bg-[#F97316]',
      href: '/dashboard',
    },
    {
      spaceId: "act",
      iconName: 'zap',
      title: 'Agir',
      preview: getSpacePreview('act'),
      iconBg: 'bg-[#DC2626]/24',
      iconColor: 'text-white',
      accent: 'from-[#DC2626]/32 to-[#EF4444]/10',
      ring: 'ring-[#DC2626]/30',
      dot: 'bg-[#DC2626]',
      href: '/sections/route',
    },
    {
      spaceId: "visualize",
      iconName: 'map',
      title: 'Visualiser',
      preview: getSpacePreview('visualize'),
      iconBg: 'bg-[#27C3D9]/18',
      iconColor: 'text-white',
      accent: 'from-[#18B68F]/28 to-[#27C3D9]/10',
      ring: 'ring-[#27C3D9]/26',
      dot: 'bg-[#27C3D9]',
      href: '/actions/map',
    },
    {
      spaceId: "learn",
      iconName: 'book-open',
      title: 'Apprendre',
      preview: getSpacePreview('learn'),
      iconBg: 'bg-[#4E9A51]/22',
      iconColor: 'text-white',
      accent: 'from-[#4E9A51]/30 to-[#18B68F]/10',
      ring: 'ring-[#4E9A51]/30',
      dot: 'bg-[#4E9A51]',
      href: '/learn/hub',
    },
    {
      spaceId: "impact",
      iconName: 'target',
      title: 'Impacter',
      preview: getSpacePreview('impact'),
      iconBg: 'bg-[#18B68F]/22',
      iconColor: 'text-white',
      accent: 'from-[#18B68F]/30 to-[#4E9A51]/10',
      ring: 'ring-[#18B68F]/30',
      dot: 'bg-[#18B68F]',
      href: '/reports',
    },
    {
      spaceId: "network",
      iconName: 'network',
      title: 'Discuter',
      preview: getSpacePreview('network'),
      iconBg: 'bg-[#E91E8C]/22',
      iconColor: 'text-white',
      accent: 'from-[#E91E8C]/30 to-[#18B68F]/10',
      ring: 'ring-[#E91E8C]/30',
      dot: 'bg-[#E91E8C]',
      href: '/partners/network',
    },
    {
      spaceId: "pilot",
      iconName: 'users',
      title: 'Piloter',
      preview: getSpacePreview('pilot'),
      iconBg: 'bg-[#3B82F6]/22',
      iconColor: 'text-white',
      accent: 'from-[#3B82F6]/30 to-[#20b97e]/10',
      ring: 'ring-[#3B82F6]/30',
      dot: 'bg-[#3B82F6]',
      href: '/pilotage',
    },
  ];

  return pillars
    .filter((pillar) => isSpaceVisible(pillar.spaceId))
    .map(({ spaceId, ...pillar }) => {
      void spaceId;
      return pillar;
    });
}

/**
 * Configuration des bénéfices de la plateforme
 */
export const HOME_BENEFITS: HomeBenefit[] = [
  {
    iconName: 'map-pin',
    title: 'Centralisation Terrain',
    desc: 'Lieux, dates, volumes et participants regroupés. Fini les tableurs éparpillés.',
    color: 'text-[#20b97e]',
    bg: 'bg-[#20b97e]/14',
    border: 'border-[#20b97e]/24',
  },
  {
    iconName: 'map',
    title: 'Carte Partagée',
    desc: 'Repérez les zones nettoyées et les points prioritaires en un coup d\'œil.',
    color: 'text-[#2c5f77]',
    bg: 'bg-[#2c5f77]/14',
    border: 'border-[#2c5f77]/24',
  },
  {
    iconName: 'bar-chart-3',
    title: 'Impact Réel',
    desc: 'Indicateurs automatisés : kg collectés, mégots, CO2 évité et eau préservée.',
    color: 'text-[#18B68F]',
    bg: 'bg-[#18B68F]/14',
    border: 'border-[#18B68F]/24',
  },
  {
    iconName: 'users',
    title: 'Réseau Local',
    desc: 'Coordonnez vos actions avec les associations et les partenaires de quartier.',
    color: 'text-[#5B5FCF]',
    bg: 'bg-[#5B5FCF]/14',
    border: 'border-[#5B5FCF]/24',
  },
  {
    iconName: 'file-text',
    title: 'Rapports RSE',
    desc: "Générez des dossiers d'impact certifiés pour vos subventions et bilans annuels.",
    color: 'text-[#4E9A51]',
    bg: 'bg-[#4E9A51]/14',
    border: 'border-[#4E9A51]/24',
  },
  {
    iconName: 'shield',
    title: 'Données Certifiées',
    desc: "Méthodologie transparente et chiffres sourcés pour crédibiliser votre engagement.",
    color: 'text-[#1f6a52]',
    bg: 'bg-[#1f6a52]/14',
    border: 'border-[#1f6a52]/24',
  },
];
