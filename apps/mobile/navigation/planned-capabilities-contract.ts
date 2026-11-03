export const PLANNED_CAPABILITIES = [
  {
    id: 'native-map',
    title: 'Carte native',
    subtitle: 'Explorer le terrain depuis le mobile',
    description: 'Une carte native dédiée pourra compléter le pont actuel vers la carte web lorsque son contrat et ses usages seront stabilisés.',
  },
  {
    id: 'post-action-summary',
    title: 'Bilan après action',
    subtitle: 'Relire une action une fois terminée',
    description: 'Un bilan mobile pourra réunir les éléments confirmés après action sans recalculer localement les indicateurs produits par le serveur.',
  },
  {
    id: 'action-management',
    title: 'Gestion avancée des actions',
    subtitle: 'Piloter les étapes et les participants',
    description: 'Les outils de gestion avancée attendent des contrats web stabilisés pour rester cohérents avec les droits et le cycle de vie des actions.',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Recevoir les alertes utiles au bon moment',
    description: 'Une expérience de notifications native pourra compléter les préférences actuellement synchronisées avec le compte.',
  },
  {
    id: 'discussions',
    title: 'Discussions',
    subtitle: 'Échanger avec la communauté',
    description: 'Une discussion native sera étudiée après stabilisation de la surface web et de ses règles de confidentialité.',
  },
  {
    id: 'route-planning',
    title: "Préparation d'itinéraires",
    subtitle: 'Préparer un parcours avant le terrain',
    description: 'Une préparation d’itinéraire pourra accompagner les missions lorsque les contrats de carte, de GPS et de partage seront définis.',
  },
  {
    id: 'detailed-history',
    title: 'Historique détaillé',
    subtitle: 'Retrouver le détail de ses activités',
    description: 'Un historique mobile plus détaillé pourra s’appuyer sur les données confirmées du compte sans créer une nouvelle source de vérité.',
  },
  {
    id: 'impacts-reports',
    title: 'Impacts et rapports',
    subtitle: 'Comprendre les résultats de ses actions',
    description: 'Les impacts et rapports mobiles attendent des projections et des contrats web stabilisés avant toute adaptation native.',
  },
] as const

export type PlannedCapabilityId = (typeof PLANNED_CAPABILITIES)[number]['id']

export type PlannedCapability = (typeof PLANNED_CAPABILITIES)[number]

export function getPlannedCapability(id: PlannedCapabilityId): PlannedCapability {
  return PLANNED_CAPABILITIES.find((capability) => capability.id === id) ?? PLANNED_CAPABILITIES[0]
}
