import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  client: null as any,
  storedMissionId: null as string | null,
  foregroundPermission: 'granted' as string,
  backgroundPermission: 'granted' as string,
  taskRegistered: false,
  sequence: [] as string[],
}))

vi.mock('expo-constants', () => ({
  default: { appOwnership: 'standalone', executionEnvironment: 'standalone' },
}))

vi.mock('expo-location', () => ({
  Accuracy: { Balanced: 'balanced' },
  requestForegroundPermissionsAsync: vi.fn(async () => ({ status: state.foregroundPermission })),
  requestBackgroundPermissionsAsync: vi.fn(async () => ({ status: state.backgroundPermission })),
  startLocationUpdatesAsync: vi.fn(async () => undefined),
  stopLocationUpdatesAsync: vi.fn(async () => undefined),
  getCurrentPositionAsync: vi.fn(),
}))

vi.mock('expo-task-manager', () => ({
  isTaskRegisteredAsync: vi.fn(async () => {
    state.sequence.push('task-status')
    return state.taskRegistered
  }),
}))

vi.mock('../lib/supabase', () => ({
  getAuthenticatedSupabaseClient: vi.fn(async () => state.client),
}))

vi.mock('../lib/storage', () => ({
  getStoredMissionId: vi.fn(async () => state.storedMissionId),
  setStoredMissionId: vi.fn(async (id: string) => {
    state.storedMissionId = id
  }),
  clearStoredMissionId: vi.fn(async () => {
    state.storedMissionId = null
  }),
  bufferPoint: vi.fn(async () => undefined),
  bufferAction: vi.fn(async () => undefined),
  flushBuffer: vi.fn(async () => {
    state.sequence.push('flush')
  }),
}))

import {
  CLERK_SESSION_REQUIRED_ERROR,
  createMission,
  getMission,
  restoreActiveTracking,
  saveLocationPoint,
  startTracking,
  stopTracking,
} from '../lib/tracking-service'
import { bufferPoint, flushBuffer } from '../lib/storage'

const activeMission = {
  id: 'mission-1',
  volunteer_id: 'user_123',
  label: 'Mission Paris',
  status: 'tracking' as const,
  started_at: '2026-09-28T09:00:00.000Z',
  ended_at: null,
  distance_m: null,
  duration_s: null,
  created_at: '2026-09-28T08:00:00.000Z',
}

function missionClient(options: { data?: unknown; error?: Error | null } = {}) {
  const updatePayloads: unknown[] = []
  const insertPayloads: unknown[] = []
  const missionResult = {
    data: options.data === undefined ? activeMission : options.data,
    error: options.error ?? null,
  }

  return {
    updatePayloads,
    insertPayloads,
    from: vi.fn((table: string) => {
      if (table !== 'missions') throw new Error(`Unexpected table: ${table}`)

      return {
        update: vi.fn((payload: unknown) => {
          state.sequence.push('update')
          updatePayloads.push(payload)
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => missionResult),
              })),
            })),
          }
        }),
        insert: vi.fn((payload: unknown) => {
          state.sequence.push('insert')
          insertPayloads.push(payload)
          return {
            select: vi.fn(() => ({
              single: vi.fn(async () => missionResult),
            })),
          }
        }),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => missionResult),
          })),
        })),
      }
    }),
  }
}

describe('mobile tracking service', () => {
  beforeEach(() => {
    state.client = null
    state.storedMissionId = null
    state.foregroundPermission = 'granted'
    state.backgroundPermission = 'granted'
    state.taskRegistered = false
    state.sequence.length = 0
    vi.clearAllMocks()
  })

  it('restores the persisted active mission identifier', async () => {
    state.storedMissionId = 'mission-1'

    await expect(restoreActiveTracking()).resolves.toBe('mission-1')
  })

  it('creates an owner-scoped mission without client-owned metrics', async () => {
    const pendingMission = { ...activeMission, status: 'pending' as const, started_at: null }
    const client = missionClient({ data: pendingMission })
    state.client = client

    const result = await createMission(' user_123 ')

    expect(result).toEqual({ ok: true, data: pendingMission })
    expect(client.insertPayloads).toEqual([
      { volunteer_id: 'user_123', label: 'Action bénévole mobile' },
    ])
    expect(client.insertPayloads[0]).not.toHaveProperty('distance_m')
    expect(client.insertPayloads[0]).not.toHaveProperty('duration_s')
    expect(client.insertPayloads[0]).not.toHaveProperty('created_by')
  })

  it('surfaces a mission creation error without inventing a mission', async () => {
    state.client = missionClient({ error: new Error('RLS denied') })

    await expect(createMission('user_123')).resolves.toEqual({
      ok: false,
      error: 'Impossible de créer la mission : RLS denied',
    })
  })

  it('refuses to start tracking when foreground GPS permission is denied', async () => {
    state.client = missionClient()
    state.foregroundPermission = 'denied'

    const result = await startTracking('mission-1')

    expect(result).toEqual({ ok: false, error: 'Permission GPS premier plan refusée.' })
    expect(state.client.from).not.toHaveBeenCalled()
  })

  it('surfaces a Supabase mission error without inventing mission data', async () => {
    state.client = missionClient({ error: new Error('RLS denied') })

    const result = await getMission('mission-1')

    expect(result).toEqual({ ok: false, error: 'Mission introuvable : RLS denied' })
  })

  it('buffers a GPS point when the Supabase insert fails', async () => {
    const insertError = new Error('offline')
    state.client = {
      from: vi.fn(() => ({
        insert: vi.fn(async () => ({ error: insertError })),
      })),
    }

    const result = await saveLocationPoint('mission-1', {
      latitude: 48.8566,
      longitude: 2.3522,
    })

    expect(result).toEqual({ ok: false, error: 'offline' })
    expect(bufferPoint).toHaveBeenCalledWith({
      mission_id: 'mission-1',
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy_m: null,
      altitude_m: null,
      recorded_at: expect.any(String),
    })
  })

  it('flushes the GPS buffer before completing and never writes derived metrics', async () => {
    const completedMission = { ...activeMission, status: 'completed' as const, distance_m: 321, duration_s: 600 }
    const client = missionClient({ data: completedMission })
    state.client = client
    state.taskRegistered = true

    const result = await stopTracking('mission-1')

    expect(result).toEqual({ ok: true, data: completedMission })
    expect(flushBuffer).toHaveBeenCalledOnce()
    expect(state.sequence.indexOf('flush')).toBeLessThan(state.sequence.indexOf('update'))
    expect(client.updatePayloads).toEqual([
      { status: 'completed', ended_at: expect.any(String) },
    ])
    expect(client.updatePayloads[0]).not.toHaveProperty('distance_m')
    expect(client.updatePayloads[0]).not.toHaveProperty('duration_s')
    expect(state.storedMissionId).toBeNull()
  })

  it('fails closed when no Clerk-backed Supabase client is available', async () => {
    await expect(getMission('mission-1')).resolves.toEqual({
      ok: false,
      error: CLERK_SESSION_REQUIRED_ERROR,
    })
  })
})
