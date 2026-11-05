import React, { useEffect } from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mission } from '../features/tracking/mission'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  auth: { isLoaded: false, isSignedIn: false, userId: null as string | null },
  signOut: vi.fn(async () => undefined),
  restoreActiveTracking: vi.fn(),
  getMission: vi.fn(),
  ensureNativeTracking: vi.fn(),
  startMobileMission: vi.fn(),
  stopTracking: vi.fn(),
  clearStoredForegroundTrack: vi.fn(),
  flushBuffer: vi.fn(),
  reconcilePendingLinkedMissions: vi.fn(),
  getPendingGpsPointCount: vi.fn(),
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
vi.mock('../features/tracking/tracking-service', () => ({
  getMission: state.getMission,
  ensureNativeTracking: state.ensureNativeTracking,
  restoreActiveTracking: state.restoreActiveTracking,
  startMobileMission: state.startMobileMission,
  stopTracking: state.stopTracking,
}))
vi.mock('../shared/lib/storage', () => ({
  clearStoredForegroundTrack: state.clearStoredForegroundTrack,
  flushBuffer: state.flushBuffer,
  getPendingGpsPointCount: state.getPendingGpsPointCount,
}))
vi.mock('../features/tracking/linked-mission-service', () => ({ reconcilePendingLinkedMissions: state.reconcilePendingLinkedMissions }))

import { useCompanionMissionController } from '../features/tracking/use-companion-mission-controller'

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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise })
  return { promise, resolve }
}

async function renderController() {
  let latest!: ReturnType<typeof useCompanionMissionController>
  const onChange = (value: ReturnType<typeof useCompanionMissionController>) => { latest = value }
  let renderer!: TestRenderer.ReactTestRenderer
  await act(async () => {
    renderer = TestRenderer.create(<Probe onChange={onChange} />)
    await settle()
  })
  return {
    renderer,
    getController: () => latest,
    update: async () => {
      await act(async () => {
        renderer.update(<Probe onChange={onChange} />)
        await settle()
      })
    },
  }
}

describe('mobile companion mission controller runtime', () => {
  beforeEach(() => {
    state.auth = { isLoaded: false, isSignedIn: false, userId: null }
    state.signOut.mockClear()
    state.restoreActiveTracking.mockReset().mockResolvedValue(null)
    state.getMission.mockReset().mockResolvedValue({ ok: false, error: 'absent' })
    state.ensureNativeTracking.mockReset().mockImplementation(async (_missionId: string, _ownerId: string, knownMission: Mission) => ({ ok: true, data: knownMission }))
    state.startMobileMission.mockReset().mockResolvedValue({ ok: true, data: mission })
    state.stopTracking.mockReset().mockResolvedValue({ ok: true, data: { ...mission, status: 'completed', ended_at: '2026-10-20T10:30:00.000Z', distance_m: 120, duration_s: 1800 } })
    state.clearStoredForegroundTrack.mockReset().mockResolvedValue(undefined)
    state.flushBuffer.mockReset().mockResolvedValue(undefined)
    state.reconcilePendingLinkedMissions.mockReset().mockResolvedValue(undefined)
    state.getPendingGpsPointCount.mockReset().mockResolvedValue(2)
    state.alert.mockReset()
    state.appStateListener = undefined
    state.appStateRemove.mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
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
    expect(state.ensureNativeTracking).toHaveBeenCalledWith('mission-1', 'user-a', mission)
    expect(getController().phase).toBe('tracking')
    expect(getController().mission?.id).toBe('mission-1')
    expect(state.getPendingGpsPointCount).toHaveBeenCalledWith('user-a')
    expect(state.appStateListener).toBeTypeOf('function')

    await act(async () => { renderer.unmount() })
    expect(state.appStateRemove).toHaveBeenCalledOnce()
  })

  it('keeps the pending count scoped to the current Clerk owner across A to B to sign-out', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    state.restoreActiveTracking.mockResolvedValue('mission-1')
    state.getMission.mockResolvedValue({ ok: true, data: mission })
    const pendingReads: Array<{ owner: string; resolve: (count: number) => void }> = []
    state.getPendingGpsPointCount.mockImplementation((owner: string) => new Promise<number>((resolve) => {
      pendingReads.push({ owner, resolve })
    }))

    const { renderer, getController, update } = await renderController()
    await act(async () => { await settle() })
    expect(pendingReads.some((read) => read.owner === 'user-a')).toBe(true)

    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-b' }
    await update()
    expect(getController().pendingGpsPointCount).toBe(0)

    pendingReads.filter((read) => read.owner === 'user-a').forEach((read) => read.resolve(41))
    pendingReads.filter((read) => read.owner === 'user-b').forEach((read) => read.resolve(52))
    await act(async () => { await settle() })
    expect(getController().pendingGpsPointCount).toBe(52)

    state.auth = { isLoaded: true, isSignedIn: false, userId: null }
    await update()
    expect(getController().pendingGpsPointCount).toBe(0)
    await act(async () => { renderer.unmount() })
  })

  it('does not present a restored mission as tracking when native GPS is unavailable and offers explicit retry', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    state.restoreActiveTracking.mockResolvedValue('mission-1')
    state.getMission.mockResolvedValue({ ok: true, data: mission })
    state.ensureNativeTracking
      .mockResolvedValueOnce({ ok: false, error: 'Le suivi GPS est interrompu.' })
      .mockResolvedValue({ ok: true, data: mission })
    const { getController } = await renderController()
    await act(async () => { await settle() })

    expect(getController().phase).toBe('error')
    expect(getController().mission).toBeNull()
    expect(getController().errorMsg).toBe('Le suivi GPS est interrompu.')

    await act(async () => { getController().handleRetryMission(); await settle() })
    expect(getController().phase).toBe('tracking')
    expect(getController().mission?.id).toBe('mission-1')
  })

  it('ignores an obsolete native restoration after Clerk A to B to A', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    state.restoreActiveTracking.mockResolvedValue('mission-1')
    state.getMission.mockResolvedValue({ ok: true, data: mission })
    const oldRestore = deferred<{ ok: true; data: Mission }>()
    const currentRestore = deferred<{ ok: true; data: Mission }>()
    state.ensureNativeTracking.mockReturnValueOnce(oldRestore.promise).mockReturnValue(currentRestore.promise)
    let latest!: ReturnType<typeof useCompanionMissionController>
    const onChange = (value: ReturnType<typeof useCompanionMissionController>) => { latest = value }
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<Probe onChange={onChange} />)
      await settle()
    })
    expect(state.ensureNativeTracking).toHaveBeenCalledWith('mission-1', 'user-a', mission)

    await act(async () => {
      state.auth.userId = 'user-b'
      renderer.update(<Probe onChange={onChange} />)
      await settle()
    })
    await act(async () => {
      state.auth.userId = 'user-a'
      renderer.update(<Probe onChange={onChange} />)
      await settle()
    })

    oldRestore.resolve({ ok: true, data: mission })
    await act(async () => { await oldRestore.promise; await settle() })
    expect(latest.phase).not.toBe('tracking')
    expect(latest.mission).toBeNull()

    currentRestore.resolve({ ok: true, data: mission })
    await act(async () => { await currentRestore.promise; await settle() })
    expect(latest.phase).toBe('tracking')
    expect(latest.mission?.id).toBe('mission-1')
  })

  it('keeps the recent AppState success when an older restoration fails later', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    state.restoreActiveTracking.mockResolvedValue('mission-1')
    state.getMission.mockResolvedValue({ ok: true, data: mission })
    const olderRestore = deferred<{ ok: true; data: Mission } | { ok: false; error: string }>()
    const recentRestore = deferred<{ ok: true; data: Mission } | { ok: false; error: string }>()
    state.ensureNativeTracking.mockReturnValueOnce(olderRestore.promise).mockReturnValueOnce(recentRestore.promise)
    const { getController } = await renderController()
    await act(async () => { await settle() })

    await act(async () => {
      state.appStateListener?.('active')
      await settle()
    })
    recentRestore.resolve({ ok: true, data: mission })
    await act(async () => { await recentRestore.promise; await settle() })
    expect(getController().phase).toBe('tracking')

    olderRestore.resolve({ ok: false, error: 'ancienne reprise refusée' })
    await act(async () => { await olderRestore.promise; await settle() })
    expect(getController().phase).toBe('tracking')
    expect(getController().mission?.id).toBe('mission-1')
    expect(getController().errorMsg).toBeNull()
  })

  it('lets the recent AppState error replace an older success without a stale recovery', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    state.restoreActiveTracking.mockResolvedValue('mission-1')
    state.getMission.mockResolvedValue({ ok: true, data: mission })
    const olderRestore = deferred<{ ok: true; data: Mission } | { ok: false; error: string }>()
    const recentRestore = deferred<{ ok: true; data: Mission } | { ok: false; error: string }>()
    state.ensureNativeTracking.mockReturnValueOnce(olderRestore.promise).mockReturnValueOnce(recentRestore.promise)
    const { getController } = await renderController()
    await act(async () => { await settle() })

    olderRestore.resolve({ ok: true, data: mission })
    await act(async () => { await olderRestore.promise; await settle() })
    expect(getController().phase).toBe('tracking')

    await act(async () => {
      state.appStateListener?.('active')
      await settle()
    })
    recentRestore.resolve({ ok: false, error: 'GPS indisponible' })
    await act(async () => { await recentRestore.promise; await settle() })
    expect(getController().phase).toBe('error')
    expect(getController().mission).toBeNull()
    expect(getController().errorMsg).toBe('GPS indisponible')
  })

  it('starts tracking, handles session expiry and clears the duration timer at unmount', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    const { renderer, getController } = await renderController()
    await act(async () => { await getController().handleStartMobileMission(); await settle() })
    expect(state.startMobileMission).toHaveBeenCalledWith('user-a', 'Action bénévole mobile', undefined)
    expect(getController().phase).toBe('tracking')
    expect(getController().mission?.id).toBe('mission-1')

    await act(async () => { await getController().handleSessionExpired() })
    expect(state.signOut).toHaveBeenCalledOnce()
    expect(getController().errorMsg).toContain('session Clerk a expiré')
    await act(async () => { renderer.unmount() })
  })

  it('returns to idle without inventing a mission when the authenticated start fails', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    state.startMobileMission.mockResolvedValueOnce({ ok: false, error: 'Permission GPS refusée.' })
    const { getController } = await renderController()

    await act(async () => { await getController().handleStartMobileMission() })

    expect(getController().phase).toBe('idle')
    expect(getController().mission).toBeNull()
    expect(getController().errorMsg).toBe('Permission GPS refusée.')
    expect(state.alert).toHaveBeenCalledWith('Suivi GPS impossible', 'Permission GPS refusée.')
  })

  it('hides A data on the first render under B and ignores a late start from A', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    let resolveStart!: (value: { ok: true; data: Mission }) => void
    state.startMobileMission.mockReturnValueOnce(new Promise((resolve) => { resolveStart = resolve }))
    const { getController, update } = await renderController()

    const startPromise = getController().handleStartMobileMission()
    await act(async () => { await Promise.resolve() })
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-b' }
    await update()
    expect(getController().mission).toBeNull()
    expect(getController().pendingGpsPointCount).toBe(0)
    expect(getController().completionSummary).toBeNull()

    resolveStart({ ok: true, data: mission })
    await act(async () => { await startPromise; await settle() })
    expect(getController().mission).toBeNull()
    expect(getController().errorMsg).toBeNull()
  })

  it('rejects a confirmation callback created under A after B has resumed a mission', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    const missionB = { ...mission, id: 'mission-b', volunteer_id: 'user-b' }
    state.startMobileMission
      .mockResolvedValueOnce({ ok: true, data: mission })
      .mockResolvedValueOnce({ ok: true, data: missionB })
    const { getController, update } = await renderController()
    await act(async () => { await getController().handleStartMobileMission(); await settle() })
    await act(async () => { getController().handleStop() })
    const buttons = state.alert.mock.calls.at(-1)?.[2] as Array<{ text: string; onPress?: () => void }>
    const obsoleteConfirmation = buttons.find((button) => button.text === 'Terminer')?.onPress

    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-b' }
    await update()
    await act(async () => { await getController().handleStartMobileMission(); await settle() })
    expect(getController().mission?.volunteer_id).toBe('user-b')

    await act(async () => { obsoleteConfirmation?.(); await settle() })

    expect(state.stopTracking).not.toHaveBeenCalled()
    expect(getController().mission?.volunteer_id).toBe('user-b')
    expect(getController().phase).toBe('tracking')
    expect(getController().finalizationStage).toBeNull()
  })

  it('rejects a start callback captured under A before it can call the tracking service for B', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    const startA = await renderController()
    const obsoleteStart = startA.getController().handleStartMobileMission

    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-b' }
    await startA.update()
    await act(async () => { obsoleteStart(); await settle() })

    expect(state.startMobileMission).not.toHaveBeenCalled()
    expect(startA.getController().mission).toBeNull()
    expect(startA.getController().phase).toBe('idle')
  })

  it('rejects an old return-home callback without clearing B mission state', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    const { getController, update } = await renderController()
    const obsoleteReturnHome = getController().handleReturnHome

    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-b' }
    await update()
    state.startMobileMission.mockResolvedValueOnce({ ok: true, data: { ...mission, id: 'mission-b', volunteer_id: 'user-b' } })
    await act(async () => { await getController().handleStartMobileMission(); await settle() })
    expect(getController().mission?.volunteer_id).toBe('user-b')

    await act(async () => { obsoleteReturnHome(); await settle() })

    expect(getController().mission?.volunteer_id).toBe('user-b')
    expect(getController().phase).toBe('tracking')
  })

  it('does not retain A completion or apply a late finalization after switching to B', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    const finalization = deferred<{ ok: true; data: Mission }>()
    state.stopTracking.mockReturnValueOnce(finalization.promise)
    const { getController, update } = await renderController()
    await act(async () => { await getController().handleStartMobileMission(); await settle() })

    await act(async () => { getController().handleStop() })
    const buttons = state.alert.mock.calls.at(-1)?.[2] as Array<{ text: string; onPress?: () => void }>
    const finalizationPromise = buttons.find((button) => button.text === 'Terminer')?.onPress?.()
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-b' }
    await update()
    expect(getController().mission).toBeNull()
    expect(getController().completionSummary).toBeNull()
    expect(getController().finalizationStage).toBeNull()

    finalization.resolve({ ok: true, data: { ...mission, status: 'completed' } })
    await act(async () => { await finalizationPromise; await settle() })
    expect(getController().completionSummary).toBeNull()
    expect(state.clearStoredForegroundTrack).not.toHaveBeenCalled()
  })

  it('restores the current B mission while an older A restoration resolves later', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    const restoreA = deferred<string | null>()
    const restoreB = deferred<string | null>()
    state.restoreActiveTracking.mockReturnValueOnce(restoreA.promise).mockReturnValueOnce(restoreB.promise)
    state.getMission.mockResolvedValue({ ok: true, data: { ...mission, volunteer_id: 'user-b' } })
    const { getController, update } = await renderController()

    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-b' }
    await update()
    restoreB.resolve('mission-1')
    await act(async () => { await restoreB.promise; await settle() })
    expect(getController().mission?.volunteer_id).toBe('user-b')
    expect(getController().phase).toBe('tracking')

    restoreA.resolve('mission-1')
    await act(async () => { await restoreA.promise; await settle() })
    expect(getController().mission?.volunteer_id).toBe('user-b')
    expect(getController().phase).toBe('tracking')
  })

  it('retries restoration when the application becomes active again after a closed-app interruption', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    state.restoreActiveTracking
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('mission-1')
    state.getMission.mockResolvedValue({ ok: true, data: mission })
    const { getController } = await renderController()
    await act(async () => { await settle() })
    expect(getController().phase).toBe('idle')

    await act(async () => {
      state.appStateListener?.('active')
      await settle()
    })

    expect(state.restoreActiveTracking).toHaveBeenCalledTimes(2)
    expect(getController().phase).toBe('tracking')
    expect(getController().mission?.id).toBe('mission-1')
  })

  it('does not resurrect a mission whose server status is already completed', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    state.restoreActiveTracking.mockResolvedValue('mission-1')
    state.getMission.mockResolvedValue({ ok: true, data: { ...mission, status: 'completed', ended_at: '2026-10-20T10:30:00.000Z' } })

    const { getController } = await renderController()
    await act(async () => { await settle() })

    expect(state.getMission).toHaveBeenCalledWith('mission-1')
    expect(getController().phase).toBe('idle')
    expect(getController().mission).toBeNull()
    expect(state.getPendingGpsPointCount).not.toHaveBeenCalled()
  })

  it('does not open a finalization prompt when no mission is active', async () => {
    const { getController } = await renderController()

    await act(async () => { getController().handleStop() })

    expect(state.alert).not.toHaveBeenCalled()
    expect(state.stopTracking).not.toHaveBeenCalled()
  })

  it('clears a completed summary when returning to the home state', async () => {
    state.auth = { isLoaded: true, isSignedIn: true, userId: 'user-a' }
    const { getController } = await renderController()
    await act(async () => { await getController().handleStartMobileMission(); await settle() })
    await act(async () => { getController().handleStop() })
    const buttons = state.alert.mock.calls.at(-1)?.[2] as Array<{ text: string; onPress?: () => void }>
    await act(async () => { await buttons.find((button) => button.text === 'Terminer')?.onPress?.(); await settle() })

    expect(getController().completionSummary).not.toBeNull()
    await act(async () => { getController().handleReturnHome() })

    expect(getController().completionSummary).toBeNull()
    expect(getController().errorMsg).toBeNull()
    expect(getController().phase).toBe('idle')
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
