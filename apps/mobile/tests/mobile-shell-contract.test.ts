import { describe, expect, it } from 'vitest'
import { MOBILE_DESTINATIONS, MOBILE_WEB_BRIDGE_PATHS } from '../screens/mobile-shell-contract'

describe('mobile V1 shell contract', () => {
  it('keeps the five volunteer destinations explicit and ordered', () => {
    expect(MOBILE_DESTINATIONS.map(({ id }) => id)).toEqual(['home', 'map', 'act', 'messages', 'profile'])
    expect(MOBILE_DESTINATIONS.map(({ label }) => label)).toEqual(['Accueil', 'Carte', 'Agir', 'Messages', 'Profil'])
  })

  it('bridges lightweight actions to existing web surfaces', () => {
    expect(MOBILE_WEB_BRIDGE_PATHS).toEqual({
      map: '/actions/map',
      joinAction: '/sections/rejoindre-une-action',
      organizeAction: '/actions/new',
      reportWaste: '/signalement',
      messages: '/sections/messagerie',
      profile: '/profil',
      settings: '/reglages',
    })
  })
})
