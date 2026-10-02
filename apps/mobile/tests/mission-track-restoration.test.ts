import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseMock, createTrackingStorageMock } from './support/tracking-mocks'

const state = vi.hoisted(() => ({
  client: null as any,
}))

vi.mock('expo-constants', () => ({
  default: { appOwnership: 'standalone', executionEnvironment: 'standalone' },
}))

vi.mock('expo-location', () => ({
  Accuracy: { Balanced: 'balanced' },
}))

vi.mock('expo-task-manager', () => ({}))

vi.mock('../lib/supabase', () => createSupabaseMock(() => state.client))

vi.mock('../lib/storage', () => createTrackingStorageMock())

import { getMissionTrack } from '../lib/tracking-service'

const restoredPoints = [
  {
    id: 2,
    mission_id: 'mission-1',
    latitude: 48.857,
    longitude: 2.353,
    accuracy_m: 4,
    altitude_m: null,
    recorded_at: '2026-10-02T10:01:00.000Z',
  },
  {
    id: 1,
    mission_id: 'mission-1',
    latitude: 48.856,
    longitude: 2.352,
    accuracy_m: 5,
    altitude_m: null,
    recorded_at: '2026-10-02T10:00:00.000Z',
  },
]

function missionTrackClient(data: unknown = restoredPoints, error: Error | null = null) {
  const order = vi.fn(async () => ({ data, error }))
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn((table: string) => {
    if (table !== 'gps_points') throw new Error(`Unexpected table: ${table}`)
    return { select }
  })
  return { from, select, eq, order, update: vi.fn(), insert: vi.fn() }
}

describe('mobile mission track restoration', () => {
  beforeEach(() => {
    state.client = null
    vi.clearAllMocks()
  })

  it('reads the owner-scoped track ordered by recorded_at without writing mission data', async () => {
    const client = missionTrackClient()
    state.client = client

    await expect(getMissionTrack('mission-1')).resolves.toEqual({
      ok: true,
      data: [restoredPoints[1], restoredPoints[0]],
    })
    expect(client.from).toHaveBeenCalledWith('gps_points')
    expect(client.eq).toHaveBeenCalledWith('mission_id', 'mission-1')
    expect(client.order).toHaveBeenCalledWith('recorded_at', { ascending: true })
    expect(client.update).not.toHaveBeenCalled()
    expect(client.insert).not.toHaveBeenCalled()
  })

  it('keeps the active mission restoration read-only when the track query fails', async () => {
    state.client = missionTrackClient([], new Error('network unavailable'))

    await expect(getMissionTrack('mission-1')).resolves.toEqual({
      ok: false,
      error: 'Impossible de restaurer le tracé : network unavailable',
    })
  })
})
