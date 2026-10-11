export const MOBILE_DESTINATION_REGISTRY = {
  current: [
    { id: 'act', label: 'Agir', icon: 'hand-helping', webBlock: 'agir' },
    { id: 'map', label: 'Carte', icon: 'map', webBlock: 'carte' },
    { id: 'account', label: 'Compte', icon: 'circle-user-round', webBlock: 'compte' },
  ],
  planned: [
    { id: 'home', label: 'Accueil', icon: 'house', webBlock: 'accueil' },
    { id: 'network', label: 'Réseau', icon: 'users-round', webBlock: 'réseau' },
    { id: 'learn', label: 'Apprendre', icon: 'graduation-cap', webBlock: 'apprendre' },
  ],
} as const

export const MOBILE_DESTINATIONS = MOBILE_DESTINATION_REGISTRY.current

export type MobileDestinationId = (typeof MOBILE_DESTINATIONS)[number]['id']

export const MOBILE_WEB_BRIDGE_PATHS = {
  map: '/actions/map',
  organizeAction: '/actions/new',
  reportWaste: '/signalement',
  profile: '/profil',
  settings: '/reglages',
  search: '/explorer',
  feedback: '/sections/feedback',
  network: '/sections/annuaire',
  community: '/sections/community',
} as const

export const MOBILE_SHELL_SURFACE_STORAGE_KEY = 'cleanmymap.mobile.shell.surface.v2'
