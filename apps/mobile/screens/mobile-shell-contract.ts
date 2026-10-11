export const MOBILE_DESTINATIONS = [
  { id: 'act', label: 'Agir', icon: 'walk-outline' },
  { id: 'map', label: 'Carte', icon: 'map-outline' },
  { id: 'account', label: 'Compte', icon: 'person-outline' },
] as const

export type MobileDestinationId = (typeof MOBILE_DESTINATIONS)[number]['id']

export const MOBILE_WEB_BRIDGE_PATHS = {
  map: '/actions/map',
  organizeAction: '/actions/new',
  reportWaste: '/signalement',
  profile: '/profil',
  settings: '/reglages',
} as const

export const MOBILE_SHELL_SURFACE_STORAGE_KEY = 'cleanmymap.mobile.shell.surface.v2'
