export const MOBILE_DESTINATIONS = [
  { id: 'home', label: 'Accueil', icon: 'home-outline' },
  { id: 'map', label: 'Carte', icon: 'map-outline' },
  { id: 'act', label: 'Agir', icon: 'walk-outline' },
  { id: 'messages', label: 'Messages', icon: 'chatbubble-ellipses-outline' },
  { id: 'profile', label: 'Profil', icon: 'person-outline' },
] as const

export type MobileDestinationId = (typeof MOBILE_DESTINATIONS)[number]['id']

export const MOBILE_WEB_BRIDGE_PATHS = {
  map: '/actions/map',
  joinAction: '/sections/rejoindre-une-action',
  organizeAction: '/actions/new',
  reportWaste: '/signalement',
  messages: '/sections/messagerie',
  profile: '/profil',
  settings: '/reglages',
} as const
