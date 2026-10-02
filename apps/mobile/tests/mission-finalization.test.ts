import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createBalancedLocationMock,
  createMissionIdStorageOptions,
  createMissionClient,
  createStandaloneExpoConstantsMock,
  createSupabaseMock,
  createTrackingStorageMock,
} from './support/tracking-mocks'

const state = vi.hoisted(() => ({
  client: null as any,
  taskRegistered: true,
  flushResult: { ok: true, data: undefined } as { ok: true; data: undefined } | { ok: false; error: string },
  missionError: null as Error | null,
  storedMissionId: 'mission-1' as string | null,
  sequence: [] as string[],
}))

vi.mock('expo-constants', () => createStandaloneExpoConstantsMock())

vi.mock('expo-location', () => ({
  ...createBalancedLocationMock(),
  startLocationUpdatesAsync: vi.fn(async () => {
    state.sequence.push('restart')
  }),
  stopLocationUpdatesAsync: vi.fn(async () => {
    state.sequence.push('stop')
  }),
}))

vi.mock('expo-task-manager', () => ({
  isTaskRegisteredAsync: vi.fn(async () => state.taskRegistered),
}))

vi.mock('../lib/supabase', () => createSupabaseMock(() => state.client))

vi.mock('../lib/storage', () => createTrackingStorageMock({
  ...createMissionIdStorageOptions(state),
  flushBuffer: () => state.flushResult,
}))

import * as Location from 'expo-location'
import { stopTracking } from '../lib/tracking-service'

const completedMission = {
  id: 'mission-1',
  volunteer_id: 'user_123',
  label: 'Mission Paris',
  status: 'completed' as const,
  started_at: '2026-10-02T09:00:00.000Z',
  ended_at: '2026-10-02T10:00:00.000Z',
  distance_m: 321,
  duration_s: 3600,
  created_at: '2026-10-02T08:00:00.000Z',
}

function missionClient() {
  return createMissionClient({
    data: state.missionError ? null : completedMission,
    error: state.missionError,
    nextUpdateError: () => state.missionError,
    recordMutationSequence: false,
    sequence: state.sequence,
  })
}

describe('mobile mission finalization', () => {
  beforeEach(() => {
    state.client = missionClient()
    state.taskRegistered = true
    state.flushResult = { ok: true, data: undefined }
    state.missionError = null
    state.storedMissionId = 'mission-1'
    state.sequence.length = 0
    vi.clearAllMocks()
  })

  it('reports ordered stages and returns server metrics without writing them', async () => {
    const stages: string[] = []
    const client = state.client

    const result = await stopTracking('mission-1', (stage) => stages.push(stage))

    expect(result).toEqual({ ok: true, data: completedMission })
    expect(stages).toEqual(['synchronizing', 'finalizing'])
    expect(client.updatePayloads).toEqual([{ status: 'completed', ended_at: expect.any(String) }])
    expect(client.updatePayloads[0]).not.toHaveProperty('distance_m')
    expect(client.updatePayloads[0]).not.toHaveProperty('duration_s')
    expect(state.storedMissionId).toBeNull()
    expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled()
  })

  it('keeps the active mission and resumes tracking when GPS flush fails', async () => {
    state.flushResult = { ok: false, error: 'Synchronisation GPS impossible : offline' }
    const client = state.client

    const result = await stopTracking('mission-1')

    expect(result).toEqual({ ok: false, error: 'Synchronisation GPS impossible : offline.' })
    expect(client.updatePayloads).toEqual([])
    expect(state.storedMissionId).toBe('mission-1')
    expect(state.sequence).toEqual(['stop', 'restart'])
  })

  it('keeps the active mission and resumes tracking when server finalization fails', async () => {
    state.missionError = new Error('offline')
    const client = state.client

    const result = await stopTracking('mission-1')

    expect(result).toEqual({ ok: false, error: 'Erreur lors de la finalisation : offline.' })
    expect(client.updatePayloads).toEqual([{ status: 'completed', ended_at: expect.any(String) }])
    expect(state.storedMissionId).toBe('mission-1')
    expect(state.sequence).toEqual(['stop', 'restart'])
  })
})
