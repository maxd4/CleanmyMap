export type GamificationBadgeEntry = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  minPoints: number | null;
  progress: { current: number; target: number | null };
  visualVariant?: string;
  tooltip?: string;
};

export type GamificationExplorerSummary = {
  currentPlaces: number;
  nextTier: { id: string; title: string; min: number } | null;
  zonesToNext: number;
};

type ExplorerTier = {
  min: number;
  max: number;
  id: string;
  title: string;
  icon: string;
  texture: string;
};

type BadgeTierDefinition = {
  threshold: number;
  id: string;
  label: string;
  iconVariant: string;
  visualVariant: string;
  tooltip: string;
  xp: number;
};

type LegacyBadgeDefinition = {
  id: string;
  name: string;
  description: string;
  minPoints: number;
  icon: string;
  special?: "first_trace_utile" | "trace_fondatrice" | "actions_validated";
};

export const EXPLORER_TIERS: readonly ExplorerTier[] = [
  { min: 0, max: 0, id: "explorer-observateur", title: "Observateur", icon: "👀", texture: "/images/textures/parchment.svg" },
  { min: 1, max: 2, id: "explorer-wood", title: "Promeneur Local", icon: "👣", texture: "/images/textures/parchment.svg" },
  { min: 3, max: 4, id: "explorer-arpenteur", title: "Arpenteur", icon: "🥉", texture: "/images/textures/bronze-map.svg" },
  { min: 5, max: 7, id: "explorer-eclaireur", title: "Éclaireur", icon: "🔦", texture: "/images/textures/silver-map.svg" },
  { min: 8, max: 10, id: "explorer-patrouilleur", title: "Patrouilleur", icon: "🚶", texture: "/images/textures/silver-map.svg" },
  { min: 11, max: 14, id: "explorer-repereur", title: "Repéreur", icon: "📍", texture: "/images/textures/gold-topo.svg" },
  { min: 15, max: 19, id: "explorer-cartographe", title: "Cartographe", icon: "🗺️", texture: "/images/textures/gold-topo.svg" },
  { min: 20, max: 24, id: "explorer-coordinateur", title: "Coordinateur", icon: "🧭", texture: "/images/textures/diamond-holo.svg" },
  { min: 25, max: 29, id: "explorer-sentinelle", title: "Sentinelle", icon: "🛡️", texture: "/images/textures/diamond-holo.svg" },
  { min: 30, max: 34, id: "explorer-regulateur", title: "Régulateur", icon: "⚖️", texture: "/images/textures/diamond-holo.svg" },
  { min: 35, max: 44, id: "explorer-conservateur", title: "Conservateur", icon: "🌳", texture: "/images/textures/cosmic-holo.svg" },
  { min: 45, max: 49, id: "explorer-gardien", title: "Gardien", icon: "🦺", texture: "/images/textures/cosmic-holo.svg" },
  { min: 50, max: Number.MAX_SAFE_INTEGER, id: "explorer-cosmic", title: "Maître des Cartes", icon: "🔭", texture: "/images/textures/cosmic-holo.svg" },
] as const;

export const FORM_SUBMISSION_TIERS: readonly BadgeTierDefinition[] = [
  { threshold: 1, id: "forms-seed", label: "Graine", iconVariant: "plant-seed", visualVariant: "stone", tooltip: "1 formulaire éligible", xp: 1 },
  { threshold: 3, id: "forms-sprout", label: "Pousse", iconVariant: "plant-sprout", visualVariant: "stone", tooltip: "3 formulaires éligibles", xp: 1 },
  { threshold: 5, id: "forms-seedling", label: "Jeune plante", iconVariant: "plant-seedling", visualVariant: "stone", tooltip: "5 formulaires éligibles", xp: 1 },
  { threshold: 8, id: "forms-sapling", label: "Arbuste", iconVariant: "plant-sapling", visualVariant: "stone", tooltip: "8 formulaires éligibles", xp: 1 },
  { threshold: 10, id: "forms-young-tree", label: "Jeune arbre", iconVariant: "plant-young-tree", visualVariant: "stone", tooltip: "10 formulaires éligibles", xp: 1 },
  { threshold: 15, id: "forms-mature-tree", label: "Arbre mature", iconVariant: "plant-mature-tree", visualVariant: "precious", tooltip: "15 formulaires éligibles", xp: 1 },
  { threshold: 20, id: "forms-grove", label: "Bosquet", iconVariant: "plant-grove", visualVariant: "precious", tooltip: "20 formulaires éligibles", xp: 1 },
  { threshold: 25, id: "forms-primary-forest", label: "Forêt primaire", iconVariant: "plant-primary-forest", visualVariant: "precious", tooltip: "25 formulaires éligibles", xp: 1 },
] as const;

export const CLEAN_ZONES_TIERS: readonly BadgeTierDefinition[] = [
  { threshold: 1, id: "clean-zones-breeze", label: "Brise", iconVariant: "breeze", visualVariant: "atmosphere", tooltip: "1 zone propre validée ou nettoyée", xp: 1 },
  { threshold: 3, id: "clean-zones-horizon", label: "Horizon", iconVariant: "horizon", visualVariant: "atmosphere", tooltip: "3 zones propres validées ou nettoyées", xp: 1 },
  { threshold: 5, id: "clean-zones-azure", label: "Azur", iconVariant: "azure", visualVariant: "atmosphere", tooltip: "5 zones propres validées ou nettoyées", xp: 1 },
  { threshold: 8, id: "clean-zones-dawn", label: "Aurore", iconVariant: "dawn", visualVariant: "atmosphere", tooltip: "8 zones propres validées ou nettoyées", xp: 1 },
  { threshold: 10, id: "clean-zones-zenith", label: "Zénith", iconVariant: "zenith", visualVariant: "atmosphere", tooltip: "10 zones propres validées ou nettoyées", xp: 1 },
  { threshold: 15, id: "clean-zones-stratosphere", label: "Stratosphère", iconVariant: "stratosphere", visualVariant: "precious", tooltip: "15 zones propres validées ou nettoyées", xp: 1 },
  { threshold: 20, id: "clean-zones-ether", label: "Éther", iconVariant: "ether", visualVariant: "precious", tooltip: "20 zones propres validées ou nettoyées", xp: 1 },
  { threshold: 25, id: "clean-zones-helios", label: "Hélios", iconVariant: "helios", visualVariant: "precious", tooltip: "25 zones propres validées ou nettoyées", xp: 1 },
  { threshold: 30, id: "clean-zones-harmony", label: "Harmonie", iconVariant: "harmony", visualVariant: "precious", tooltip: "30 zones propres validées ou nettoyées", xp: 1 },
  { threshold: 40, id: "clean-zones-eden", label: "Eden", iconVariant: "eden", visualVariant: "precious", tooltip: "40 zones propres validées ou nettoyées", xp: 1 },
] as const;

export const PARTICIPANT_TIERS: readonly BadgeTierDefinition[] = [
  { threshold: 0, id: "participant-0", label: "Observateur", iconVariant: "marker", visualVariant: "parchment", tooltip: "Point de départ de la participation aux actions de dépollution", xp: 0 },
  { threshold: 1, id: "participant-1", label: "Promeneur Local", iconVariant: "footprints", visualVariant: "parchment", tooltip: "Première participation utile", xp: 1 },
  { threshold: 3, id: "participant-3", label: "Éclaireur", iconVariant: "compass", visualVariant: "bronze", tooltip: "Participation assidue sur plusieurs lieux", xp: 1 },
  { threshold: 5, id: "participant-5", label: "Patrouilleur", iconVariant: "boots", visualVariant: "silver", tooltip: "Participation récurrente à des opérations locales", xp: 1 },
  { threshold: 10, id: "participant-10", label: "Cartographe", iconVariant: "map", visualVariant: "gold", tooltip: "Contribue à la couverture cartographique par l’action", xp: 1 },
  { threshold: 15, id: "participant-15", label: "Coordinateur", iconVariant: "compass-rose", visualVariant: "platinum", tooltip: "Joue un rôle central dans les actions", xp: 1 },
  { threshold: 20, id: "participant-20", label: "Sentinelle", iconVariant: "shield", visualVariant: "diamond", tooltip: "Garantie la pérennité des nettoyages", xp: 1 },
  { threshold: 25, id: "participant-25", label: "Conservateur", iconVariant: "tree", visualVariant: "cosmic", tooltip: "Impact territorial notable", xp: 1 },
  { threshold: 30, id: "participant-30", label: "Gardien", iconVariant: "guardian", visualVariant: "cosmic", tooltip: "Ambassadeur de terrain", xp: 1 },
] as const;

const LEGACY_POINT_BADGES: readonly LegacyBadgeDefinition[] = [
  { id: "first_step", name: "Premier pas", description: "Gagner 10 points", minPoints: 10, icon: "👣" },
  { id: "contributor", name: "Contributeur", description: "Accumuler 100 points", minPoints: 100, icon: "🌱" },
  { id: "active", name: "Actif", description: "Accumuler 500 points", minPoints: 500, icon: "🔥" },
  { id: "champion", name: "Champion", description: "Accumuler 1000 points", minPoints: 1000, icon: "⭐" },
  { id: "legend", name: "Légende", description: "Accumuler 5000 points", minPoints: 5000, icon: "👑" },
  { id: "first_trace_utile", name: "Première trace utile", description: "Valider une première action avec des données complètes", minPoints: 0, special: "first_trace_utile", icon: "badge-check" },
  { id: "trace_fondatrice", name: "Trace fondatrice", description: "Première action validée avec dossier complet", minPoints: 0, special: "trace_fondatrice", icon: "sparkles" },
  { id: "cleaner", name: "Nettoyeur", description: "Valider 5 actions", minPoints: 0, special: "actions_validated", icon: "🧹" },
] as const;

function buildTierBadge(
  tier: BadgeTierDefinition,
  current: number,
): GamificationBadgeEntry {
  return {
    id: tier.id,
    name: tier.label,
    description: tier.tooltip,
    icon: tier.iconVariant,
    visualVariant: tier.visualVariant,
    tooltip: tier.tooltip,
    unlocked: current >= tier.threshold,
    minPoints: null,
    progress: { current, target: tier.threshold },
  };
}

export function buildExplorerFamily(currentPlaces: number): {
  badges: GamificationBadgeEntry[];
  summary: GamificationExplorerSummary;
} {
  const current = Math.max(0, Math.trunc(currentPlaces));
  let highestTierReached: ExplorerTier = EXPLORER_TIERS[0]!;

  for (const tier of EXPLORER_TIERS) {
    if (current >= tier.min) {
      highestTierReached = tier;
    }
  }

  const nextTier: ExplorerTier | null = EXPLORER_TIERS.find((tier) => tier.min > highestTierReached.min) ?? null;
  const zonesToNext = nextTier ? Math.max(0, nextTier.min - current) : 0;

  const badges = EXPLORER_TIERS.map((tier) => {
    const unlocked = current >= tier.min;
    const tierCurrent = Math.max(
      0,
      Math.min(current, tier.max) - tier.min + (current >= tier.min ? 1 : 0),
    );
    const tierTarget = tier.max === Number.MAX_SAFE_INTEGER ? Math.max(50, tier.min) : tier.max - tier.min + 1;

    return {
      id: tier.id,
      name: tier.title,
      description: `Visiter des lieux pour révéler la carte — niveau ${tier.title}`,
      icon: tier.icon,
      unlocked,
      minPoints: null,
      progress: { current: tierCurrent, target: tierTarget },
    } satisfies GamificationBadgeEntry;
  });

  return {
    badges,
    summary: {
      currentPlaces: current,
      nextTier: nextTier ? { id: nextTier.id, title: nextTier.title, min: nextTier.min } : null,
      zonesToNext,
    },
  };
}

export function buildFormsBadges(eligibleFormsCount: number): GamificationBadgeEntry[] {
  const current = Math.max(0, Math.trunc(eligibleFormsCount));
  return FORM_SUBMISSION_TIERS.map((tier) => buildTierBadge(tier, current));
}

export function buildCleanZonesBadges(cleanZonesCount: number): GamificationBadgeEntry[] {
  const current = Math.max(0, Math.trunc(cleanZonesCount));
  return CLEAN_ZONES_TIERS.map((tier) => buildTierBadge(tier, current));
}

export function buildParticipantBadges(participationCount: number): GamificationBadgeEntry[] {
  const current = Math.max(0, Math.trunc(participationCount));
  return PARTICIPANT_TIERS.map((tier) => buildTierBadge(tier, current));
}

export function buildLegacyBadges(
  totalPoints: number,
  actionsCount: number,
  completeActionsCount: number,
): GamificationBadgeEntry[] {
  const points = Math.max(0, Math.trunc(totalPoints));
  const actions = Math.max(0, Math.trunc(actionsCount));
  const completeActions = Math.max(0, Math.trunc(completeActionsCount));

  return LEGACY_POINT_BADGES.map((badge) => {
    let isUnlocked = false;
    let progress: GamificationBadgeEntry["progress"];

    if (badge.special === "actions_validated") {
      isUnlocked = actions >= 5;
      progress = { current: actions, target: 5 };
    } else if (badge.special === "first_trace_utile" || badge.special === "trace_fondatrice") {
      isUnlocked = completeActions >= 1;
      progress = { current: completeActions, target: 1 };
    } else {
      isUnlocked = points >= (badge.minPoints ?? 0);
      progress = { current: points, target: badge.minPoints };
    }

    return {
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      unlocked: isUnlocked,
      minPoints: badge.minPoints || null,
      progress,
    } satisfies GamificationBadgeEntry;
  });
}

export function getHighestExplorerTier(currentPlaces: number) {
  const current = Math.max(0, Math.trunc(currentPlaces));
  let highestTierReached: ExplorerTier = EXPLORER_TIERS[0]!;

  for (const tier of EXPLORER_TIERS) {
    if (current >= tier.min) {
      highestTierReached = tier;
    }
  }

  return highestTierReached;
}
