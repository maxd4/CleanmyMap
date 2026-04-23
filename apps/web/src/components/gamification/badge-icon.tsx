"use client";

import type { LucideIcon } from "lucide-react";
import {
  Award,
  BadgeCheck,
  Crown,
  Droplets,
  Leaf,
  Medal,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
  SlidersHorizontal,
} from "lucide-react";

export type BadgeIconName =
  | "award"
  | "badge-check"
  | "crown"
  | "droplets"
  | "leaf"
  | "medal"
  | "shield"
  | "sparkles"
  | "target"
  | "trophy"
  | "users"
  | "zap"
  | "sliders-horizontal";

const ICONS: Record<BadgeIconName, LucideIcon> = {
  award: Award,
  "badge-check": BadgeCheck,
  crown: Crown,
  droplets: Droplets,
  leaf: Leaf,
  medal: Medal,
  shield: Shield,
  sparkles: Sparkles,
  target: Target,
  trophy: Trophy,
  users: Users,
  zap: Zap,
  "sliders-horizontal": SlidersHorizontal,
};

const GAMIFICATION_LABEL_ICON_KEYS: Record<string, BadgeIconName> = {
  "Contributeur regulier": "zap",
  "Contributeur confirme": "shield",
  "Pilier terrain": "crown",
  "Referent impact": "target",
  "Expert Mégots (Or)": "droplets",
  "Chasseur de Mégots (Argent)": "droplets",
  "Ramasseur de Mégots (Bronze)": "droplets",
  "Héros du Nettoyage (Or)": "trophy",
  "Force de la Nature (Argent)": "leaf",
  "Bras Armé (Bronze)": "award",
  "Sentinelle Exemplaire": "badge-check",
  "Données de Qualité": "sparkles",
  "Pilier de Communauté": "users",
  "Esprit d'Équipe": "users",
};

const ACCOUNT_BADGE_ICON_KEYS: Record<string, BadgeIconName> = {
  admin: "shield",
  role_admin: "crown",
  role_benevole: "users",
  role_coordinateur: "target",
  role_scientifique: "sparkles",
  role_elu: "badge-check",
  profile_admin: "shield",
  profile_benevole: "users",
  profile_coordinateur: "target",
  profile_scientifique: "sparkles",
  profile_elu: "badge-check",
  pioneer: "zap",
  mentor: "award",
  cleanwalk_10: "medal",
  cleanwalk_50: "trophy",
  impact_100kg: "droplets",
};

export function getGamificationBadgeIconName(label: string): BadgeIconName {
  return GAMIFICATION_LABEL_ICON_KEYS[label] ?? "award";
}

export function getAccountBadgeIconName(iconKey: string): BadgeIconName {
  return ACCOUNT_BADGE_ICON_KEYS[iconKey] ?? "award";
}

export function BadgePictogram({
  name,
  className,
  size = 18,
}: {
  name: BadgeIconName | string;
  className?: string;
  size?: number;
}) {
  const Icon = ICONS[(name as BadgeIconName) in ICONS ? (name as BadgeIconName) : "award"];
  return <Icon size={size} className={className} strokeWidth={2.25} />;
}
