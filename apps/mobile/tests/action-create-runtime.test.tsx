import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callTestHandler, testProp } from './test-renderer-helpers'
import { commonNativeComponents, nativeComponent } from './support/native-component'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(async () => undefined),
  auth: { isLoaded: true, isSignedIn: true, userId: 'user-a' as string | null },
  foregroundPermission: 'granted' as 'granted' | 'denied',
  position: { latitude: 48.8566, longitude: 2.3522 },
  getCurrentPositionAsync: vi.fn(),
  createMobileAction: vi.fn(),
  updateMobileAction: vi.fn(),
  loadMobileActionEditor: vi.fn(async () => ({ status: 'ok', action: {} })),
  loadMobileActionDay: vi.fn(async () => ({ status: 'ok', actionId: 'action-1', access: 'owner', action: {} })),
  publishMobileAction: vi.fn(),
  createLinkedMission: vi.fn(),
}))

vi.mock('@clerk/expo', () => ({ useAuth: () => state.auth }))
vi.mock('react-native', () => ({
  ...commonNativeComponents(),
}))
vi.mock('@expo/vector-icons', () => ({ Ionicons: nativeComponent('Ionicons') }))
vi.mock('expo-location', () => ({
  Accuracy: { Balanced: 'balanced' },
  requestForegroundPermissionsAsync: vi.fn(async () => ({ status: state.foregroundPermission })),
  getCurrentPositionAsync: state.getCurrentPositionAsync,
}))
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: state.getItem, setItem: state.setItem },
}))
vi.mock('../features/tracking/linked-mission-service', () => ({ createLinkedMission: state.createLinkedMission }))
vi.mock('../features/actions/mobile-actions-service', () => ({
  SPONTANEOUS_PENDING_ORGANIZER_LABEL: 'Organisateur en attente de compte',
  MOBILE_ORGANIZER_TYPE_OPTIONS: [
    { value: 'spontaneous', label: 'Action spontanée' },
    { value: 'company', label: 'Entreprise' },
    { value: 'association', label: 'Association' },
    { value: 'student_association', label: 'Association étudiante' },
    { value: 'collective', label: 'Collectif' },
    { value: 'other', label: 'Autre' },
  ],
  isMobileOrganizerType: (value: unknown) => ['spontaneous', 'company', 'association', 'student_association', 'collective', 'other'].includes(value as string),
  createMobileAction: state.createMobileAction,
  updateMobileAction: state.updateMobileAction,
  loadMobileActionEditor: state.loadMobileActionEditor,
  loadMobileActionDay: state.loadMobileActionDay,
  publishMobileAction: state.publishMobileAction,
}))

import { ActionCreateScreen } from '../features/actions/action-create'
import { useActionCreateController } from '../features/actions/use-action-create-controller'

function textContent(node: TestRenderer.ReactTestInstance): string {
  return node.children.map((child) => typeof child === 'string' ? child : textContent(child)).join('')
}

function findButton(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity').find((node) => textContent(node).includes(label))
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise })
  return { promise, resolve }
}

async function flushMicrotasks(count = 4) {
  for (let index = 0; index < count; index += 1) await Promise.resolve()
}

async function renderScreen(onSessionExpired = vi.fn(), onStartAction = vi.fn()) {
  let renderer!: TestRenderer.ReactTestRenderer
  await act(async () => {
    renderer = TestRenderer.create(<ActionCreateScreen onSessionExpired={onSessionExpired} onStartAction={onStartAction} />)
  })
  return renderer
}

function ControllerProbe({ onController }: { onController: (controller: ReturnType<typeof useActionCreateController>) => void }) {
  onController(useActionCreateController({ onSessionExpired: vi.fn(), onStartAction: vi.fn() }))
  return null
}

describe('mobile action creation runtime', () => {
  beforeEach(() => {
    state.getItem.mockReset()
    state.setItem.mockClear()
    state.auth.isLoaded = true
    state.auth.isSignedIn = true
    state.auth.userId = 'user-a'
    state.createMobileAction.mockReset()
    state.updateMobileAction.mockReset()
    state.loadMobileActionEditor.mockClear()
    state.loadMobileActionDay.mockReset()
    state.publishMobileAction.mockReset()
    state.createLinkedMission.mockReset()
    state.foregroundPermission = 'granted'
    state.position = { latitude: 48.8566, longitude: 2.3522 }
    state.getCurrentPositionAsync.mockReset().mockResolvedValue({ coords: state.position })
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

  it('reads and writes only the current Clerk owner namespace', async () => {
    state.getItem.mockImplementation(async (key: string) => key.endsWith(':user-a')
      ? JSON.stringify({ ownerId: 'user-a', draft: { title: 'Brouillon A' } })
      : null)
    const renderer = await renderScreen()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' }), 'value')).toBe('Brouillon A')
    expect(state.setItem.mock.calls.every(([key]) => key.endsWith(':user-a'))).toBe(true)

    await act(async () => {
      state.auth.userId = 'user-b'
    renderer.update(<ActionCreateScreen onSessionExpired={vi.fn()} onStartAction={vi.fn()} />)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' }), 'value')).toBe('')
    expect(state.getItem).toHaveBeenCalledWith('cleanmymap.mobile.action-create.v1:user-b')
    expect(state.setItem.mock.calls.filter(([key]) => key.endsWith(':user-b')).length).toBeGreaterThan(0)
  })

  it('clears the exposed draft and blocks mutations after Clerk sign-out', async () => {
    state.getItem.mockImplementation(async (key: string) => key.endsWith(':user-a')
      ? JSON.stringify({ ownerId: 'user-a', actionId: 'action-a', draft: { title: 'Brouillon privé A' } })
      : null)
    const renderer = await renderScreen()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' }), 'value')).toBe('Brouillon privé A')

    await act(async () => {
      state.auth.isSignedIn = false
      state.auth.userId = null
    renderer.update(<ActionCreateScreen onSessionExpired={vi.fn()} onStartAction={vi.fn()} />)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' }), 'value')).toBe('')
    expect(testProp<boolean>(findButton(renderer, 'Enregistrer le brouillon'), 'disabled')).toBe(true)
    expect(state.createMobileAction).not.toHaveBeenCalled()
    expect(state.updateMobileAction).not.toHaveBeenCalled()
  })

  it('ignores a delayed read from the previous Clerk owner after an identity change', async () => {
    let resolveA!: (value: string | null) => void
    state.getItem.mockImplementation((key: string) => key.endsWith(':user-a')
      ? new Promise((resolve) => { resolveA = resolve })
      : Promise.resolve(null))
    const renderer = await renderScreen()

    await act(async () => {
      state.auth.userId = 'user-b'
    renderer.update(<ActionCreateScreen onSessionExpired={vi.fn()} onStartAction={vi.fn()} />)
      await Promise.resolve()
      resolveA(JSON.stringify({ ownerId: 'user-a', draft: { title: 'Ne pas réutiliser' } }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' }), 'value')).toBe('')
    expect(state.setItem.mock.calls.some(([key, value]) => key.endsWith(':user-a') && String(value).includes('Ne pas réutiliser'))).toBe(false)
  })

  it('does not write the previous owner draft into the next namespace before hydration', async () => {
    const ownerBRead = deferred<string | null>()
    state.getItem.mockImplementation((key: string) => {
      if (key.endsWith(':user-a')) return Promise.resolve(JSON.stringify({ ownerId: 'user-a', draft: { title: 'Brouillon A' } }))
      if (key.endsWith(':user-b')) return ownerBRead.promise
      return Promise.resolve(null)
    })
    const renderer = await renderScreen()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    state.setItem.mockClear()

    await act(async () => {
      state.auth.userId = 'user-b'
      renderer.update(<ActionCreateScreen onSessionExpired={vi.fn()} onStartAction={vi.fn()} />)
      await Promise.resolve()
    })

    expect(state.setItem.mock.calls.filter(([key]) => key.endsWith(':user-b'))).toHaveLength(0)

    await act(async () => {
      ownerBRead.resolve(null)
      await Promise.resolve()
      await Promise.resolve()
    })

    const ownerBWrites = state.setItem.mock.calls.filter(([key]) => key.endsWith(':user-b'))
    expect(ownerBWrites.length).toBeGreaterThan(0)
    expect(ownerBWrites.every(([, value]) => !String(value).includes('Brouillon A'))).toBe(true)
  })

  it('does not migrate an owner-less legacy global draft', async () => {
    state.getItem.mockImplementation(async (key: string) => key === 'cleanmymap.mobile.action-create.v1'
      ? JSON.stringify({ draft: { title: 'Ancien brouillon ambigu' } })
      : null)
    const renderer = await renderScreen()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' }), 'value')).toBe('')
    expect(state.setItem.mock.calls.some(([key, value]) => key === 'cleanmymap.mobile.action-create.v1:user-a' && String(value).includes('Ancien brouillon ambigu'))).toBe(false)
  })

  it('migrates a legacy global draft only when its Clerk owner is exact', async () => {
    state.getItem.mockImplementation(async (key: string) => key === 'cleanmymap.mobile.action-create.v1'
      ? JSON.stringify({ ownerId: 'user-a', draft: { title: 'Ancien brouillon A', association: 'Ancienne structure' }, clientRequestId: 'legacy-request-a' })
      : null)
    const renderer = await renderScreen()
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })

    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' }), 'value')).toBe('Ancien brouillon A')
    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Nom de la structure' }), 'value')).toBe('Ancienne structure')
    expect(renderer.root.findAll((node) => textContent(node).includes('Association'))).not.toHaveLength(0)
    expect(state.setItem.mock.calls.some(([key, value]) => key === 'cleanmymap.mobile.action-create.v1:user-a' && String(value).includes('legacy-request-a'))).toBe(true)
  })

  it('serializes concurrent writes and keeps the newest owner-scoped draft', async () => {
    let releaseFirst!: () => void
    let firstWrite = true
    state.getItem.mockResolvedValue(null)
    state.setItem.mockImplementation(async (key: string, value: string) => {
      if (firstWrite) {
        firstWrite = false
        await new Promise<void>((resolve) => { releaseFirst = resolve })
      }
      expect(key).toBe('cleanmymap.mobile.action-create.v1:user-a')
      void value
    })
    const renderer = await renderScreen()
    await act(async () => { await Promise.resolve() })
    const title = renderer.root.findByProps({ accessibilityLabel: 'Titre de l’action' })
    await act(async () => { callTestHandler(title, 'onChangeText', 'Version la plus récente') })
    expect(state.setItem).toHaveBeenCalledTimes(1)

    await act(async () => {
      releaseFirst()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(state.setItem).toHaveBeenCalledTimes(2)
    expect(String(state.setItem.mock.calls[1]?.[1])).toContain('Version la plus récente')
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

  it('ignores a late GPS response from the previous Clerk owner', async () => {
    state.getItem.mockResolvedValue(null)
    const gpsResponse = deferred<{ coords: { latitude: number; longitude: number } }>()
    state.getCurrentPositionAsync.mockReturnValue(gpsResponse.promise)
    const renderer = await renderScreen()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })

    let pendingGps!: Promise<unknown>
    await act(async () => {
      pendingGps = callTestHandler(findButton(renderer, 'Utiliser ma position actuelle'), 'onPress') as Promise<unknown>
      await Promise.resolve()
    })

    await act(async () => {
      state.auth.userId = 'user-b'
      renderer.update(<ActionCreateScreen onSessionExpired={vi.fn()} onStartAction={vi.fn()} />)
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => { await callTestHandler(findButton(renderer, 'Terrain'), 'onPress') })

    gpsResponse.resolve({ coords: { latitude: 51.5074, longitude: -0.1278 } })
    await act(async () => { await pendingGps; await Promise.resolve() })

    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Latitude' }), 'value')).toBe('')
    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Longitude' }), 'value')).toBe('')
    expect(renderer.root.findAll((node) => textContent(node).includes('Position actuelle ajoutée'))).toHaveLength(0)
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
    const onStartAction = vi.fn().mockRejectedValueOnce(new Error('liaison refusée'))
    state.loadMobileActionDay.mockRejectedValueOnce(new Error('briefing indisponible'))
    const renderer = await renderScreen(vi.fn(), onStartAction)

    await act(async () => { await callTestHandler(findButton(renderer, 'Relier une activité GPS'), 'onPress') })
    expect(renderer.root.findAll((node) => textContent(node).includes('liaison refusée'))).not.toHaveLength(0)
    await act(async () => { await callTestHandler(findButton(renderer, 'Charger Préparer / Jour J'), 'onPress') })
    expect(renderer.root.findAll((node) => textContent(node).includes('briefing indisponible'))).not.toHaveLength(0)
  })

  it('loads and renders the authorized preparation and day briefing', async () => {
    state.getItem.mockResolvedValueOnce(JSON.stringify({ actionId: 'action-day', section: 'verification', draft: { title: 'Action du jour' } }))
    state.loadMobileActionDay.mockResolvedValueOnce({
      status: 'ok',
      actionId: 'action-day',
      access: 'owner',
      action: {
        title: 'Action du jour',
        locationLabel: 'Parc central',
        meetingPoint: 'Entrée nord',
        meetingTime: '10:00',
        organizerLabel: 'Collectif local',
        safetyInstructions: 'Gants et chaussures fermées',
        materialsProvided: 'Sacs',
        accessibility: 'Terrain plat',
      },
    })
    const renderer = await renderScreen()

    await act(async () => { await callTestHandler(findButton(renderer, 'Charger Préparer / Jour J'), 'onPress') })

    expect(state.loadMobileActionDay).toHaveBeenCalledWith('action-day')
    expect(renderer.root.findAll((node) => textContent(node).includes('Entrée nord'))).not.toHaveLength(0)
    expect(renderer.root.findAll((node) => textContent(node).includes('Gants et chaussures fermées'))).not.toHaveLength(0)
    expect(renderer.root.findAll((node) => textContent(node).includes('Les informations Préparer / Jour J ont été chargées depuis le serveur.'))).not.toHaveLength(0)
  })

  it('keeps the latest briefing when refresh responses finish in reverse order', async () => {
    state.getItem.mockResolvedValueOnce(JSON.stringify({ actionId: 'action-refresh', section: 'verification', draft: { title: 'Action à rafraîchir' } }))
    const first = deferred<{ status: 'ok'; actionId: string; access: 'owner'; action: { title: string; meetingPoint: string } }>()
    const second = deferred<{ status: 'ok'; actionId: string; access: 'owner'; action: { title: string; meetingPoint: string } }>()
    state.loadMobileActionDay.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const renderer = await renderScreen()
    const loadButton = findButton(renderer, 'Charger Préparer / Jour J')

    let firstRequest!: Promise<unknown>
    let secondRequest!: Promise<unknown>
    await act(async () => {
      firstRequest = callTestHandler(loadButton, 'onPress') as Promise<unknown>
      secondRequest = callTestHandler(loadButton, 'onPress') as Promise<unknown>
    })
    expect(testProp<boolean>(findButton(renderer, 'Charger Préparer / Jour J'), 'disabled')).toBe(true)

    await act(async () => {
      second.resolve({ status: 'ok', actionId: 'action-refresh', access: 'owner', action: { title: 'Version récente', meetingPoint: 'Rendez-vous récent' } })
      await secondRequest
    })
    await act(async () => {
      first.resolve({ status: 'ok', actionId: 'action-refresh', access: 'owner', action: { title: 'Version obsolète', meetingPoint: 'Rendez-vous ancien' } })
      await firstRequest
    })

    expect(renderer.root.findAll((node) => textContent(node).includes('Rendez-vous récent'))).not.toHaveLength(0)
    expect(renderer.root.findAll((node) => textContent(node).includes('Rendez-vous ancien'))).toHaveLength(0)
  })

  it('ignores a briefing response after the selected action changes', async () => {
    state.getItem.mockResolvedValueOnce(JSON.stringify({ actionId: 'action-old', section: 'verification', draft: { title: 'Ancienne action' } }))
    const oldResponse = deferred<{ status: 'ok'; actionId: string; access: 'owner'; action: { title: string } }>()
    state.loadMobileActionDay.mockReturnValue(oldResponse.promise)
    let controller!: ReturnType<typeof useActionCreateController>
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<ControllerProbe onController={(value) => { controller = value }} />)
      await Promise.resolve()
      await Promise.resolve()
    })

    let request!: Promise<unknown>
    await act(async () => { request = controller.loadDayBriefing() })
    await act(async () => { controller.setActionId('action-new') })
    oldResponse.resolve({ status: 'ok', actionId: 'action-old', access: 'owner', action: { title: 'Briefing ancien' } })
    await act(async () => { await request })

    expect(controller.actionId).toBe('action-new')
    expect(controller.dayBriefing).toBeNull()
    expect(renderer.root.findAll((node) => textContent(node).includes('Briefing ancien'))).toHaveLength(0)
  })

  it('ignores a briefing response after a Clerk account change', async () => {
    state.getItem.mockImplementation(async (key: string) => key.endsWith(':user-a')
      ? JSON.stringify({ ownerId: 'user-a', actionId: 'action-a', section: 'verification', draft: { title: 'Action A' } })
      : JSON.stringify({ ownerId: 'user-b', actionId: 'action-b', section: 'verification', draft: { title: 'Action B' } }))
    const oldResponse = deferred<{ status: 'ok'; actionId: string; access: 'owner'; action: { title: string } }>()
    state.loadMobileActionDay.mockReturnValue(oldResponse.promise)
    const renderer = await renderScreen()
    let request!: Promise<unknown>
    await act(async () => { request = callTestHandler(findButton(renderer, 'Charger Préparer / Jour J'), 'onPress') as Promise<unknown> })

    await act(async () => {
      state.auth.userId = 'user-b'
      renderer.update(<ActionCreateScreen onSessionExpired={vi.fn()} onStartAction={vi.fn()} />)
      await Promise.resolve()
      await Promise.resolve()
    })
    oldResponse.resolve({ status: 'ok', actionId: 'action-a', access: 'owner', action: { title: 'Briefing du compte A' } })
    await act(async () => { await request })

    expect(renderer.root.findAll((node) => textContent(node).includes('Briefing du compte A'))).toHaveLength(0)
    expect(state.getItem).toHaveBeenCalledWith('cleanmymap.mobile.action-create.v1:user-b')
    expect(state.loadMobileActionDay).toHaveBeenCalledWith('action-a')
  })

  it('clears a prior briefing when refresh is refused by the server', async () => {
    state.getItem.mockResolvedValueOnce(JSON.stringify({ actionId: 'action-refused', section: 'verification', draft: { title: 'Action protégée' } }))
    state.loadMobileActionDay.mockResolvedValueOnce({ status: 'ok', actionId: 'action-refused', access: 'owner', action: { title: 'Briefing autorisé', meetingPoint: 'Point autorisé' } })
    state.loadMobileActionDay.mockRejectedValueOnce({ status: 403 })
    const renderer = await renderScreen()

    await act(async () => { await callTestHandler(findButton(renderer, 'Charger Préparer / Jour J'), 'onPress') })
    expect(renderer.root.findAll((node) => textContent(node).includes('Point autorisé'))).not.toHaveLength(0)
    await act(async () => { await callTestHandler(findButton(renderer, 'Actualiser Préparer / Jour J'), 'onPress') })

    expect(renderer.root.findAll((node) => textContent(node).includes('Point autorisé'))).toHaveLength(0)
    expect(renderer.root.findAll((node) => textContent(node).includes('Accès refusé pour cette action.'))).not.toHaveLength(0)
  })

  it('offers every canonical organizer choice without selecting association by default', async () => {
    const renderer = await renderScreen()
    const radios = renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity' && node.props.accessibilityRole === 'radio')

    expect(radios.map(textContent)).toEqual([
      'Action spontanée',
      'Entreprise',
      'Association',
      'Association étudiante',
      'Collectif',
      'Autre',
    ])
    expect(radios.every((radio) => testProp<{ checked?: boolean }>(radio, 'accessibilityState')?.checked === false)).toBe(true)
  })

  it.each([
    { label: 'Action spontanée', value: 'spontaneous', name: '' },
    { label: 'Entreprise', value: 'company', name: 'Entreprise locale' },
    { label: 'Collectif', value: 'collective', name: 'Collectif du parc' },
  ] as const)('persists the canonical organizer configuration: $label', async ({ label, value, name }) => {
    state.getItem.mockResolvedValue(null)
    const renderer = await renderScreen()

    await act(async () => { await callTestHandler(findButton(renderer, label), 'onPress') })
    if (value === 'spontaneous') {
      await act(async () => { await callTestHandler(findButton(renderer, 'Organisateur en attente de compte'), 'onPress') })
    } else if (name) {
      await act(async () => { callTestHandler(renderer.root.findByProps({ accessibilityLabel: 'Nom de la structure' }), 'onChangeText', name) })
    }
    for (let index = 0; index < 3; index += 1) {
      await act(async () => { await callTestHandler(findButton(renderer, 'Continuer'), 'onPress') })
    }
    await act(async () => { await callTestHandler(findButton(renderer, 'Publier'), 'onPress') })

    const payload = state.createMobileAction.mock.calls[0]?.[0] as Record<string, unknown> | undefined
    expect(payload).toMatchObject({
      organizerType: value,
      ...(value === 'spontaneous'
        ? { associationName: 'Action spontanée', organizerName: 'Organisateur en attente de compte', organizerAccounts: [] }
        : { associationName: name, organizerName: name }),
    })
  })

  it('refuses a spontaneous action without an account or the explicit pending option before POST', async () => {
    state.getItem.mockResolvedValue(null)
    const renderer = await renderScreen()

    await act(async () => { await callTestHandler(findButton(renderer, 'Action spontanée'), 'onPress') })
    for (let index = 0; index < 3; index += 1) {
      await act(async () => { await callTestHandler(findButton(renderer, 'Continuer'), 'onPress') })
    }
    await act(async () => { await callTestHandler(findButton(renderer, 'Publier'), 'onPress') })

    expect(state.createMobileAction).not.toHaveBeenCalled()
    expect(renderer.root.findAll((node) => textContent(node).includes('sélectionnez un compte organisateur'))).not.toHaveLength(0)
  })

  it('accepts a spontaneous action with an identified organizer account without sending a free name as identity', async () => {
    state.getItem.mockResolvedValue(null)
    const renderer = await renderScreen()

    await act(async () => { await callTestHandler(findButton(renderer, 'Action spontanée'), 'onPress') })
    await act(async () => { await callTestHandler(findButton(renderer, 'Continuer'), 'onPress') })
    await act(async () => { await callTestHandler(findButton(renderer, 'Continuer'), 'onPress') })
    await act(async () => { callTestHandler(renderer.root.findByProps({ accessibilityLabel: 'Comptes organisateurs (identifiants séparés par des virgules)' }), 'onChangeText', 'orga-1') })
    await act(async () => { await callTestHandler(findButton(renderer, 'Continuer'), 'onPress') })
    await act(async () => { await callTestHandler(findButton(renderer, 'Publier'), 'onPress') })

    expect(state.createMobileAction).toHaveBeenCalledWith(expect.objectContaining({
      organizerType: 'spontaneous',
      organizerAccounts: ['orga-1'],
      organizerName: undefined,
    }))
  })

  it('rejects a free spontaneous organizer name when it is not attached to an account', async () => {
    state.getItem.mockResolvedValue(null)
    const renderer = await renderScreen()

    await act(async () => { await callTestHandler(findButton(renderer, 'Action spontanée'), 'onPress') })
    await act(async () => { callTestHandler(renderer.root.findByProps({ accessibilityLabel: 'Nom affiché (optionnel, ne crée pas de compte)' }), 'onChangeText', 'Collectif non rattaché') })
    for (let index = 0; index < 3; index += 1) {
      await act(async () => { await callTestHandler(findButton(renderer, 'Continuer'), 'onPress') })
    }
    await act(async () => { await callTestHandler(findButton(renderer, 'Publier'), 'onPress') })

    expect(state.createMobileAction).not.toHaveBeenCalled()
    expect(renderer.root.findAll((node) => textContent(node).includes('Organisateur en attente de compte'))).not.toHaveLength(0)
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
    const onStartAction = vi.fn()
    const renderer = await renderScreen(vi.fn(), onStartAction)
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
    expect(onStartAction).toHaveBeenCalledWith('action-1', 'Action mobile')
    expect(renderer.root.findAll((node) => textContent(node).includes('Suivi GPS démarré'))).not.toHaveLength(0)
  })

  it('does not let an old GPS link completion clear or update a new owner operation', async () => {
    const ownerAStart = deferred<void>()
    const ownerBStart = deferred<void>()
    state.getItem.mockImplementation((key: string) => {
      if (key.endsWith(':user-a')) return Promise.resolve(JSON.stringify({ ownerId: 'user-a', actionId: 'action-a', draft: { title: 'Action A' } }))
      if (key.endsWith(':user-b')) return Promise.resolve(JSON.stringify({ ownerId: 'user-b', actionId: 'action-b', draft: { title: 'Action B' } }))
      return Promise.resolve(null)
    })
    const onStartAction = vi.fn()
      .mockImplementationOnce(() => ownerAStart.promise)
      .mockImplementationOnce(() => ownerBStart.promise)
    const renderer = await renderScreen(vi.fn(), onStartAction)
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    await act(async () => { await callTestHandler(findButton(renderer, 'Vérifier et publier'), 'onPress') })

    let pendingA!: Promise<unknown>
    await act(async () => {
      pendingA = callTestHandler(findButton(renderer, 'Relier une activité GPS'), 'onPress') as Promise<unknown>
      await Promise.resolve()
    })

    await act(async () => {
      state.auth.userId = 'user-b'
      renderer.update(<ActionCreateScreen onSessionExpired={vi.fn()} onStartAction={onStartAction} />)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => { await callTestHandler(findButton(renderer, 'Vérifier et publier'), 'onPress') })

    let pendingB!: Promise<unknown>
    await act(async () => {
      pendingB = callTestHandler(findButton(renderer, 'Relier une activité GPS'), 'onPress') as Promise<unknown>
      await Promise.resolve()
    })
    const disabledButtons = () => renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity' && node.props.disabled === true)
    expect(disabledButtons().length).toBeGreaterThan(0)

    ownerAStart.resolve()
    await act(async () => { await pendingA; await Promise.resolve() })

    expect(disabledButtons().length).toBeGreaterThan(0)
    expect(renderer.root.findAll((node) => textContent(node).includes('Suivi GPS démarré pour cette action.')).length).toBe(0)

    ownerBStart.resolve()
    await act(async () => { await pendingB; await Promise.resolve() })
    expect(disabledButtons()).toHaveLength(0)
    expect(renderer.root.findAll((node) => textContent(node).includes('Suivi GPS démarré pour cette action.')).length).toBeGreaterThan(0)
  })

  it('ignores a stale save response after Clerk A to B to A, even with the same user restored', async () => {
    state.getItem.mockImplementation(async (key: string) => key.endsWith(':user-a')
      ? JSON.stringify({ ownerId: 'user-a', draft: { title: 'Action A' } })
      : key.endsWith(':user-b')
        ? JSON.stringify({ ownerId: 'user-b', draft: { title: 'Action B' } })
        : null)
    const oldSave = deferred<{ status: 'created'; id: string; source: 'actions' }>()
    const currentSave = deferred<{ status: 'created'; id: string; source: 'actions' }>()
    state.createMobileAction.mockReturnValueOnce(oldSave.promise).mockReturnValueOnce(currentSave.promise)
    let controller!: ReturnType<typeof useActionCreateController>
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<ControllerProbe onController={(value) => { controller = value }} />)
      await flushMicrotasks()
    })

    let oldRequest!: Promise<unknown>
    await act(async () => { oldRequest = controller.saveDraft() })
    await act(async () => {
      state.auth.userId = 'user-b'
      renderer.update(<ControllerProbe onController={(value) => { controller = value }} />)
      await flushMicrotasks()
    })
    await act(async () => {
      state.auth.userId = 'user-a'
      renderer.update(<ControllerProbe onController={(value) => { controller = value }} />)
      await flushMicrotasks()
    })

    let currentRequest!: Promise<unknown>
    await act(async () => { currentRequest = controller.saveDraft() })
    const storageCallsBeforeOldResolution = state.setItem.mock.calls.length
    oldSave.resolve({ status: 'created', id: 'action-old', source: 'actions' })
    await act(async () => { await oldRequest; await flushMicrotasks() })

    expect(controller.actionId).toBeNull()
    expect(controller.busy).toBe(true)
    expect(renderer.root.findAll((node) => textContent(node).includes('Brouillon enregistré sur le serveur'))).toHaveLength(0)
    expect(state.setItem.mock.calls.slice(storageCallsBeforeOldResolution).some(([key, value]) => key.endsWith(':user-a') && value.includes('action-old'))).toBe(false)

    currentSave.resolve({ status: 'created', id: 'action-current', source: 'actions' })
    await act(async () => { await currentRequest; await flushMicrotasks() })
    expect(controller.actionId).toBe('action-current')
    expect(controller.message).toContain('Brouillon enregistré sur le serveur')
  })

  it('ignores a stale linked-GPS completion after Clerk A to B to A', async () => {
    state.getItem.mockImplementation((key: string) => {
      if (key.endsWith(':user-a')) return Promise.resolve(JSON.stringify({ ownerId: 'user-a', actionId: 'action-a', section: 'verification', draft: { title: 'Action A' } }))
      if (key.endsWith(':user-b')) return Promise.resolve(JSON.stringify({ ownerId: 'user-b', actionId: 'action-b', section: 'verification', draft: { title: 'Action B' } }))
      return Promise.resolve(null)
    })
    const oldLink = deferred<void>()
    const currentLink = deferred<void>()
    const onStartAction = vi.fn().mockReturnValueOnce(oldLink.promise).mockReturnValueOnce(currentLink.promise)
    const renderer = await renderScreen(vi.fn(), onStartAction)
    await act(async () => { await flushMicrotasks() })

    let oldRequest!: Promise<unknown>
    await act(async () => { oldRequest = callTestHandler(findButton(renderer, 'Relier une activité GPS'), 'onPress') as Promise<unknown> })
    await act(async () => {
      state.auth.userId = 'user-b'
      renderer.update(<ActionCreateScreen onSessionExpired={vi.fn()} onStartAction={onStartAction} />)
      await flushMicrotasks()
    })
    await act(async () => {
      state.auth.userId = 'user-a'
      renderer.update(<ActionCreateScreen onSessionExpired={vi.fn()} onStartAction={onStartAction} />)
      await flushMicrotasks()
    })

    let currentRequest!: Promise<unknown>
    await act(async () => { currentRequest = callTestHandler(findButton(renderer, 'Relier une activité GPS'), 'onPress') as Promise<unknown> })
    oldLink.resolve()
    await act(async () => { await oldRequest; await flushMicrotasks() })
    expect(renderer.root.findAll((node) => textContent(node).includes('Suivi GPS démarré pour cette action.'))).toHaveLength(0)
    expect(renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity' && node.props.disabled === true).length).toBeGreaterThan(0)

    currentLink.resolve()
    await act(async () => { await currentRequest; await flushMicrotasks() })
    expect(renderer.root.findAll((node) => textContent(node).includes('Suivi GPS démarré pour cette action.'))).not.toHaveLength(0)
  })

  it('applies only the current GPS position after Clerk A to B to A', async () => {
    state.getItem.mockImplementation((key: string) => key.endsWith(':user-a')
      ? Promise.resolve(JSON.stringify({ ownerId: 'user-a', draft: { title: 'Action A' } }))
      : key.endsWith(':user-b')
        ? Promise.resolve(JSON.stringify({ ownerId: 'user-b', draft: { title: 'Action B' } }))
        : Promise.resolve(null))
    const oldPosition = deferred<{ coords: { latitude: number; longitude: number } }>()
    const currentPosition = deferred<{ coords: { latitude: number; longitude: number } }>()
    state.getCurrentPositionAsync.mockReturnValueOnce(oldPosition.promise).mockReturnValueOnce(currentPosition.promise)
    const renderer = await renderScreen()
    await act(async () => { await flushMicrotasks() })

    let oldRequest!: Promise<unknown>
    await act(async () => { oldRequest = callTestHandler(findButton(renderer, 'Utiliser ma position actuelle'), 'onPress') as Promise<unknown> })
    await act(async () => {
      state.auth.userId = 'user-b'
      renderer.update(<ActionCreateScreen onSessionExpired={vi.fn()} onStartAction={vi.fn()} />)
      await flushMicrotasks()
    })
    await act(async () => {
      state.auth.userId = 'user-a'
      renderer.update(<ActionCreateScreen onSessionExpired={vi.fn()} onStartAction={vi.fn()} />)
      await flushMicrotasks()
    })

    let currentRequest!: Promise<unknown>
    await act(async () => { currentRequest = callTestHandler(findButton(renderer, 'Utiliser ma position actuelle'), 'onPress') as Promise<unknown> })
    oldPosition.resolve({ coords: { latitude: 1.111111, longitude: 2.222222 } })
    await act(async () => { await oldRequest; await flushMicrotasks() })
    await act(async () => { await callTestHandler(findButton(renderer, 'Terrain'), 'onPress') })
    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Latitude' }), 'value')).not.toBe('1.111111')
    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Longitude' }), 'value')).not.toBe('2.222222')

    currentPosition.resolve({ coords: { latitude: 3.333333, longitude: 4.444444 } })
    await act(async () => { await currentRequest; await flushMicrotasks() })
    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Latitude' }), 'value')).toBe('3.333333')
    expect(testProp<string>(renderer.root.findByProps({ accessibilityLabel: 'Longitude' }), 'value')).toBe('4.444444')
  })

  it('keeps only the current briefing after Clerk A to B to A', async () => {
    state.getItem.mockImplementation((key: string) => {
      if (key.endsWith(':user-a')) return Promise.resolve(JSON.stringify({ ownerId: 'user-a', actionId: 'action-a', section: 'verification', draft: { title: 'Action A' } }))
      if (key.endsWith(':user-b')) return Promise.resolve(JSON.stringify({ ownerId: 'user-b', actionId: 'action-b', section: 'verification', draft: { title: 'Action B' } }))
      return Promise.resolve(null)
    })
    const oldBriefing = deferred<{ status: 'ok'; actionId: string; access: 'owner'; action: { title: string; meetingPoint: string } }>()
    const currentBriefing = deferred<{ status: 'ok'; actionId: string; access: 'owner'; action: { title: string; meetingPoint: string } }>()
    state.loadMobileActionDay.mockReturnValueOnce(oldBriefing.promise).mockReturnValueOnce(currentBriefing.promise)
    const renderer = await renderScreen()
    await act(async () => { await flushMicrotasks() })

    let oldRequest!: Promise<unknown>
    await act(async () => { oldRequest = callTestHandler(findButton(renderer, 'Charger Préparer / Jour J'), 'onPress') as Promise<unknown> })
    await act(async () => {
      state.auth.userId = 'user-b'
      renderer.update(<ActionCreateScreen onSessionExpired={vi.fn()} onStartAction={vi.fn()} />)
      await flushMicrotasks()
    })
    await act(async () => {
      state.auth.userId = 'user-a'
      renderer.update(<ActionCreateScreen onSessionExpired={vi.fn()} onStartAction={vi.fn()} />)
      await flushMicrotasks()
    })

    let currentRequest!: Promise<unknown>
    await act(async () => { currentRequest = callTestHandler(findButton(renderer, 'Charger Préparer / Jour J'), 'onPress') as Promise<unknown> })
    oldBriefing.resolve({ status: 'ok', actionId: 'action-a', access: 'owner', action: { title: 'Briefing A ancien', meetingPoint: 'Rendez-vous A ancien' } })
    await act(async () => { await oldRequest; await flushMicrotasks() })
    expect(renderer.root.findAll((node) => textContent(node).includes('Rendez-vous A ancien'))).toHaveLength(0)

    currentBriefing.resolve({ status: 'ok', actionId: 'action-a', access: 'owner', action: { title: 'Briefing A courant', meetingPoint: 'Rendez-vous A courant' } })
    await act(async () => { await currentRequest; await flushMicrotasks() })
    expect(renderer.root.findAll((node) => textContent(node).includes('Rendez-vous A courant'))).not.toHaveLength(0)
  })
})
