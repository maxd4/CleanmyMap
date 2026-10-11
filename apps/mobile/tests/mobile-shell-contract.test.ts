import { describe, expect, it } from 'vitest'
import { MOBILE_DESTINATIONS, MOBILE_SHELL_SURFACE_STORAGE_KEY, MOBILE_WEB_BRIDGE_PATHS } from '../screens/mobile-shell-contract'

describe('mobile V1 shell contract', () => {
  it('keeps the three native destinations explicit and ordered', () => {
    expect(MOBILE_DESTINATIONS.map(({ id }) => id)).toEqual(['act', 'map', 'account'])
    expect(MOBILE_DESTINATIONS.map(({ label }) => label)).toEqual(['Agir', 'Carte', 'Compte'])
  })

  it('bridges lightweight actions to existing web surfaces', () => {
    expect(MOBILE_WEB_BRIDGE_PATHS).toEqual({
      map: '/actions/map',
      organizeAction: '/actions/new',
      reportWaste: '/signalement',
      profile: '/profil',
      settings: '/reglages',
    })
    expect(MOBILE_SHELL_SURFACE_STORAGE_KEY).toContain('mobile.shell.surface')
  })
})
