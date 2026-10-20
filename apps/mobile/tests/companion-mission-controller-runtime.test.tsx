import React, { useEffect } from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mission } from '../types/mission'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  auth: { isLoaded: false, isSignedIn: false, userId: null as string | null },
  signOut: vi.fn(async () => undefined),
  restoreActiveTracking: vi.fn(),
  getMission: vi.fn(),
  startMobileMission: vi.fn(),
  stopTracking: vi.fn(),
  clearStoredForegroundTrack: vi.fn(),
  flushBuffer: vi.fn(),
  reconcilePendingLinkedMissions: vi.fn(),
  getPendingGpsPointCount: vi.fn(),
  refreshPendingGpsPointCount: vi.fn(async () => undefined),
  alert: vi.fn(),
  appStateListener: undefined as ((state: string) => void) | undefined,
  appStateRemove: vi.fn(),
}))

vi.mock('@clerk/expo', () => ({
  useAuth: () => state.auth,
  useClerk: () => ({ signOut: state.signOut }),
}))
vi.mock('react-native', () => ({
  Alert: { alert: state.alert },
  AppState: { addEventListener: vi.fn((_event: string, listener: (nextState: string) => void) => { state.appStateListener = listener; return { remove: state.appStateRemove } }) },
}))
vi.mock('../lib/tracking-service', () => ({
  getMission: state.getMission,
  restoreActiveTracking: state.restoreActiveTracking,
  startMobileMission: state.startMobileMission,
  stopTracking: state.stopTracking,
}))
vi.mock('../lib/storage', () => ({
  clearStoredForegroundTrack: state.clearStoredForegroundTrack,
  flushBuffer: state.flushBuffer,
  getPendingGpsPointCount: state.getPendingGpsPointCount,
}))
vi.mock('../lib/linked-mission-service', () => ({ reconcilePendingLinkedMissions: state.reconcilePendingLinkedMissions }))
vi.mock('../lib/pending-gps-point-polling', () => ({ usePendingGpsPointCountPolling: () => state.refreshPendingGpsPointCount }))

import { useCompanionMissionController } from '../hooks/use-companion-mission-controller'

const mission: Mission = { id: 'mission-1', volunteer_id: 'user-a', action_id: null, label: 'Action terrain', status: 'tracking', started_at: '2026-10-20T10:00:00.000Z', ended_at: null, distance_m: null, duration_s: null, created_at: '2026-10-20T09:59:00.000Z' }

function Probe({ onChange }: { onChange: (value: ReturnType<typeof useCompanionMissionController>) => void }) {
  const controller = useCompanionMissionController()
  useEffect(() => { onChange(controller) }, [controller, onChange])
  return null
}

async function settle() {
  await Promise.resolve()
  await Promise.resolve()
}

async function renderController() {
  let latest!: ReturnType<typeof useCompanionMissionController>
  const onChange = (value: ReturnType<typeof useCompanionMissionController>) => { latest = value }
  let renderer!: TestRenderer.ReactTestRenderer
  await act(async () => {
    renderer = TestRenderer.create(<Probe onChange={onChange} />)
    await settle()
  })
  return { renderer, getController: () => latest }
}

describe('mobile companion mission controller runtime', () => {
  beforeEach(() => {
    state.auth = { isLoaded: false, isSignedIn: false, userId: null }
    state.signOut.mockClear()
    state.restoreActiveTracking.mockReset().mockResolvedValue(null)
    state.getMission.mockReset().mockResolvedValue({ ok: false, error: 'absent' })
    state.startMobileMission.mockReset().mockResolvedValue({ ok: true, data: mission })
    state.stopTracking.mockReset().mockResolvedValue({ ok: true, data: { ...mission, status: 'completed', ended_at: '2026-10-20T10:30:00.000Z', distance_m: 120, duration_s: 1800 } })
    state.clearStoredForegroundTrack.mockReset().mockResolvedValue(undefined)
    state.flushBuffer.mockReset().mockResolvedValue(undefined)
    state.reconcilePendingLinkedMissions.mockReset().mockResolvedValue(undefined)
    state.getPendingGpsPointCount.mockReset().mockResolvedValue(2)
    state.refreshPendingGpsPointCount.mockClear()
    state.alert.mockReset()
    state.appStateListener = undefined
    state.appStateRemove.mockClear()
    vi.useRealTimers()
  })

  it('starts idle and does not restore or mutate while Clerk is not ready or signed out', async () => {
    const { getController } = await renderController()
    expect(getController().phase).toBe('idle')
    expect(getController().mission).toBeNull()
    expect(state.restoreActiveTracking).not.toHaveBeenCalled()
    await act(async () => { await getController().handleStartMobileMission() })
    expect(getController().errorMsg).toBe('Connexion Clerk requise pour démarrer une mission.')
    expect(state.startMobileMission).not.toHaveBeenCalled()
    expect(state.alert).toHaveBeenCalledWith('Connexion requise', 'Connexion Clerk requise pour démarrer une mission.')
  })

  it('restores a tracking mission, refreshes pending points and removes AppState listeners on unmount', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    state.restoreActiveTracking.mockResolvedValue('mission-1')
    state.getMission.mockResolvedValue({ ok: true, data: mission })
    const { renderer, getController } = await renderController()
    await act(async () => { await settle() })
    expect(state.reconcilePendingLinkedMissions).toHaveBeenCalledWith('user-a')
    expect(state.flushBuffer).toHaveBeenCalledWith('user-a')
    expect(state.getMission).toHaveBeenCalledWith('mission-1')
    expect(getController().phase).toBe('tracking')
    expect(getController().mission?.id).toBe('mission-1')
    expect(state.refreshPendingGpsPointCount).toHaveBeenCalled()
    expect(state.appStateListener).toBeTypeOf('function')

    await act(async () => { renderer.unmount() })
    expect(state.appStateRemove).toHaveBeenCalledOnce()
  })

  it('starts tracking, handles session expiry and clears the duration timer at unmount', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    const { renderer, getController } = await renderController()
    await act(async () => { await getController().handleStartMobileMission(); await settle() })
    expect(state.startMobileMission).toHaveBeenCalledWith('user-a')
    expect(getController().phase).toBe('tracking')
    expect(getController().mission?.id).toBe('mission-1')

    await act(async () => { await getController().handleSessionExpired() })
    expect(state.signOut).toHaveBeenCalledOnce()
    expect(getController().errorMsg).toContain('session Clerk a expiré')
    await act(async () => { renderer.unmount() })
  })

  it('keeps a mission active after a finalization failure and completes it after retry', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    const { getController } = await renderController()
    await act(async () => { await getController().handleStartMobileMission(); await settle() })

    state.stopTracking.mockResolvedValueOnce({ ok: false, error: 'synchronisation impossible' })
    await act(async () => { getController().handleStop() })
    const firstAlert = state.alert.mock.calls.at(-1)?.[2] as Array<{ text: string; onPress?: () => void }>
    await act(async () => { await firstAlert.find((button) => button.text === 'Terminer')?.onPress?.(); await settle() })
    expect(getController().phase).toBe('tracking')
    expect(getController().errorMsg).toBe('synchronisation impossible')
    expect(state.clearStoredForegroundTrack).not.toHaveBeenCalled()

    await act(async () => { getController().handleStop() })
    const secondAlert = state.alert.mock.calls.at(-1)?.[2] as Array<{ text: string; onPress?: () => void }>
    await act(async () => { await secondAlert.find((button) => button.text === 'Terminer')?.onPress?.(); await settle() })
    expect(state.stopTracking).toHaveBeenCalledTimes(2)
    expect(state.clearStoredForegroundTrack).toHaveBeenCalledWith('user-a', 'mission-1')
    expect(getController().phase).toBe('idle')
    expect(getController().completionSummary?.status).toBe('completed')
  })
})
