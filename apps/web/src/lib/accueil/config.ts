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
  backgroundImage: string;
  iconBg: string;
  iconColor: string;
  ring: string;
  border: string;
  text: string;
  mutedText: string;
  cta: string;
  itemHover: string;
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
  | "network"
  | "learn";

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
      title: 'Accueil & Pilotage',
      preview: getSpacePreview('home'),
      backgroundImage: "linear-gradient(135deg, #431407 0%, #7c2d12 52%, #a16207 100%)",
      iconBg: 'bg-orange-500',
      iconColor: 'text-white',
      ring: 'ring-orange-200/20',
      border: 'border-orange-200/18',
      text: 'text-orange-100',
      mutedText: 'cmm-text-card-copy',
      cta: 'border-white/14 bg-white/10 text-white hover:bg-white/16',
      itemHover: 'hover:border-white/12 hover:bg-white/8 hover:text-white',
      dot: 'bg-orange-300',
      href: '/dashboard',
    },
    {
      spaceId: "act",
      iconName: 'zap',
      title: 'Agir',
      preview: getSpacePreview('act'),
      backgroundImage: "linear-gradient(135deg, #06261c 0%, #0f3b2b 52%, #14532d 100%)",
      iconBg: 'bg-emerald-500',
      iconColor: 'text-white',
      ring: 'ring-emerald-200/20',
      border: 'border-emerald-200/18',
      text: 'text-emerald-100',
      mutedText: 'cmm-text-card-copy',
      cta: 'border-white/14 bg-white/10 text-white hover:bg-white/16',
      itemHover: 'hover:border-white/12 hover:bg-white/8 hover:text-white',
      dot: 'bg-emerald-300',
      href: '/sections/route',
    },
    {
      spaceId: "visualize",
      iconName: 'map',
      title: 'Cartographie & Impact',
      preview: getSpacePreview('visualize'),
      backgroundImage: "linear-gradient(135deg, #071827 0%, #0c2940 52%, #0f4c6e 100%)",
      iconBg: 'bg-sky-500',
      iconColor: 'text-white',
      ring: 'ring-sky-200/20',
      border: 'border-sky-200/18',
      text: 'text-sky-100',
      mutedText: 'cmm-text-card-copy',
      cta: 'border-white/14 bg-white/10 text-white hover:bg-white/16',
      itemHover: 'hover:border-white/12 hover:bg-white/8 hover:text-white',
      dot: 'bg-sky-300',
      href: '/actions/map',
    },
    {
      spaceId: "network",
      iconName: 'network',
      title: 'Réseau & Discussions',
      preview: getSpacePreview('network'),
      backgroundImage: "linear-gradient(135deg, #04020f 0%, #120824 52%, #312e81 100%)",
      iconBg: 'bg-indigo-500',
      iconColor: 'text-white',
      ring: 'ring-indigo-200/20',
      border: 'border-indigo-200/18',
      text: 'text-indigo-100',
      mutedText: 'cmm-text-card-copy',
      cta: 'border-white/14 bg-white/10 text-white hover:bg-white/16',
      itemHover: 'hover:border-white/12 hover:bg-white/8 hover:text-white',
      dot: 'bg-indigo-300',
      href: '/partners/network',
    },
    {
      spaceId: "learn",
      iconName: 'book-open',
      title: 'Apprendre',
      preview: getSpacePreview('learn'),
      backgroundImage: "linear-gradient(135deg, #241f00 0%, #4a3207 52%, #713f12 100%)",
      iconBg: 'bg-yellow-500',
      iconColor: 'text-white',
      ring: 'ring-yellow-200/20',
      border: 'border-yellow-200/18',
      text: 'text-yellow-100',
      mutedText: 'cmm-text-card-copy',
      cta: 'border-white/14 bg-white/10 text-white hover:bg-white/16',
      itemHover: 'hover:border-white/12 hover:bg-white/8 hover:text-white',
      dot: 'bg-yellow-300',
      href: '/learn/hub',
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
    title: 'Centralisation terrain',
    desc: 'Lieux, dates, volumes et participants regroupés. Fini les tableurs éparpillés.',
    color: 'text-[#dcfce7]',
    bg: 'bg-[#4ade80]/14',
    border: 'border-[#86efac]/24',
  },
  {
    iconName: 'map',
    title: 'Carte partagée',
    desc: 'Repérez les zones nettoyées et les points prioritaires en un coup d\'œil.',
    color: 'text-[#d9f99d]',
    bg: 'bg-[#84cc16]/14',
    border: 'border-[#bef264]/24',
  },
  {
    iconName: 'bar-chart-3',
    title: 'Impact réel',
    desc: 'Indicateurs automatisés : kg collectés, mégots, CO2 évité et eau préservée.',
    color: 'text-[#ccfbf1]',
    bg: 'bg-[#2dd4bf]/14',
    border: 'border-[#99f6e4]/24',
  },
  {
    iconName: 'users',
    title: 'Réseau local',
    desc: 'Coordonnez vos actions avec les associations et les partenaires de quartier.',
    color: 'text-[#dcfce7]',
    bg: 'bg-[#16a34a]/14',
    border: 'border-[#86efac]/24',
  },
  {
    iconName: 'file-text',
    title: 'Rapports RSE',
    desc: "Générez des dossiers d'impact certifiés pour vos subventions et bilans annuels.",
    color: 'text-[#f7fee7]',
    bg: 'bg-[#65a30d]/14',
    border: 'border-[#bef264]/24',
  },
  {
    iconName: 'shield',
    title: 'Données certifiées',
    desc: "Méthodologie transparente et chiffres sourcés pour crédibiliser votre engagement.",
    color: 'text-[#dcfce7]',
    bg: 'bg-[#15803d]/14',
    border: 'border-[#86efac]/24',
  },
];
