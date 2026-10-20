import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
vi.mock('../lib/mobile-actions-service', () => ({
  createMobileSignalement: state.createMobileSignalement,
  loadMyMobileSignalements: state.loadMyMobileSignalements,
}))
vi.mock('../lib/signalement-media-service', () => ({
  loadSignalementMedia: state.loadSignalementMedia,
  pickSignalementPhotos: state.pickSignalementPhotos,
  uploadSignalementPhotos: state.uploadSignalementPhotos,
}))

import { SignalementScreen } from '../screens/signalement'

function textContent(node: TestRenderer.ReactTestInstance): string {
  return node.children.map((child) => typeof child === 'string' ? child : textContent(child)).join('')
}

function findButton(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity').find((node) => textContent(node).includes(label))
}

async function settle() {
  await Promise.resolve()
  await Promise.resolve()
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
    await act(async () => { await submit?.props.onPress(); await settle() })
    expect(state.createMobileSignalement).not.toHaveBeenCalled()
    expect(renderer.root.findAll((node) => textContent(node).includes('Indiquez un lieu et une position valide'))).not.toHaveLength(0)

    state.permission = 'denied'
    const locate = findButton(renderer, 'Utiliser ma position actuelle')
    await act(async () => { await locate?.props.onPress(); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('La permission de localisation est nécessaire'))).not.toHaveLength(0)
  })

  it('creates a spot with categories and reports partial photo upload without claiming all evidence succeeded', async () => {
    state.pickSignalementPhotos.mockResolvedValue([{ uri: 'file:///photo.jpg', fileName: 'photo.jpg', mimeType: 'image/jpeg', fileSize: 120, width: 100, height: 80 }])
    state.uploadSignalementPhotos.mockResolvedValue({ uploadedCount: 1, failed: [{ photo: { uri: 'file:///second.jpg' }, message: 'échec upload' }] })
    const { renderer } = await renderScreen()
    const label = renderer.root.findByProps({ accessibilityLabel: 'Lieu ou repère' })
    const latitude = renderer.root.findByProps({ accessibilityLabel: 'Latitude' })
    const longitude = renderer.root.findByProps({ accessibilityLabel: 'Longitude' })
    await act(async () => {
      label.props.onChangeText('Parc central')
      latitude.props.onChangeText('48.8566')
      longitude.props.onChangeText('2.3522')
    })
    await act(async () => { await findButton(renderer, 'Plastique')?.props.onPress() })
    await act(async () => { await findButton(renderer, 'Ajouter des preuves photo')?.props.onPress(); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('1 photo(s) sélectionnée(s)'))).not.toHaveLength(0)

    await act(async () => { await findButton(renderer, 'Transmettre le signalement')?.props.onPress(); await settle() })
    expect(state.createMobileSignalement).toHaveBeenCalledWith({ type: 'spot', label: 'Parc central', latitude: 48.8566, longitude: 2.3522, notes: undefined, wasteCategories: ['plastic'] })
    expect(state.uploadSignalementPhotos).toHaveBeenCalledWith('spot-1', expect.any(Array))
    expect(renderer.root.findAll((node) => textContent(node).includes('1 photo(s) transmise(s), 1 à reprendre'))).not.toHaveLength(0)
  })

  it('submits a clean-place observation without spot categories and accepts GPS coordinates', async () => {
    const { renderer } = await renderScreen()
    await act(async () => { await findButton(renderer, 'Lieu propre')?.props.onPress() })
    await act(async () => { await findButton(renderer, 'Utiliser ma position actuelle')?.props.onPress(); await settle() })
    await act(async () => { renderer.root.findByProps({ accessibilityLabel: 'Lieu ou repère' }).props.onChangeText('Quai nettoyé') })
    await act(async () => { await findButton(renderer, 'Transmettre le signalement')?.props.onPress(); await settle() })
    expect(state.createMobileSignalement).toHaveBeenCalledWith({ type: 'clean_place', label: 'Quai nettoyé', latitude: 48.8566, longitude: 2.3522, notes: undefined, wasteCategories: undefined })
  })

  it('supports photo selection retry, evidence reading and session expiration', async () => {
    state.pickSignalementPhotos.mockRejectedValueOnce(new Error('galerie indisponible')).mockResolvedValueOnce([{ uri: 'file:///retry.jpg', fileName: 'retry.jpg' }])
    state.loadMyMobileSignalements.mockResolvedValue({ status: 'ok', items: [{ id: 'spot-2', label: 'Observation existante', type: 'spot', createdAt: '2026-10-20T10:00:00.000Z', status: 'new' }] })
    state.loadSignalementMedia.mockResolvedValue([{ id: 'media-1', originalName: 'preuve.jpg', signedUrl: 'https://signed.test/photo.jpg' }])
    const { renderer } = await renderScreen()
    const photos = findButton(renderer, 'Ajouter des preuves photo')
    await act(async () => { await photos?.props.onPress(); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('galerie indisponible'))).not.toHaveLength(0)
    await act(async () => { await findButton(renderer, 'Ajouter des preuves photo')?.props.onPress(); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('1 photo(s) sélectionnée(s)'))).not.toHaveLength(0)

    await act(async () => { await findButton(renderer, 'Voir les preuves photo')?.props.onPress(); await settle() })
    expect(state.loadSignalementMedia).toHaveBeenCalledWith('spot-2')
    expect(renderer.root.findByProps({ accessibilityLabel: 'Preuve photo preuve.jpg' })).toBeDefined()

    state.loadMyMobileSignalements.mockRejectedValueOnce({ status: 401 })
    const expired = vi.fn()
    const second = await renderScreen(expired)
    expect(expired).toHaveBeenCalledOnce()
    expect(second.renderer.root.findAll((node) => textContent(node).includes('Observation existante'))).toHaveLength(0)
  })
})
