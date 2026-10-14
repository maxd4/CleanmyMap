import { expect, it } from 'vitest'
import { MOBILE_DESTINATION_REGISTRY, MOBILE_DESTINATIONS, MOBILE_SHELL_SURFACE_STORAGE_KEY, MOBILE_WEB_BRIDGE_PATHS } from '../screens/mobile-shell-contract'

function assertWebBridgeContract() {
  expect(MOBILE_WEB_BRIDGE_PATHS).toEqual({
    map: '/actions/map',
    organizeAction: '/actions/new',
    reportWaste: '/signalement',
    profile: '/profil',
    settings: '/reglages',
    search: '/explorer',
    feedback: '/sections/feedback',
    network: '/sections/annuaire',
    community: '/sections/community',
  })
  expect(MOBILE_SHELL_SURFACE_STORAGE_KEY).toContain('mobile.shell.surface')
}

it('keeps the three native destinations explicit and ordered', () => {
    expect(MOBILE_DESTINATIONS.map(({ id }) => id)).toEqual(['act', 'map', 'account'])
    expect(MOBILE_DESTINATIONS.map(({ label }) => label)).toEqual(['Agir', 'Carte', 'Compte'])
    expect(MOBILE_DESTINATION_REGISTRY.planned.map(({ id }) => id)).toEqual(['home', 'network', 'learn'])
    expect(MOBILE_DESTINATIONS.length).toBeLessThanOrEqual(5)
})

it('bridges lightweight actions to existing web surfaces', assertWebBridgeContract)
