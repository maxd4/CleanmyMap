import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callTestHandler, testProp } from './test-renderer-helpers'
import { commonNativeComponents, nativeComponent } from './support/native-component'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  getItem: vi.fn<() => Promise<string | null>>(),
  setItem: vi.fn(async () => undefined),
  foregroundPermission: 'granted' as 'granted' | 'denied',
  position: { latitude: 48.8566, longitude: 2.3522 },
  createMobileAction: vi.fn(),
  updateMobileAction: vi.fn(),
  loadMobileActionEditor: vi.fn(async () => ({ status: 'ok', action: {} })),
  loadMobileActionDay: vi.fn(async () => ({ status: 'ok', actionId: 'action-1', access: 'owner', action: {} })),
  publishMobileAction: vi.fn(),
  createLinkedMission: vi.fn(),
}))

vi.mock('react-native', () => ({
  ...commonNativeComponents(),
}))
vi.mock('@expo/vector-icons', () => ({ Ionicons: nativeComponent('Ionicons') }))
vi.mock('expo-location', () => ({
  Accuracy: { Balanced: 'balanced' },
  requestForegroundPermissionsAsync: vi.fn(async () => ({ status: state.foregroundPermission })),
  getCurrentPositionAsync: vi.fn(async () => ({ coords: state.position })),
}))
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: state.getItem, setItem: state.setItem },
}))
vi.mock('../lib/linked-mission-service', () => ({ createLinkedMission: state.createLinkedMission }))
vi.mock('../lib/mobile-actions-service', () => ({
  createMobileAction: state.createMobileAction,
  updateMobileAction: state.updateMobileAction,
  loadMobileActionEditor: state.loadMobileActionEditor,
  loadMobileActionDay: state.loadMobileActionDay,
  publishMobileAction: state.publishMobileAction,
}))

import { ActionCreateScreen } from '../screens/action-create'

function textContent(node: TestRenderer.ReactTestInstance): string {
  return node.children.map((child) => typeof child === 'string' ? child : textContent(child)).join('')
}

function findButton(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity').find((node) => textContent(node).includes(label))
}

async function renderScreen(onSessionExpired = vi.fn()) {
  let renderer!: TestRenderer.ReactTestRenderer
  await act(async () => {
    renderer = TestRenderer.create(<ActionCreateScreen onSessionExpired={onSessionExpired} />)
  })
  return renderer
}

describe('mobile action creation runtime', () => {
  beforeEach(() => {
    state.getItem.mockReset()
    state.setItem.mockClear()
    state.createMobileAction.mockReset()
    state.updateMobileAction.mockReset()
    state.loadMobileActionEditor.mockClear()
    state.loadMobileActionDay.mockReset()
    state.publishMobileAction.mockReset()
    state.createLinkedMission.mockReset()
    state.foregroundPermission = 'granted'
    state.position = { latitude: 48.8566, longitude: 2.3522 }
    state.createMobileAction.mockResolvedValue({ status: 'created', id: 'action-1', source: 'actions' })
    state.updateMobileAction.mockResolvedValue({ status: 'ok', actionId: 'action-1', actionPhase: 'pre_action' })
    state.publishMobileAction.mockResolvedValue({ status: 'published', id: 'action-1', publishedAt: '2026-10-20T10:00:00.000Z', alreadyPublished: false })
    state.loadMobileActionDay.mockResolvedValue({ status: 'ok', actionId: 'action-1', access: 'owner', action: {} })
    state.createLinkedMission.mockResolvedValue({ ok: true, missionId: 'mission-1' })
  })

  it('does not overwrite a delayed interrupted draft before restoration completes', async () => {
    let resolveRead!: (value: string | null) => void
    state.getItem.mockReturnValue(new Promise((resolve) => { resolveRead = resolve }))
    const renderer = await renderScreen()

    expect(state.setItem).not.toHaveBeenCalled()

    await act(async () => {
      resolveRead(JSON.stringify({
        draft: { title: 'Brouillon repris', location: 'Parc sauvegardé' },
        section: 'essentiel',
      }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' }), 'value')).toBe('Brouillon repris')
    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Lieu' }), 'value')).toBe('Parc sauvegardé')
    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' }), 'placeholderTextColor')).toBe('#94a3b8')
    expect(state.setItem).toHaveBeenCalled()
  })

  it('does not write an empty draft after a rejected local read', async () => {
    state.getItem.mockRejectedValueOnce(new Error('storage indisponible'))
    const renderer = await renderScreen()

    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(state.setItem).not.toHaveBeenCalled()
    expect(renderer.root.findAll((node) => textContent(node).includes('Le brouillon local n’a pas pu être relu'))).not.toHaveLength(0)
  })

  it('restores a valid section and ignores a malformed local draft payload', async () => {
    state.getItem.mockResolvedValueOnce(JSON.stringify({ draft: { title: 'Terrain repris' }, section: 'terrain' }))
    const renderer = await renderScreen()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(renderer.root.findByProps({ accessibilityLabel: 'Latitude' })).toBeDefined()

    await act(async () => { renderer.unmount() })
    state.getItem.mockResolvedValueOnce('{malformed')
    const malformed = await renderScreen()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(testProp<string>(malformed.root.findByProps({ accessibilityLabel: 'Titre de l’action' }), 'value')).toBe('')
  })

  it('does not POST while local draft recovery is blocked', async () => {
    state.getItem.mockRejectedValueOnce(new Error('storage indisponible'))
    const renderer = await renderScreen()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    const save = findButton(renderer, 'Enregistrer le brouillon')
    await act(async () => { await callTestHandler(save, 'onPress') })

    expect(state.createMobileAction).not.toHaveBeenCalled()
    expect(state.updateMobileAction).not.toHaveBeenCalled()
  })

  it('recovers explicitly after a rejected local read without overwriting the restored draft', async () => {
    state.getItem.mockRejectedValueOnce(new Error('storage indisponible')).mockResolvedValueOnce(JSON.stringify({
      draft: { title: 'Récupération après erreur', location: 'Parc repris' },
    }))
    const renderer = await renderScreen()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(state.setItem).not.toHaveBeenCalled()

    const retry = findButton(renderer, 'Réessayer la récupération locale')
    await act(async () => { await callTestHandler(retry, 'onPress'); await Promise.resolve(); await Promise.resolve() })

    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' }), 'value')).toBe('Récupération après erreur')
    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Lieu' }), 'value')).toBe('Parc repris')
    expect(state.setItem).toHaveBeenCalled()
  })

  it('preserves the resumed action and request identities before saving again', async () => {
    state.getItem.mockResolvedValueOnce(JSON.stringify({
      actionId: 'action-resumed',
      clientRequestId: 'request-resumed-123456',
      draft: { title: 'Action reprise', location: 'Parc repris' },
    }))
    const renderer = await renderScreen()

    const save = findButton(renderer, 'Enregistrer le brouillon')
    await act(async () => { await callTestHandler(save, 'onPress') })

    expect(state.createMobileAction).not.toHaveBeenCalled()
    expect(state.updateMobileAction).toHaveBeenCalledWith(
      'action-resumed',
      expect.objectContaining({ clientRequestId: 'request-resumed-123456' }),
    )
  })

  it('does not persist after unmount while a local read is pending', async () => {
    let resolveRead!: (value: string | null) => void
    state.getItem.mockReturnValue(new Promise((resolve) => { resolveRead = resolve }))
    const renderer = await renderScreen()

    await act(async () => { renderer.unmount() })
    await act(async () => {
      resolveRead(JSON.stringify({ draft: { title: 'Ne pas appliquer' } }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(state.setItem).not.toHaveBeenCalled()
  })

  it('surfaces a local write failure without an unhandled rejection', async () => {
    state.getItem.mockResolvedValue(null)
    state.setItem.mockRejectedValueOnce(new Error('quota local dépassé'))
    const renderer = await renderScreen()

    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(renderer.root.findAll((node) => textContent(node).includes('Le brouillon local n’a pas pu être sauvegardé'))).not.toHaveLength(0)
  })

  it('keeps the local draft visible after a save error and retries without creating a second action after success', async () => {
    state.getItem.mockResolvedValue(null)
    state.createMobileAction.mockRejectedValueOnce(new Error('réseau indisponible')).mockResolvedValueOnce({ status: 'created', id: 'action-1', source: 'actions' })
    const renderer = await renderScreen()
    const title = renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' })

    await act(async () => { callTestHandler(title, 'onChangeText', 'Action à reprendre') })
    const save = findButton(renderer, 'Enregistrer le brouillon')
    await act(async () => { await callTestHandler(save, 'onPress') })
    expect(renderer.root.findAll((node) => textContent(node).includes('réseau indisponible'))).not.toHaveLength(0)
    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' }), 'value')).toBe('Action à reprendre')

    await act(async () => { await callTestHandler(save, 'onPress') })
    expect(state.createMobileAction).toHaveBeenCalledTimes(2)
    expect(state.updateMobileAction).not.toHaveBeenCalled()

    const saveAgain = findButton(renderer, 'Enregistrer le brouillon')
    await act(async () => { await callTestHandler(saveAgain, 'onPress') })
    expect(state.updateMobileAction).toHaveBeenCalledTimes(1)
    expect(state.createMobileAction).toHaveBeenCalledTimes(2)
  })

  it('does not persist a denied location permission and accepts a later GPS retry', async () => {
    state.getItem.mockResolvedValue(null)
    state.foregroundPermission = 'denied'
    const renderer = await renderScreen()
    const locate = findButton(renderer, 'Utiliser ma position actuelle')

    await act(async () => { await callTestHandler(locate, 'onPress'); await Promise.resolve() })
    expect(state.createMobileAction).not.toHaveBeenCalled()
    expect(renderer.root.findAll((node) => textContent(node).includes('La permission de localisation est nécessaire'))).not.toHaveLength(0)

    state.foregroundPermission = 'granted'
    await act(async () => { await callTestHandler(locate, 'onPress'); await Promise.resolve() })
    await act(async () => { await callTestHandler(findButton(renderer, 'Continuer'), 'onPress') })
    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Latitude' }), 'value')).toBe('48.856600')
    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Longitude' }), 'value')).toBe('2.352200')
    expect(renderer.root.findAll((node) => textContent(node).includes('Position actuelle ajoutée'))).not.toHaveLength(0)
  })

  it('publishes exactly once after creating the server action and disables the published state', async () => {
    state.getItem.mockResolvedValue(null)
    const renderer = await renderScreen()
    const title = renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' })
    await act(async () => { callTestHandler(title, 'onChangeText', 'Action publiée') })

    for (let index = 0; index < 3; index += 1) {
      const next = findButton(renderer, 'Continuer')
      await act(async () => { await callTestHandler(next, 'onPress') })
    }

    const publish = findButton(renderer, 'Publier')
    await act(async () => { await callTestHandler(publish, 'onPress') })
    expect(state.createMobileAction).toHaveBeenCalledTimes(1)
    expect(state.publishMobileAction).toHaveBeenCalledWith('action-1')
    expect(renderer.root.findAll((node) => textContent(node).includes('Publication confirmée par le serveur'))).not.toHaveLength(0)
    expect(testProp<boolean>(findButton(renderer, 'Publiée'), 'disabled')).toBe(true)

    const publishedButton = findButton(renderer, 'Publiée')
    await act(async () => { await callTestHandler(publishedButton, 'onPress') })
    expect(state.createMobileAction).toHaveBeenCalledTimes(1)
    expect(state.publishMobileAction).toHaveBeenCalledTimes(1)
  })

  it('updates an existing action before publishing and can retry a failed publication', async () => {
    state.getItem.mockResolvedValueOnce(JSON.stringify({ actionId: 'action-existing', section: 'verification', draft: { title: 'Action existante' } }))
    state.publishMobileAction.mockRejectedValueOnce(new Error('publication indisponible')).mockResolvedValueOnce({ status: 'published', id: 'action-existing', publishedAt: '2026-10-20T10:00:00.000Z', alreadyPublished: false })
    const renderer = await renderScreen()
    const publish = findButton(renderer, 'Publier')

    await act(async () => { await callTestHandler(publish, 'onPress') })
    const updateCall = state.updateMobileAction.mock.calls[0] as unknown[] | undefined
    const updatePayload = updateCall?.[1] as { clientRequestId?: unknown } | undefined
    expect(updateCall?.[0]).toBe('action-existing')
    expect(typeof updatePayload?.clientRequestId).toBe('string')
    expect(state.publishMobileAction).toHaveBeenCalledTimes(1)
    expect(renderer.root.findAll((node) => textContent(node).includes('publication indisponible'))).not.toHaveLength(0)

    await act(async () => { await callTestHandler(findButton(renderer, 'Publier'), 'onPress') })
    expect(state.updateMobileAction).toHaveBeenCalledTimes(2)
    expect(state.publishMobileAction).toHaveBeenCalledTimes(2)
    expect(testProp<boolean>(findButton(renderer, 'Publiée'), 'disabled')).toBe(true)
  })

  it('forwards a session 401 during save and does not claim a local success', async () => {
    state.getItem.mockResolvedValue(null)
    state.createMobileAction.mockRejectedValueOnce({ status: 401 })
    const onSessionExpired = vi.fn()
    const renderer = await renderScreen(onSessionExpired)
    await act(async () => { await callTestHandler(findButton(renderer, 'Enregistrer le brouillon'), 'onPress') })

    expect(onSessionExpired).toHaveBeenCalledOnce()
    expect(renderer.root.findAll((node) => textContent(node).includes('Brouillon enregistré sur le serveur'))).toHaveLength(0)
  })

  it('forwards a session 401 while restoring an existing action editor', async () => {
    state.getItem.mockResolvedValueOnce(JSON.stringify({ actionId: 'action-401', section: 'verification' }))
    state.loadMobileActionEditor.mockRejectedValueOnce({ status: 401 })
    const onSessionExpired = vi.fn()

    await renderScreen(onSessionExpired)
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(onSessionExpired).toHaveBeenCalledOnce()
    expect(state.loadMobileActionEditor).toHaveBeenCalledWith('action-401')
  })

  it('forwards a failed GPS link and a failed briefing lookup without local success', async () => {
    state.getItem.mockResolvedValueOnce(JSON.stringify({ actionId: 'action-tools', section: 'verification', draft: { title: 'Action outils' } }))
    state.createLinkedMission.mockResolvedValueOnce({ ok: false, error: 'liaison refusée' })
    state.loadMobileActionDay.mockRejectedValueOnce(new Error('briefing indisponible'))
    const renderer = await renderScreen()

    await act(async () => { await callTestHandler(findButton(renderer, 'Relier une activité GPS'), 'onPress') })
    expect(renderer.root.findAll((node) => textContent(node).includes('liaison refusée'))).not.toHaveLength(0)
    await act(async () => { await callTestHandler(findButton(renderer, 'Ouvrir Préparer / Jour J'), 'onPress') })
    expect(renderer.root.findAll((node) => textContent(node).includes('briefing indisponible'))).not.toHaveLength(0)
  })

  it('builds manual point-to-point coordinates with deduplicated participants and a truncated checklist', async () => {
    state.getItem.mockResolvedValue(null)
    const renderer = await renderScreen()
    const input = (label: string, value: string) => callTestHandler(renderer.root.findByProps({ accessibilityLabel: label }), 'onChangeText', value)

    await act(async () => {
      input('Titre de l’action', 'Action manuelle')
      input('Date (AAAA-MM-JJ)', '2026-11-01')
      input('Lieu', 'Lieu manuel')
    })
    await act(async () => { await callTestHandler(findButton(renderer, 'Terrain'), 'onPress') })
    await act(async () => {
      input('Latitude', '48.123456')
      input('Longitude', '2.654321')
      await callTestHandler(findButton(renderer, 'Point à point'), 'onPress')
      input('Départ', 'Départ manuel')
    })
    await act(async () => { input('Arrivée', 'Arrivée manuelle') })
    await act(async () => { await callTestHandler(findButton(renderer, 'Équipe et logistique'), 'onPress') })
    await act(async () => {
      input('Coorganisateurs (identifiants séparés par des virgules)', 'orga-1, orga-1, orga-2')
      input('Invitations (identifiants séparés par des virgules)', 'invite-1, invite-1, invite-2')
      input('Logistique et checklist (une ligne par item)', Array.from({ length: 14 }, (_, index) => `item-${index + 1}`).join('\n'))
    })
    await act(async () => { await callTestHandler(findButton(renderer, 'Vérifier et publier'), 'onPress') })
    await act(async () => { await callTestHandler(findButton(renderer, 'Publier'), 'onPress') })

    const payload = state.createMobileAction.mock.calls[0]?.[0] as Record<string, unknown> | undefined
    if (!payload) throw new Error('Action creation payload was not recorded')
    expect(payload).toMatchObject({
      locationLabel: 'Lieu manuel',
      latitude: 48.123456,
      longitude: 2.654321,
      routeTopology: 'point_to_point',
      departureLocationLabel: 'Départ manuel',
      arrivalLocationLabel: 'Arrivée manuelle',
      organizerAccounts: ['orga-1', 'orga-2'],
      participantAccounts: ['invite-1', 'invite-2'],
    })
    const preparationData = payload.preparationData as { preparationChecklist?: unknown[] } | undefined
    expect(preparationData?.preparationChecklist).toHaveLength(12)
  })

  it('links GPS only after a server draft exists and keeps the server result explicit', async () => {
    state.getItem.mockResolvedValue(null)
    const renderer = await renderScreen()
    const linkBeforeSave = findButton(renderer, 'Relier une activité GPS')
    expect(linkBeforeSave).toBeUndefined()

    const save = findButton(renderer, 'Enregistrer le brouillon')
    await act(async () => { await callTestHandler(save, 'onPress') })
    for (let index = 0; index < 3; index += 1) {
      const next = findButton(renderer, 'Continuer')
      await act(async () => { await callTestHandler(next, 'onPress') })
    }

    const link = findButton(renderer, 'Relier une activité GPS')
    await act(async () => { await callTestHandler(link, 'onPress') })
    expect(state.createLinkedMission).toHaveBeenCalledWith('Action mobile', 'action-1')
    expect(renderer.root.findAll((node) => textContent(node).includes('Suivi GPS lié'))).not.toHaveLength(0)
  })
})
