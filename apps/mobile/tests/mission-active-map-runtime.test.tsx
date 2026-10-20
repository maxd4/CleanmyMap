import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionLocation } from '../types/mission'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  foregroundPermission: 'granted',
  currentPosition: {
    coords: { latitude: 48.8566, longitude: 2.3522 },
    timestamp: Date.parse('2026-10-20T10:00:00.000Z'),
  },
  localTrack: [] as Array<{ latitude: number; longitude: number; recordedAt: string }>,
  serverResult: { ok: true, data: [] as MissionLocation[] } as any,
  appStateListener: undefined as ((nextState: string) => void) | undefined,
  appStateRemove: vi.fn(),
  watchCallback: undefined as ((location: any) => void) | undefined,
  watchRemove: vi.fn(),
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  getStoredTrack: vi.fn(),
  saveStoredTrack: vi.fn(),
  getMissionTrack: vi.fn(),
}))

vi.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  AppState: {
    addEventListener: vi.fn((_event: string, listener: (nextState: string) => void) => {
      state.appStateListener = listener
      return { remove: state.appStateRemove }
    }),
  },
  StyleSheet: { create: (styles: unknown) => styles },
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}))

vi.mock('react-native-maps', () => ({
  default: 'MapView',
  Marker: 'Marker',
  Polyline: 'Polyline',
}))

vi.mock('expo-location', () => ({
  Accuracy: { High: 'high' },
  getForegroundPermissionsAsync: vi.fn(async () => ({ status: state.foregroundPermission })),
  getCurrentPositionAsync: state.getCurrentPosition,
  watchPositionAsync: state.watchPosition,
}))

vi.mock('../lib/storage', () => ({
  getStoredForegroundTrack: state.getStoredTrack,
  saveStoredForegroundTrack: state.saveStoredTrack,
}))

vi.mock('../lib/tracking-service', () => ({
  getMissionTrack: state.getMissionTrack,
}))

vi.mock('../screens/emergency-call-actions', () => ({
  EmergencyCallActions: 'EmergencyCallActions',
}))

import { MissionActiveMap } from '../screens/mission-active-map'

const serverPoints: MissionLocation[] = [
  {
    id: 1,
    client_point_id: 'server-1',
    mission_id: 'mission-1',
    latitude: 48.8566,
    longitude: 2.3522,
    recorded_at: '2026-10-20T10:00:00.000Z',
  },
  {
    id: 2,
    client_point_id: 'server-2',
    mission_id: 'mission-1',
    latitude: 48.857,
    longitude: 2.353,
    recorded_at: '2026-10-20T10:01:00.000Z',
  },
]

const baseProps = {
  ownerId: 'user_123',
  missionId: 'mission-1',
  missionLabel: 'Mission Paris',
  duration: '00:10:00',
  pendingGpsPointCount: 0,
  errorMsg: null as string | null,
  onStop: vi.fn(),
}

function location(timestamp = '2026-10-20T10:02:00.000Z', latitude = 48.858, longitude = 2.354) {
  return {
    coords: { latitude, longitude },
    timestamp: Date.parse(timestamp),
  }
}

function textValues(renderer: TestRenderer.ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType('Text' as any)
    .flatMap((node) => Array.isArray(node.props.children) ? node.props.children : [node.props.children])
    .filter((value): value is string => typeof value === 'string')
}

async function settle() {
  await Promise.resolve()
  await Promise.resolve()
}

async function renderMap(props = baseProps) {
  let renderer!: TestRenderer.ReactTestRenderer
  await act(async () => {
    renderer = TestRenderer.create(<MissionActiveMap {...props} />)
    await settle()
  })
  return renderer
}

beforeEach(() => {
  state.foregroundPermission = 'granted'
  state.currentPosition = location()
  state.localTrack = []
  state.serverResult = { ok: true, data: [] }
  state.appStateListener = undefined
  state.appStateRemove.mockReset()
  state.watchCallback = undefined
  state.watchRemove.mockReset()
  state.getCurrentPosition.mockReset().mockResolvedValue(state.currentPosition)
  state.watchPosition.mockReset().mockImplementation(async (_options: unknown, callback: (value: unknown) => void) => {
    state.watchCallback = callback
    return { remove: state.watchRemove }
  })
  state.getStoredTrack.mockReset().mockImplementation(async () => state.localTrack)
  state.saveStoredTrack.mockReset().mockResolvedValue(undefined)
  state.getMissionTrack.mockReset().mockImplementation(async () => state.serverResult)
  vi.clearAllMocks()
})

describe('MissionActiveMap runtime', () => {
  it('restores and deduplicates server/local points, follows GPS and renders marker plus polyline', async () => {
    state.localTrack = [
      { latitude: 48.8566, longitude: 2.3522, recordedAt: '2026-10-20T10:00:00.000Z' },
      { latitude: 48.858, longitude: 2.354, recordedAt: '2026-10-20T10:02:00.000Z' },
    ]
    state.serverResult = { ok: true, data: serverPoints }
    const renderer = await renderMap({ ...baseProps, pendingGpsPointCount: 2 })

    expect(textValues(renderer)).toContain('GPS — LIVE')
    expect(textValues(renderer)).toContain('2 point(s) à synchroniser')
    expect(renderer.root.findAllByType('Marker' as any)).toHaveLength(1)
    expect(renderer.root.findAllByType('Polyline' as any)).toHaveLength(1)
    expect(state.getStoredTrack).toHaveBeenCalledWith('user_123', 'mission-1')
    expect(state.getMissionTrack).toHaveBeenCalledWith('mission-1')
    expect(state.saveStoredTrack).toHaveBeenCalled()

    await act(async () => {
      state.watchCallback?.(location())
      await settle()
    })
    expect(state.saveStoredTrack).toHaveBeenLastCalledWith(
      'user_123',
      'mission-1',
      expect.arrayContaining([expect.objectContaining({ latitude: 48.858, longitude: 2.354 })]),
    )
  })

  it('shows restoration while requests are pending and ignores late restoration after unmount', async () => {
    let resolveLocal!: (value: typeof state.localTrack) => void
    let resolveServer!: (value: typeof state.serverResult) => void
    state.getStoredTrack.mockReturnValueOnce(new Promise((resolve) => { resolveLocal = resolve }))
    state.getMissionTrack.mockReturnValueOnce(new Promise((resolve) => { resolveServer = resolve }))
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<MissionActiveMap {...baseProps} />)
    })
    expect(textValues(renderer)).toContain('RESTAURATION DU TRACÉ...')

    await act(async () => renderer.unmount())
    resolveLocal([])
    resolveServer({ ok: true, data: serverPoints })
    await act(async () => { await settle() })
    expect(state.getCurrentPosition).not.toHaveBeenCalled()
    expect(state.watchPosition).not.toHaveBeenCalled()
  })

  it('handles permission denial and location failure without fabricating a live point', async () => {
    state.foregroundPermission = 'denied'
    const deniedRenderer = await renderMap()
    expect(textValues(deniedRenderer)).toContain('GPS — PERMISSION REQUISE')
    expect(state.getCurrentPosition).not.toHaveBeenCalled()

    state.foregroundPermission = 'granted'
    state.getCurrentPosition.mockReset().mockRejectedValueOnce(new Error('location unavailable'))
    const offlineRenderer = await renderMap()
    expect(textValues(offlineRenderer)).toContain('GPS — HORS LIGNE')
    expect(textValues(offlineRenderer)).toContain('location unavailable')

    state.getCurrentPosition.mockReset().mockRejectedValueOnce('location unavailable')
    const unknownErrorRenderer = await renderMap()
    expect(textValues(unknownErrorRenderer)).toContain('Position live indisponible.')
  })

  it('formats long live distances and renders the explicit mission error state', async () => {
    state.localTrack = [
      { latitude: 48.8566, longitude: 2.3522, recordedAt: '2026-10-20T10:00:00.000Z' },
      { latitude: 48.8766, longitude: 2.3722, recordedAt: '2026-10-20T10:01:00.000Z' },
    ]
    const renderer = await renderMap({ ...baseProps, errorMsg: 'Finalisation impossible' })
    expect(textValues(renderer).some((value) => value.endsWith('km'))).toBe(true)
    expect(textValues(renderer)).toContain('Finalisation impossible')
  })

  it('keeps local points when the server is offline and distinguishes an empty local fallback', async () => {
    state.localTrack = [{ latitude: 48.8566, longitude: 2.3522, recordedAt: '2026-10-20T10:00:00.000Z' }]
    state.serverResult = { ok: false, error: 'Réseau indisponible' }
    const localRenderer = await renderMap()
    expect(textValues(localRenderer)).toContain('Réseau indisponible — tracé local conservé.')

    state.localTrack = []
    const emptyRenderer = await renderMap()
    expect(textValues(emptyRenderer)).toContain('Réseau indisponible')
  })

  it('stops and resumes the foreground subscription across AppState transitions', async () => {
    const renderer = await renderMap()
    expect(state.appStateListener).toBeTypeOf('function')
    expect(state.watchPosition).toHaveBeenCalledOnce()
    const staleCallback = state.watchCallback

    await act(async () => {
      state.appStateListener?.('background')
      staleCallback?.(location('2026-10-20T10:03:00.000Z'))
      await settle()
    })
    expect(state.watchRemove).toHaveBeenCalledOnce()
    expect(textValues(renderer)).toContain('GPS — ARRIÈRE-PLAN')

    await act(async () => {
      state.appStateListener?.('inactive')
      await settle()
    })
    expect(textValues(renderer)).toContain('GPS — ARRIÈRE-PLAN')

    await act(async () => {
      state.appStateListener?.('active')
      await settle()
    })
    expect(state.watchPosition).toHaveBeenCalledTimes(2)

    await act(async () => renderer.unmount())
    expect(state.appStateRemove).toHaveBeenCalledOnce()
    expect(state.watchRemove).toHaveBeenCalledTimes(2)
  })

  it('removes a subscription whose watch request resolves after unmount', async () => {
    let resolveWatch!: (value: { remove: typeof state.watchRemove }) => void
    state.watchPosition.mockImplementationOnce(async () => new Promise((resolve) => { resolveWatch = resolve }))
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<MissionActiveMap {...baseProps} />)
      await settle()
    })
    await act(async () => renderer.unmount())
    resolveWatch({ remove: state.watchRemove })
    await act(async () => { await settle() })
    expect(state.watchRemove).toHaveBeenCalledOnce()
  })

  it('does not persist invalid coordinates or timestamps from a live callback', async () => {
    const renderer = await renderMap()
    await act(async () => {
      state.watchCallback?.({
        coords: { latitude: Number.NaN, longitude: 2.354 },
        timestamp: Date.parse('2026-10-20T10:03:00.000Z'),
      })
      state.watchCallback?.({
        coords: { latitude: 48.858, longitude: 2.354 },
        timestamp: Number.NaN,
      })
      await settle()
    })
    expect(renderer.root.findAllByType('Polyline' as any)).toHaveLength(0)
    expect(state.saveStoredTrack).toHaveBeenCalledTimes(1)
    expect(textValues(renderer)).toContain('Position GPS invalide.')
  })
})
