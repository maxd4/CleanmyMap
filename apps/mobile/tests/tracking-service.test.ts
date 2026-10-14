import { beforeEach, expect, it, vi } from 'vitest'

function createTrackingState() {
  return {
    client: null as any,
    storedMissionId: null as string | null,
    foregroundPermission: 'granted' as string,
    backgroundPermission: 'granted' as string,
    taskRegistered: false,
    currentUserId: 'user_123' as string | null,
    sequence: [] as string[],
  }
}

function createMockFunction() { return vi.fn() }

const state = vi.hoisted(createTrackingState)
const getClient = vi.hoisted(createMockFunction)
const getUserId = vi.hoisted(createMockFunction)

vi.mock('expo-constants', () => ({
  default: { appOwnership: 'standalone', executionEnvironment: 'standalone' },
}))

function createLocationMock() { return {
  Accuracy: { Balanced: 'balanced' },
  requestForegroundPermissionsAsync: vi.fn(async () => ({ status: state.foregroundPermission })),
  requestBackgroundPermissionsAsync: vi.fn(async () => ({ status: state.backgroundPermission })),
  startLocationUpdatesAsync: vi.fn(async () => undefined),
  stopLocationUpdatesAsync: vi.fn(async () => undefined),
  getCurrentPositionAsync: vi.fn(),
} }

vi.mock('expo-location', createLocationMock)

function readTaskRegistration() {
  state.sequence.push('task-status')
  return state.taskRegistered
}

function createTaskManagerMock() { return {
  isTaskRegisteredAsync: vi.fn(async () => readTaskRegistration()),
} }

vi.mock('expo-task-manager', createTaskManagerMock)

function createSupabaseMock() { return {
  getAuthenticatedSupabaseClient: getClient,
  getClerkUserId: getUserId,
} }

vi.mock('../lib/supabase', createSupabaseMock)

function createPermissionRationaleMock() { return {
  showGpsPermissionRationale: vi.fn(async () => true),
} }

vi.mock('../lib/gps-permission-rationale', createPermissionRationaleMock)

async function readStoredMissionId() { return state.storedMissionId }
async function readStoredMissionOwnerId() { return 'user_123' }
async function setStoredMissionId(...args: [string, string]) { state.storedMissionId = args[1] }
async function clearStoredMissionId() { state.storedMissionId = null }
const bufferPointMock = vi.hoisted(createMockFunction)
const bufferActionMock = vi.hoisted(createMockFunction)
const flushBufferMock = vi.hoisted(createMockFunction)

function recordFlush() { state.sequence.push('flush') }

function createStorageMock() { return {
  getStoredMissionId: readStoredMissionId,
  getStoredMissionOwnerId: readStoredMissionOwnerId,
  setStoredMissionId,
  clearStoredMissionId,
  bufferPoint: bufferPointMock,
  bufferAction: bufferActionMock,
  flushBuffer: flushBufferMock,
} }

vi.mock('../lib/storage', createStorageMock)

import {
  CLERK_SESSION_REQUIRED_ERROR,
  createMission,
  getMission,
  restoreActiveTracking,
  requestTrackingPermissions,
  saveLocationPoint,
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

function missionResult(options: { data?: unknown; error?: Error | null }) {
  return {
    data: options.data === undefined ? activeMission : options.data,
    error: options.error ?? null,
  }
}

function missionClient(options: { data?: unknown; error?: Error | null } = {}) {
  const updatePayloads: unknown[] = []
  const insertPayloads: unknown[] = []
  const result = missionResult(options)

  function singleResult() { return result }
  function createSingleQuery() { return { single: vi.fn(singleResult) } }
  function createUpdateFilter() { return { eq: vi.fn(() => ({ select: vi.fn(createSingleQuery) })) } }
  function recordUpdate(payload: unknown) {
    state.sequence.push('update')
    updatePayloads.push(payload)
    return createUpdateFilter()
  }
  function recordInsert(payload: unknown) {
    state.sequence.push('insert')
    insertPayloads.push(payload)
    return { select: vi.fn(createSingleQuery) }
  }
  function selectMission() { return { eq: vi.fn(createSingleQuery) } }
  function createMissionTable(table: string) {
    if (table === 'missions') return { update: vi.fn(recordUpdate), insert: vi.fn(recordInsert), select: vi.fn(selectMission) }
    throw new Error(`Unexpected table: ${table}`)
  }

  return {
    updatePayloads,
    insertPayloads,
    from: vi.fn(createMissionTable),
  }
}

function resetTrackingState() {
    state.client = null
    state.storedMissionId = null
    state.foregroundPermission = 'granted'
    state.backgroundPermission = 'granted'
    state.taskRegistered = false
    state.currentUserId = 'user_123'
    state.sequence.length = 0
    getClient.mockImplementation(async () => state.client)
    getUserId.mockImplementation(async () => state.currentUserId)
  flushBufferMock.mockImplementation(recordFlush)
    vi.clearAllMocks()
}

beforeEach(resetTrackingState)

it('restores the persisted active mission identifier', async () => {
    state.storedMissionId = 'mission-1'

    await expect(restoreActiveTracking('user_123')).resolves.toBe('mission-1')
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

it('refuses the permission gate when foreground GPS permission is denied', async () => {
    state.client = missionClient()
    state.foregroundPermission = 'denied'

    const result = await requestTrackingPermissions()

    expect(result).toEqual({ ok: false, error: 'Permission GPS premier plan refusée.' })
    expect(state.client.from).not.toHaveBeenCalled()
})

it('refuses the permission gate when background GPS permission is denied', async () => {
    state.client = missionClient()
    state.backgroundPermission = 'denied'

    const result = await requestTrackingPermissions()

    expect(result).toEqual({
      ok: false,
      error: "Permission GPS arrière-plan refusée. Le suivi s'arrêtera si l'écran est éteint.",
    })
    expect(state.client.from).not.toHaveBeenCalled()
})

it('surfaces a Supabase mission error without inventing mission data', async () => {
    state.client = missionClient({ error: new Error('RLS denied') })

    const result = await getMission('mission-1')

    expect(result).toEqual({ ok: false, error: 'Mission introuvable : RLS denied' })
})

async function buffersPointWhenInsertFails() {
    const insertError = new Error('offline')
    state.client = {
      from: vi.fn(() => ({
        upsert: vi.fn(async () => ({ error: insertError })),
      })),
    }

    const result = await saveLocationPoint('mission-1', {
      latitude: 48.8566,
      longitude: 2.3522,
    })

    expect(result).toEqual({ ok: false, error: 'offline' })
    expect(bufferPoint).toHaveBeenCalledWith('user_123', {
      mission_id: 'mission-1',
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy_m: null,
      altitude_m: null,
      client_point_id: expect.any(String),
      recorded_at: expect.any(String),
    })
}

it('buffers a GPS point when the Supabase insert fails', buffersPointWhenInsertFails)

it('buffers a GPS point when the Clerk session is unavailable', async () => {
    const result = await saveLocationPoint('mission-1', {
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy: 5,
      altitude: 35,
    })

    expect(result).toEqual({ ok: false, error: CLERK_SESSION_REQUIRED_ERROR })
    expect(bufferPoint).toHaveBeenCalledWith('user_123', {
      mission_id: 'mission-1',
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy_m: 5,
      altitude_m: 35,
      client_point_id: expect.any(String),
      recorded_at: expect.any(String),
    })
})

it('refuses a GPS write after the active Clerk identity changes', async () => {
    state.currentUserId = 'user_other'
    const upsert = vi.fn(async () => ({ error: null }))
    state.client = { from: vi.fn(() => ({ upsert })) }

    await expect(saveLocationPoint('mission-1', {
      latitude: 48.8566,
      longitude: 2.3522,
    })).resolves.toEqual({
      ok: false,
      error: `${CLERK_SESSION_REQUIRED_ERROR} Identité Clerk obsolète.`,
    })
    expect(upsert).not.toHaveBeenCalled()
    expect(bufferPoint).not.toHaveBeenCalled()
})

it('refuses a GPS write when Clerk changes while the client is being resolved', async () => {
    const upsert = vi.fn(async () => ({ error: null }))
    const client = { from: vi.fn(() => ({ upsert })) }
    let releaseClient!: () => void
    getClient.mockImplementationOnce(() => new Promise((resolve) => {
      releaseClient = () => resolve(client)
    }))

    const pendingWrite = saveLocationPoint('mission-1', {
      latitude: 48.8566,
      longitude: 2.3522,
    })
    await vi.waitFor(() => expect(getClient).toHaveBeenCalledOnce())
    state.currentUserId = 'user_other'
    releaseClient()

    await expect(pendingWrite).resolves.toEqual({
      ok: false,
      error: `${CLERK_SESSION_REQUIRED_ERROR} Identité Clerk obsolète.`,
    })
    expect(upsert).not.toHaveBeenCalled()
    expect(bufferPoint).not.toHaveBeenCalled()
})

it('flushes the GPS buffer before completing and never writes derived metrics', async () => {
    const completedMission = { ...activeMission, status: 'completed' as const, distance_m: 321, duration_s: 600 }
    const client = missionClient({ data: completedMission })
    state.client = client
    state.taskRegistered = true

    const result = await stopTracking('mission-1')

    expect(result).toEqual({ ok: true, data: completedMission })
    expect(flushBuffer).toHaveBeenCalledWith('user_123')
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
