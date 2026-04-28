/**
 * Configuration et helpers pour la page d'accueil
 */

import {
  BookOpen,
  BarChart3,
  FileText,
  LayoutDashboard,
  MapPin,
  Network,
  Shield,
  Target,
  Users,
  Zap,
  Map as MapIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface HomeMetric {
  key: string;
  label: string;
  value: string;
  category: string;
  accent: 'blue' | 'emerald' | 'amber';
}

export interface HomePillar {
  icon: LucideIcon;
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
  icon: LucideIcon;
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
      value: hasData ? `${counters.wasteKg.toFixed(1)} kg` : 'n/a',
      category: 'Environnement',
      accent: 'blue' as const,
    },
    {
      key: 'co2',
      label: 'CO₂ évité',
      value: hasData ? `${counters.co2AvoidedKg.toFixed(1)} kg CO2` : 'n/a',
      category: 'Environnement',
      accent: 'blue' as const,
    },
    {
      key: 'water',
      label: 'Eau préservée',
      value: hasData
        ? `${counters.waterSavedLiters.toLocaleString()} L`
        : 'n/a',
      category: 'Environnement',
      accent: 'blue' as const,
    },
    {
      key: 'butts',
      label: 'Mégots retirés',
      value: hasData ? `${counters.butts.toLocaleString()} mégots` : 'n/a',
      category: 'Mobilisation',
      accent: 'emerald' as const,
    },
    {
      key: 'volunteers',
      label: 'Bénévoles mobilisés',
      value: hasData
        ? `${counters.volunteers.toLocaleString()} bénévoles`
        : 'n/a',
      category: 'Mobilisation',
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
  getSpacePreview: (spaceId: string) => { mobile: string[]; desktop: string[] }
): HomePillar[] {
  return [
    {
      icon: LayoutDashboard,
      title: 'Accueil',
      preview: getSpacePreview('home'),
      iconBg: 'bg-slate-700/60',
      iconColor: 'text-slate-200',
      accent: 'from-slate-700/30 to-slate-600/10',
      ring: 'ring-slate-600/40',
      dot: 'bg-slate-400',
      href: '/dashboard',
    },
    {
      icon: Zap,
      title: 'Agir',
      preview: getSpacePreview('act'),
      iconBg: 'bg-amber-900/50',
      iconColor: 'text-amber-300',
      accent: 'from-amber-900/30 to-amber-800/10',
      ring: 'ring-amber-700/40',
      dot: 'bg-amber-400',
      href: '/sections/route',
    },
    {
      icon: MapIcon,
      title: 'Visualiser',
      preview: getSpacePreview('visualize'),
      iconBg: 'bg-sky-900/50',
      iconColor: 'text-sky-300',
      accent: 'from-sky-900/30 to-sky-800/10',
      ring: 'ring-sky-700/40',
      dot: 'bg-sky-400',
      href: '/actions/map',
    },
    {
      icon: Target,
      title: 'Impact',
      preview: getSpacePreview('impact'),
      iconBg: 'bg-emerald-900/50',
      iconColor: 'text-emerald-300',
      accent: 'from-emerald-900/30 to-emerald-800/10',
      ring: 'ring-emerald-700/40',
      dot: 'bg-emerald-400',
      href: '/reports',
    },
    {
      icon: Network,
      title: 'Réseau',
      preview: getSpacePreview('network'),
      iconBg: 'bg-violet-900/50',
      iconColor: 'text-violet-300',
      accent: 'from-violet-900/30 to-violet-800/10',
      ring: 'ring-violet-700/40',
      dot: 'bg-violet-400',
      href: '/partners/network',
    },
    {
      icon: BookOpen,
      title: 'Apprendre',
      preview: getSpacePreview('learn'),
      iconBg: 'bg-rose-900/50',
      iconColor: 'text-rose-300',
      accent: 'from-rose-900/30 to-rose-800/10',
      ring: 'ring-rose-700/40',
      dot: 'bg-rose-400',
      href: '/learn/hub',
    },
    {
      icon: Target,
      title: 'Piloter',
      preview: getSpacePreview('pilot'),
      iconBg: 'bg-indigo-900/50',
      iconColor: 'text-indigo-300',
      accent: 'from-indigo-900/30 to-indigo-800/10',
      ring: 'ring-indigo-700/40',
      dot: 'bg-indigo-400',
      href: '/admin',
    },
  ];
}

/**
 * Configuration des bénéfices de la plateforme
 */
export const HOME_BENEFITS: HomeBenefit[] = [
  {
    icon: MapPin,
    title: 'Centralisez vos cleanwalks',
    desc: 'Toutes vos actions terrain en un seul endroit : dates, lieux, volumes, participants. Fini les tableurs éparpillés.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/20',
    border: 'border-cyan-900/40',
  },
  {
    icon: MapIcon,
    title: 'Visualisez sur une carte commune',
    desc: 'Chaque action apparaît sur une carte partagée avec la communauté. Repérez les zones couvertes et les zones prioritaires.',
    color: 'text-sky-400',
    bg: 'bg-sky-950/20',
    border: 'border-sky-900/40',
  },
  {
    icon: BarChart3,
    title: 'Suivez votre impact réel',
    desc: 'Déchets collectés, mégots retirés, bénévoles mobilisés, CO₂ évité : des indicateurs concrets calculés depuis vos données.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/20',
    border: 'border-emerald-900/40',
  },
  {
    icon: Users,
    title: 'Coordonnez les acteurs locaux',
    desc: 'Mettez en relation associations, bénévoles et partenaires locaux pour organiser des opérations collectives plus efficaces.',
    color: 'text-violet-400',
    bg: 'bg-violet-950/20',
    border: 'border-violet-900/40',
  },
  {
    icon: FileText,
    title: 'Produisez des rapports utiles',
    desc: "Générez des rapports d'impact pour votre RSE, vos dossiers de subvention, les collectivités et les élus locaux.",
    color: 'text-indigo-400',
    bg: 'bg-indigo-950/20',
    border: 'border-indigo-900/40',
  },
  {
    icon: Shield,
    title: 'Donnez de la crédibilité à vos actions',
    desc: "Chiffres sourcés, méthodologie transparente et données terrain vérifiables : renforcez la légitimité de votre engagement.",
    color: 'text-rose-400',
    bg: 'bg-rose-950/20',
    border: 'border-rose-900/40',
  },
];
