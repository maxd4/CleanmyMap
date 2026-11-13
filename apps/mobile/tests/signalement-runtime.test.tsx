import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callTestHandler } from './test-renderer-helpers'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  permission: 'granted' as 'granted' | 'denied',
  position: { latitude: 48.8566, longitude: 2.3522 },
  loadMyMobileSignalements: vi.fn(),
  createMobileSignalement: vi.fn(),
  pickSignalementPhotos: vi.fn(),
  uploadSignalementPhotos: vi.fn(),
  loadSignalementMedia: vi.fn(),
}))

function nativeComponent(name: string) {
  return function NativeComponent({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) {
    return React.createElement(name, props, children)
  }
}

vi.mock('react-native', () => ({
  ActivityIndicator: nativeComponent('ActivityIndicator'),
  Image: nativeComponent('Image'),
  StyleSheet: { create: (styles: unknown) => styles },
  Text: nativeComponent('Text'),
  TextInput: nativeComponent('TextInput'),
  TouchableOpacity: nativeComponent('TouchableOpacity'),
  View: nativeComponent('View'),
}))
vi.mock('@expo/vector-icons', () => ({ Ionicons: nativeComponent('Ionicons') }))
vi.mock('expo-location', () => ({
  Accuracy: { Balanced: 'balanced' },
  requestForegroundPermissionsAsync: vi.fn(async () => ({ status: state.permission })),
  getCurrentPositionAsync: vi.fn(async () => ({ coords: state.position })),
}))
vi.mock('../features/actions/mobile-actions-service', () => ({
  createMobileSignalement: state.createMobileSignalement,
  loadMyMobileSignalements: state.loadMyMobileSignalements,
}))
vi.mock('../features/signalements/signalement-media-service', () => ({
  loadSignalementMedia: state.loadSignalementMedia,
  pickSignalementPhotos: state.pickSignalementPhotos,
  uploadSignalementPhotos: state.uploadSignalementPhotos,
}))

import { SignalementScreen } from '../features/signalements/signalement'

function textContent(node: TestRenderer.ReactTestInstance): string {
  return node.children.map((child) => typeof child === 'string' ? child : textContent(child)).join('')
}

function findButton(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity').find((node) => textContent(node).includes(label))
}

function flattenStyle(node: TestRenderer.ReactTestInstance): Record<string, unknown> {
  const styles = Array.isArray(node.props.style) ? node.props.style : [node.props.style]
  return styles.filter(Boolean).reduce<Record<string, unknown>>((result, style) => ({ ...result, ...style }), {})
}

async function settle() {
  await Promise.resolve()
  await Promise.resolve()
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

async function renderScreen(onSessionExpired = vi.fn()) {
  let renderer!: TestRenderer.ReactTestRenderer
  await act(async () => {
    renderer = TestRenderer.create(<SignalementScreen onSessionExpired={onSessionExpired} />)
    await settle()
  })
  return { renderer, onSessionExpired }
}

describe('mobile signalement runtime', () => {
  beforeEach(() => {
    state.permission = 'granted'
    state.position = { latitude: 48.8566, longitude: 2.3522 }
    state.loadMyMobileSignalements.mockReset().mockResolvedValue({ status: 'ok', items: [] })
    state.createMobileSignalement.mockReset().mockResolvedValue({ status: 'created', source: 'trash_spotter_spots', item: { id: 'spot-1' } })
    state.pickSignalementPhotos.mockReset().mockResolvedValue([])
    state.uploadSignalementPhotos.mockReset().mockResolvedValue({ uploadedCount: 0, failed: [] })
    state.loadSignalementMedia.mockReset().mockResolvedValue([])
  })

  it('keeps invalid observations local and exposes the explicit location permission error', async () => {
    const { renderer } = await renderScreen()
    const submit = findButton(renderer, 'Transmettre le signalement')
    await act(async () => { await callTestHandler(submit, 'onPress'); await settle() })
    expect(state.createMobileSignalement).not.toHaveBeenCalled()
    expect(renderer.root.findAll((node) => textContent(node).includes('Indiquez un lieu et une position valide'))).not.toHaveLength(0)

    state.permission = 'denied'
    const locate = findButton(renderer, 'Utiliser ma position actuelle')
    await act(async () => { await callTestHandler(locate, 'onPress'); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('La permission de localisation est nécessaire'))).not.toHaveLength(0)
  })

  it('keeps loading, success-empty, initial failure and retry states distinct', async () => {
    let resolveInitial!: (value: unknown) => void
    state.loadMyMobileSignalements.mockReset().mockReturnValueOnce(new Promise((resolve) => { resolveInitial = resolve }))
    let pendingRenderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      pendingRenderer = TestRenderer.create(<SignalementScreen onSessionExpired={vi.fn()} />)
      await Promise.resolve()
    })

    const refresh = pendingRenderer.root.findByProps({ accessibilityLabel: 'Actualiser mes observations' })
    expect(refresh?.props.accessibilityRole).toBe('button')
    expect(flattenStyle(refresh!)).toMatchObject({ minWidth: 44, minHeight: 44, flexShrink: 0, marginLeft: 8 })
    expect(flattenStyle(refresh!.parent!)).toMatchObject({ gap: 8 })
    expect(pendingRenderer.root.findAll((node) => String(node.type) === 'ActivityIndicator')).not.toHaveLength(0)
    expect(textContent(pendingRenderer.root)).not.toContain('Aucune observation transmise depuis ce compte.')

    resolveInitial({ status: 'ok', items: [] })
    await act(async () => { await settle() })
    expect(textContent(pendingRenderer.root)).toContain('Aucune observation transmise depuis ce compte.')
    pendingRenderer.unmount()

    state.loadMyMobileSignalements.mockReset().mockRejectedValueOnce(new Error('réseau indisponible'))
    const failed = await renderScreen()
    expect(textContent(failed.renderer.root)).toContain('réseau indisponible')
    expect(textContent(failed.renderer.root)).not.toContain('Aucune observation transmise depuis ce compte.')

    const observed = { id: 'spot-retry', label: 'Observation reprise', type: 'spot', createdAt: '2026-10-20T10:00:00.000Z', status: 'new' }
    state.loadMyMobileSignalements.mockResolvedValueOnce({ status: 'ok', items: [observed] })
    await act(async () => { await callTestHandler(failed.renderer.root.findByProps({ accessibilityLabel: 'Actualiser mes observations' }), 'onPress'); await settle() })
    expect(textContent(failed.renderer.root)).toContain('Observation reprise')
    expect(textContent(failed.renderer.root)).not.toContain('réseau indisponible')

    state.loadMyMobileSignalements.mockRejectedValueOnce(new Error('réseau interrompu'))
    await act(async () => { await callTestHandler(failed.renderer.root.findByProps({ accessibilityLabel: 'Actualiser mes observations' }), 'onPress'); await settle() })
    expect(textContent(failed.renderer.root)).toContain('Observation reprise')
    expect(textContent(failed.renderer.root)).toContain('réseau interrompu')
    expect(textContent(failed.renderer.root)).not.toContain('Aucune observation transmise depuis ce compte.')
  })

  it('keeps an observations load error visible across successful photo selection and an independent form error', async () => {
    state.loadMyMobileSignalements.mockReset().mockRejectedValueOnce(new Error('observations indisponibles'))
    state.pickSignalementPhotos.mockResolvedValueOnce([{ uri: 'file:///retry.jpg', fileName: 'retry.jpg' }])
    const { renderer } = await renderScreen()

    expect(textContent(renderer.root)).toContain('observations indisponibles')
    await act(async () => { await callTestHandler(findButton(renderer, 'Ajouter des preuves photo'), 'onPress'); await settle() })
    expect(textContent(renderer.root)).toContain('1 photo(s) sélectionnée(s)')
    expect(textContent(renderer.root)).toContain('observations indisponibles')

    await act(async () => { await callTestHandler(findButton(renderer, 'Transmettre le signalement'), 'onPress'); await settle() })
    expect(textContent(renderer.root)).toContain('Indiquez un lieu et une position valide')
    expect(textContent(renderer.root)).toContain('observations indisponibles')
  })

  it('ignores an older observations refresh when overlapping requests resolve in reverse order', async () => {
    state.loadMyMobileSignalements.mockReset().mockResolvedValueOnce({ status: 'ok', items: [] })
    const { renderer } = await renderScreen()
    const older = deferred<{ status: 'ok'; items: Array<{ id: string; label: string; type: 'spot'; createdAt: string; status: string }> }>()
    const newer = deferred<{ status: 'ok'; items: Array<{ id: string; label: string; type: 'spot'; createdAt: string; status: string }> }>()
    state.loadMyMobileSignalements.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
    const refresh = () => renderer.root.findByProps({ accessibilityLabel: 'Actualiser mes observations' })

    await act(async () => {
      await callTestHandler(refresh(), 'onPress')
      await callTestHandler(refresh(), 'onPress')
    })

    await act(async () => {
      newer.resolve({ status: 'ok', items: [{ id: 'spot-new', label: 'Observation récente', type: 'spot', createdAt: '2026-10-20T10:00:00.000Z', status: 'new' }] })
      await settle()
    })
    expect(textContent(renderer.root)).toContain('Observation récente')

    await act(async () => {
      older.resolve({ status: 'ok', items: [{ id: 'spot-old', label: 'Observation obsolète', type: 'spot', createdAt: '2026-10-20T10:00:00.000Z', status: 'new' }] })
      await settle()
    })
    expect(textContent(renderer.root)).toContain('Observation récente')
    expect(textContent(renderer.root)).not.toContain('Observation obsolète')

    const staleAfterError = deferred<{ status: 'ok'; items: Array<{ id: string; label: string; type: 'spot'; createdAt: string; status: string }> }>()
    const latestFailure = deferred<{ status: 'ok'; items: Array<{ id: string; label: string; type: 'spot'; createdAt: string; status: string }> }>()
    state.loadMyMobileSignalements.mockReturnValueOnce(staleAfterError.promise).mockReturnValueOnce(latestFailure.promise)
    await act(async () => {
      await callTestHandler(refresh(), 'onPress')
      await callTestHandler(refresh(), 'onPress')
    })
    await act(async () => {
      latestFailure.reject(new Error('dernier rafraîchissement indisponible'))
      await settle()
    })
    expect(textContent(renderer.root)).toContain('dernier rafraîchissement indisponible')
    await act(async () => {
      staleAfterError.resolve({ status: 'ok', items: [{ id: 'spot-stale-error', label: 'Résultat obsolète après erreur', type: 'spot', createdAt: '2026-10-20T10:00:00.000Z', status: 'new' }] })
      await settle()
    })
    expect(textContent(renderer.root)).not.toContain('Résultat obsolète après erreur')
    expect(textContent(renderer.root)).toContain('dernier rafraîchissement indisponible')
  })

  it('creates a spot with categories and reports partial photo upload without claiming all evidence succeeded', async () => {
    state.pickSignalementPhotos.mockResolvedValue([{ uri: 'file:///photo.jpg', fileName: 'photo.jpg', mimeType: 'image/jpeg', fileSize: 120, width: 100, height: 80 }])
    state.uploadSignalementPhotos.mockResolvedValue({ uploadedCount: 1, failed: [{ photo: { uri: 'file:///second.jpg' }, message: 'échec upload' }] })
    const { renderer } = await renderScreen()
    const label = renderer.root.findByProps({ accessibilityLabel: 'Lieu ou repère' })
    const latitude = renderer.root.findByProps({ accessibilityLabel: 'Latitude' })
    const longitude = renderer.root.findByProps({ accessibilityLabel: 'Longitude' })
    await act(async () => {
      callTestHandler(label, 'onChangeText', 'Parc central')
      callTestHandler(latitude, 'onChangeText', '48.8566')
      callTestHandler(longitude, 'onChangeText', '2.3522')
    })
    await act(async () => { await callTestHandler(findButton(renderer, 'Plastique'), 'onPress') })
    await act(async () => { await callTestHandler(findButton(renderer, 'Ajouter des preuves photo'), 'onPress'); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('1 photo(s) sélectionnée(s)'))).not.toHaveLength(0)

    await act(async () => { await callTestHandler(findButton(renderer, 'Transmettre le signalement'), 'onPress'); await settle() })
    expect(state.createMobileSignalement).toHaveBeenCalledWith({ type: 'spot', label: 'Parc central', latitude: 48.8566, longitude: 2.3522, notes: undefined, wasteCategories: ['plastic'] })
    expect(state.uploadSignalementPhotos).toHaveBeenCalledWith('spot-1', expect.any(Array))
    expect(renderer.root.findAll((node) => textContent(node).includes('1 photo(s) transmise(s), 1 à reprendre'))).not.toHaveLength(0)
  })

  it('submits a clean-place observation without spot categories and accepts GPS coordinates', async () => {
    const { renderer } = await renderScreen()
    await act(async () => { await callTestHandler(findButton(renderer, 'Lieu propre'), 'onPress') })
    await act(async () => { await callTestHandler(findButton(renderer, 'Utiliser ma position actuelle'), 'onPress'); await settle() })
    await act(async () => { callTestHandler(renderer.root.findByProps({ accessibilityLabel: 'Lieu ou repère' }), 'onChangeText', 'Quai nettoyé') })
    await act(async () => { await callTestHandler(findButton(renderer, 'Transmettre le signalement'), 'onPress'); await settle() })
    expect(state.createMobileSignalement).toHaveBeenCalledWith({ type: 'clean_place', label: 'Quai nettoyé', latitude: 48.8566, longitude: 2.3522, notes: undefined, wasteCategories: undefined })
  })

  it('supports photo selection retry, evidence reading and session expiration', async () => {
    state.pickSignalementPhotos.mockRejectedValueOnce(new Error('galerie indisponible')).mockResolvedValueOnce([{ uri: 'file:///retry.jpg', fileName: 'retry.jpg' }])
    state.loadMyMobileSignalements.mockResolvedValue({ status: 'ok', items: [{ id: 'spot-2', label: 'Observation existante', type: 'spot', createdAt: '2026-10-20T10:00:00.000Z', status: 'new' }] })
    state.loadSignalementMedia.mockResolvedValue([{ id: 'media-1', originalName: 'preuve.jpg', signedUrl: 'https://signed.test/photo.jpg' }])
    const { renderer } = await renderScreen()
    const photos = findButton(renderer, 'Ajouter des preuves photo')
    await act(async () => { await callTestHandler(photos, 'onPress'); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('galerie indisponible'))).not.toHaveLength(0)
    await act(async () => { await callTestHandler(findButton(renderer, 'Ajouter des preuves photo'), 'onPress'); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('1 photo(s) sélectionnée(s)'))).not.toHaveLength(0)

    await act(async () => { await callTestHandler(findButton(renderer, 'Voir les preuves photo'), 'onPress'); await settle() })
    expect(state.loadSignalementMedia).toHaveBeenCalledWith('spot-2')
    expect(renderer.root.findByProps({ accessibilityLabel: 'Preuve photo preuve.jpg' })).toBeDefined()

    state.loadMyMobileSignalements.mockRejectedValueOnce({ status: 401 })
    const expired = vi.fn()
    const second = await renderScreen(expired)
    expect(expired).toHaveBeenCalledOnce()
    expect(second.renderer.root.findAll((node) => textContent(node).includes('Observation existante'))).toHaveLength(0)
    expect(textContent(second.renderer.root)).not.toContain('Aucune observation transmise depuis ce compte.')
  })

  it('keeps the form editable after a server rejection and exposes a generic non-Error failure', async () => {
    state.createMobileSignalement.mockRejectedValueOnce(new Error('service indisponible')).mockRejectedValueOnce('unknown failure')
    const { renderer } = await renderScreen()
    const label = renderer.root.findByProps({ accessibilityLabel: 'Lieu ou repère' })
    const latitude = renderer.root.findByProps({ accessibilityLabel: 'Latitude' })
    const longitude = renderer.root.findByProps({ accessibilityLabel: 'Longitude' })
    await act(async () => {
      callTestHandler(label, 'onChangeText', 'Parc central')
      callTestHandler(latitude, 'onChangeText', '48.8566')
      callTestHandler(longitude, 'onChangeText', '2.3522')
    })
    await act(async () => { await callTestHandler(findButton(renderer, 'Transmettre le signalement'), 'onPress'); await settle() })
    expect(textContent(renderer.root)).toContain('service indisponible')
    expect(renderer.root.findByProps({ accessibilityLabel: 'Lieu ou repère' }).props.value).toBe('Parc central')

    await act(async () => { await callTestHandler(findButton(renderer, 'Transmettre le signalement'), 'onPress'); await settle() })
    expect(textContent(renderer.root)).toContain('Le signalement n’a pas abouti.')
  })

  it('expires the session instead of claiming a created observation after a 401', async () => {
    state.createMobileSignalement.mockRejectedValueOnce({ status: 401 })
    const onSessionExpired = vi.fn()
    const { renderer } = await renderScreen(onSessionExpired)
    await act(async () => {
      callTestHandler(renderer.root.findByProps({ accessibilityLabel: 'Lieu ou repère' }), 'onChangeText', 'Parc')
      callTestHandler(renderer.root.findByProps({ accessibilityLabel: 'Latitude' }), 'onChangeText', '48.8566')
      callTestHandler(renderer.root.findByProps({ accessibilityLabel: 'Longitude' }), 'onChangeText', '2.3522')
    })
    await act(async () => { await callTestHandler(findButton(renderer, 'Transmettre le signalement'), 'onPress'); await settle() })

    expect(onSessionExpired).toHaveBeenCalledOnce()
    expect(textContent(renderer.root)).not.toContain('Signalement transmis et confirmé par le serveur.')
  })

  it('renders a neutral position error when the native location provider rejects a non-Error value', async () => {
    state.permission = 'granted'
    const location = await import('expo-location')
    vi.mocked(location.getCurrentPositionAsync).mockRejectedValueOnce('gps failure')
    const { renderer } = await renderScreen()

    await act(async () => { await callTestHandler(findButton(renderer, 'Utiliser ma position actuelle'), 'onPress'); await settle() })
    expect(textContent(renderer.root)).toContain('La position actuelle est indisponible.')
  })

  it('keeps an empty evidence result distinct from a failed evidence read', async () => {
    state.loadMyMobileSignalements.mockResolvedValue({ status: 'ok', items: [{ id: 'spot-3', label: 'Place', type: 'spot', createdAt: '2026-10-20T10:00:00.000Z', status: 'new' }] })
    state.loadSignalementMedia.mockResolvedValueOnce([]).mockRejectedValueOnce('media failure')
    const { renderer } = await renderScreen()
    const evidenceButton = findButton(renderer, 'Voir les preuves photo')
    await act(async () => { await callTestHandler(evidenceButton, 'onPress'); await settle() })
    expect(textContent(renderer.root)).toContain('Aucune preuve photo accessible.')

    await act(async () => { await callTestHandler(findButton(renderer, 'Voir les preuves photo'), 'onPress'); await settle() })
    expect(textContent(renderer.root)).toContain('Les preuves photo sont indisponibles.')
  })
})
