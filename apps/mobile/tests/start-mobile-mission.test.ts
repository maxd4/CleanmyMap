import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMissionIdStorageOptions,
  createPermissionLocationMock,
  createMissionClient,
  createStandaloneExpoConstantsMock,
  createSupabaseMock,
  createTrackingStorageMock,
} from './support/tracking-mocks'

const state = vi.hoisted(() => ({
  client: null as any,
  foreground: 'granted' as string,
  background: 'granted' as string,
  startError: null as Error | null,
  updateErrors: [] as Error[],
  storedMissionId: null as string | null,
  sequence: [] as string[],
}))

vi.mock('expo-constants', () => createStandaloneExpoConstantsMock())

vi.mock('expo-location', () => ({
  ...createPermissionLocationMock({
    foreground: () => state.foreground,
    background: () => state.background,
    onForeground: () => state.sequence.push('permission-foreground'),
    onBackground: () => state.sequence.push('permission-background'),
  }),
  startLocationUpdatesAsync: vi.fn(async () => {
    if (state.startError) throw state.startError
    state.sequence.push('gps-start')
  }),
  stopLocationUpdatesAsync: vi.fn(async () => {
    state.sequence.push('gps-stop')
  }),
}))

vi.mock('expo-task-manager', () => ({
  isTaskRegisteredAsync: vi.fn(async () => false),
}))

vi.mock('../lib/supabase', () => createSupabaseMock(() => state.client))

vi.mock('../lib/storage', () => createTrackingStorageMock({
  ...createMissionIdStorageOptions(state),
}))

import * as Location from 'expo-location'
import { startMobileMission } from '../lib/tracking-service'

const pendingMission = {
  id: 'mission-1',
  volunteer_id: 'user_123',
  label: 'Action bénévole mobile',
  status: 'pending' as const,
  started_at: null,
  ended_at: null,
  distance_m: null,
  duration_s: null,
  created_at: '2026-10-02T08:00:00.000Z',
}

const activeMission = { ...pendingMission, status: 'tracking' as const, started_at: '2026-10-02T08:01:00.000Z' }

function missionClient() {
  return createMissionClient({
    data: activeMission,
    insertData: pendingMission,
    updateData: activeMission,
    nextUpdateError: () => state.updateErrors.shift() ?? null,
    sequence: state.sequence,
  })
}

describe('mobile mission startup', () => {
  beforeEach(() => {
    state.client = missionClient()
    state.foreground = 'granted'
    state.background = 'granted'
    state.startError = null
    state.updateErrors.length = 0
    state.storedMissionId = null
    state.sequence.length = 0
    vi.clearAllMocks()
  })

  it('requests permissions once before insert, GPS and activation', async () => {
    const result = await startMobileMission('user_123')

    expect(result).toEqual({ ok: true, data: activeMission })
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledOnce()
    expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalledOnce()
    expect(state.sequence).toEqual(['permission-foreground', 'permission-background', 'insert', 'gps-start', 'update'])
  })

  it('does not create a mission after permission refusal', async () => {
    state.foreground = 'denied'

    const result = await startMobileMission('user_123')

    expect(result).toEqual({ ok: false, error: 'Permission GPS premier plan refusée.' })
    expect(state.client.from).not.toHaveBeenCalled()
    expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled()
  })

  it('cancels after GPS or activation failure', async () => {
    state.startError = new Error('native GPS unavailable')

    const gpsResult = await startMobileMission('user_123')

    expect(gpsResult).toEqual({ ok: false, error: 'Impossible de démarrer le suivi GPS : native GPS unavailable' })
    expect(state.client.updatePayloads).toEqual([{ status: 'cancelled', ended_at: expect.any(String) }])

    state.startError = null
    state.updateErrors = [new Error('RLS denied')]
    state.sequence.length = 0
    state.client = missionClient()

    const activationResult = await startMobileMission('user_123')

    expect(activationResult).toEqual({ ok: false, error: 'Impossible de démarrer la mission : RLS denied' })
    expect(state.sequence).toEqual([
      'permission-foreground',
      'permission-background',
      'insert',
      'gps-start',
      'update',
      'gps-stop',
      'update',
    ])
    expect(state.client.updatePayloads).toEqual([
      { status: 'tracking', started_at: expect.any(String) },
      { status: 'cancelled', ended_at: expect.any(String) },
    ])
  })
})
