import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CLERK_SESSION_REQUIRED_ERROR,
  EXPO_GO_TRACKING_WARNING,
  createMission,
  getBackgroundTrackingWarning,
  getMission,
  getMissionTrack,
  requestTrackingPermissions,
  saveLocationPoint,
  startMobileMission,
  startTracking,
  stopTracking,
} from '../lib/tracking-service'
import * as Location from 'expo-location'

const state = vi.hoisted(() => ({
  constants: { appOwnership: 'standalone', executionEnvironment: 'standalone' },
  client: null as any,
  clientPromise: null as Promise<unknown> | null,
  currentUserId: 'user_123' as string | null,
  storedOwnerId: 'user_123' as string | null,
  storedMissionId: 'mission-1' as string | null,
  rationaleAccepted: true,
  rationaleError: null as unknown,
  foregroundPermission: 'granted',
  backgroundPermission: 'granted',
  foregroundError: null as unknown,
  backgroundError: null as unknown,
  startError: null as unknown,
  stopError: null as unknown,
  taskRegistered: false,
  taskError: null as unknown,
  setStoredError: null as unknown,
  clearStoredError: null as unknown,
  flushResult: { ok: true, data: undefined } as { ok: true; data: undefined } | { ok: false; error: string },
  linkedResult: { ok: true, data: undefined } as any,
  reconcileResult: { ok: true, data: undefined } as any,
}))

const rationale = vi.hoisted(() => vi.fn())
const createLinked = vi.hoisted(() => vi.fn())
const reconcileLinked = vi.hoisted(() => vi.fn())

vi.mock('expo-constants', () => ({ default: state.constants }))

vi.mock('expo-location', () => ({
  Accuracy: { Balanced: 'balanced', High: 'high' },
  requestForegroundPermissionsAsync: vi.fn(async () => {
    if (state.foregroundError) throw state.foregroundError
    return { status: state.foregroundPermission }
  }),
  requestBackgroundPermissionsAsync: vi.fn(async () => {
    if (state.backgroundError) throw state.backgroundError
    return { status: state.backgroundPermission }
  }),
  startLocationUpdatesAsync: vi.fn(async () => {
    if (state.startError) throw state.startError
  }),
  stopLocationUpdatesAsync: vi.fn(async () => {
    if (state.stopError) throw state.stopError
  }),
}))

vi.mock('expo-task-manager', () => ({
  isTaskRegisteredAsync: vi.fn(async () => {
    if (state.taskError) throw state.taskError
    return state.taskRegistered
  }),
}))

vi.mock('../lib/supabase', () => ({
  getAuthenticatedSupabaseClient: vi.fn(async () => state.clientPromise ?? state.client),
  getClerkUserId: vi.fn(async () => state.currentUserId),
}))

vi.mock('../lib/gps-permission-rationale', () => ({
  showGpsPermissionRationale: rationale,
}))

vi.mock('../lib/linked-mission-service', () => ({
  createLinkedMission: createLinked,
  reconcileLinkedMission: reconcileLinked,
}))

vi.mock('../lib/storage', () => ({
  getStoredMissionId: vi.fn(async () => state.storedMissionId),
  getStoredMissionOwnerId: vi.fn(async () => state.storedOwnerId),
  setStoredMissionId: vi.fn(async () => {
    if (state.setStoredError) throw state.setStoredError
  }),
  clearStoredMissionId: vi.fn(async () => {
    if (state.clearStoredError) throw state.clearStoredError
    state.storedMissionId = null
  }),
  enqueuePendingLinkedMissionReconciliation: vi.fn(async () => undefined),
  removePendingLinkedMissionReconciliation: vi.fn(async () => undefined),
  bufferPoint: vi.fn(async () => undefined),
  flushBuffer: vi.fn(async () => state.flushResult),
}))

const mission = {
  id: 'mission-1',
  volunteer_id: 'user_123',
  action_id: null,
  label: 'Mission terrain',
  status: 'tracking' as const,
  started_at: '2026-10-20T09:00:00.000Z',
  ended_at: null,
  distance_m: null,
  duration_s: null,
  created_at: '2026-10-20T08:59:00.000Z',
}

const restoredPoints = [
  {
    id: 2,
    client_point_id: 'point-2',
    mission_id: 'mission-1',
    latitude: 48.857,
    longitude: 2.353,
    accuracy_m: null,
    altitude_m: null,
    recorded_at: '2026-10-20T09:01:00.000Z',
  },
  {
    id: 1,
    client_point_id: 'point-1',
    mission_id: 'mission-1',
    latitude: 48.856,
    longitude: 2.352,
    accuracy_m: null,
    altitude_m: null,
    recorded_at: '2026-10-20T09:00:00.000Z',
  },
]

type ClientOptions = {
  insertData?: unknown
  insertError?: Error | null
  updateData?: unknown
  updateError?: Error | null
  selectData?: unknown
  selectError?: Error | null
  trackData?: unknown
  trackError?: Error | null
  upsertError?: Error | null
  updateThrow?: unknown
  insertThrow?: unknown
  selectThrow?: unknown
  upsertThrow?: unknown
}

function createClient(options: ClientOptions = {}) {
  const updatePayloads: unknown[] = []
  const insertPayloads: unknown[] = []
  const upsertPayloads: unknown[] = []
  const result = (data: unknown, error: Error | null) => ({
    data,
    error,
  })
  const optionOrDefault = <T>(key: keyof ClientOptions, fallback: T) =>
    Object.prototype.hasOwnProperty.call(options, key) ? options[key] as T : fallback
  const single = (data: unknown, error: Error | null, thrown: unknown) => vi.fn(async () => {
    if (thrown) throw thrown
    return result(data, error)
  })
  const update = vi.fn((payload: unknown) => {
    updatePayloads.push(payload)
    if (options.updateThrow) throw options.updateThrow
    return {
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: single(optionOrDefault('updateData', mission), options.updateError ?? null, null),
        })),
      })),
    }
  })
  const insert = vi.fn((payload: unknown) => {
    insertPayloads.push(payload)
    if (options.insertThrow) throw options.insertThrow
    return {
      select: vi.fn(() => ({
          single: single(optionOrDefault('insertData', mission), options.insertError ?? null, null),
      })),
    }
  })
  const select = vi.fn((columns?: string) => {
    if (options.selectThrow) throw options.selectThrow
    if (columns?.startsWith('id, client_point_id')) {
      return {
        eq: vi.fn(() => ({
          order: vi.fn(async () => result(optionOrDefault('trackData', restoredPoints), options.trackError ?? null)),
        })),
      }
    }
    return {
      eq: vi.fn(() => ({
        single: single(optionOrDefault('selectData', mission), options.selectError ?? null, null),
      })),
    }
  })
  const upsert = vi.fn(async (payload: unknown) => {
    upsertPayloads.push(payload)
    if (options.upsertThrow) throw options.upsertThrow
    return result(null, options.upsertError ?? null)
  })
  return {
    updatePayloads,
    insertPayloads,
    upsertPayloads,
    from: vi.fn((table: string) => {
      if (table === 'missions') return { update, insert, select }
      if (table === 'gps_points') return { select, upsert }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

function resetState() {
  state.constants.appOwnership = 'standalone'
  state.constants.executionEnvironment = 'standalone'
  state.client = null
  state.clientPromise = null
  state.currentUserId = 'user_123'
  state.storedOwnerId = 'user_123'
  state.storedMissionId = 'mission-1'
  state.rationaleAccepted = true
  state.rationaleError = null
  state.foregroundPermission = 'granted'
  state.backgroundPermission = 'granted'
  state.foregroundError = null
  state.backgroundError = null
  state.startError = null
  state.stopError = null
  state.taskRegistered = false
  state.taskError = null
  state.setStoredError = null
  state.clearStoredError = null
  state.flushResult = { ok: true, data: undefined }
  state.linkedResult = { ok: true, data: mission }
  state.reconcileResult = { ok: true, data: undefined }
  rationale.mockReset().mockImplementation(async () => {
    if (state.rationaleError) throw state.rationaleError
    return state.rationaleAccepted
  })
  createLinked.mockReset().mockImplementation(async () => state.linkedResult)
  reconcileLinked.mockReset().mockImplementation(async () => state.reconcileResult)
  vi.clearAllMocks()
}

beforeEach(resetState)

describe('tracking-service coverage edges', () => {
  it('handles Expo Go warnings, rationale refusal, permission refusal and permission errors', async () => {
    state.constants.appOwnership = 'expo'
    expect(getBackgroundTrackingWarning()).toBe(EXPO_GO_TRACKING_WARNING)

    state.constants.appOwnership = 'standalone'
    state.rationaleAccepted = false
    await expect(requestTrackingPermissions()).resolves.toEqual({
      ok: false,
      error: 'Information GPS requise avant de demander les permissions système.',
    })

    state.rationaleAccepted = true
    state.foregroundPermission = 'denied'
    await expect(requestTrackingPermissions()).resolves.toEqual({
      ok: false,
      error: 'Permission GPS premier plan refusée.',
    })

    state.foregroundPermission = 'granted'
    state.backgroundPermission = 'denied'
    await expect(requestTrackingPermissions()).resolves.toEqual({
      ok: false,
      error: "Permission GPS arrière-plan refusée. Le suivi s'arrêtera si l'écran est éteint.",
    })

    state.backgroundPermission = 'granted'
    state.rationaleError = new Error('rationale unavailable')
    await expect(requestTrackingPermissions()).resolves.toEqual({
      ok: false,
      error: 'Impossible de vérifier les permissions GPS : rationale unavailable',
    })

    state.rationaleError = 'rationale unavailable'
    await expect(requestTrackingPermissions()).resolves.toEqual({
      ok: false,
      error: 'Impossible de vérifier les permissions GPS : erreur inconnue.',
    })
  })

  it('keeps startTracking owner-scoped and cleans up partial starts', async () => {
    await expect(startTracking('mission-1', 'other-user')).resolves.toEqual({
      ok: false,
      error: CLERK_SESSION_REQUIRED_ERROR,
    })

    state.client = null
    await expect(startTracking('mission-1', 'user_123')).resolves.toEqual({
      ok: false,
      error: CLERK_SESSION_REQUIRED_ERROR,
    })

    state.client = createClient()
    state.constants.executionEnvironment = 'storeClient'
    await expect(startTracking('mission-1', 'user_123')).resolves.toEqual({
      ok: false,
      error: EXPO_GO_TRACKING_WARNING,
    })

    state.constants.executionEnvironment = 'standalone'
    state.startError = new Error('native unavailable')
    await expect(startTracking('mission-1', 'user_123')).resolves.toEqual({
      ok: false,
      error: 'Impossible de démarrer le suivi GPS : native unavailable',
    })

    state.startError = 'native unavailable'
    await expect(startTracking('mission-1', 'user_123')).resolves.toEqual({
      ok: false,
      error: 'Impossible de démarrer le suivi GPS : erreur inconnue.',
    })

    state.startError = null
    state.client = createClient({ updateError: new Error('activation refused') })
    await expect(startTracking('mission-1', 'user_123')).resolves.toEqual({
      ok: false,
      error: 'Impossible de démarrer la mission : activation refused',
    })
    expect(Location.stopLocationUpdatesAsync).toHaveBeenCalled()

    state.client = createClient()
    state.setStoredError = new Error('storage unavailable')
    await expect(startTracking('mission-1', 'user_123')).resolves.toEqual({
      ok: false,
      error: 'Impossible de mémoriser la mission active : storage unavailable',
    })

    state.setStoredError = 'storage unavailable'
    await expect(startTracking('mission-1', 'user_123')).resolves.toEqual({
      ok: false,
      error: 'Impossible de mémoriser la mission active : erreur inconnue.',
    })
  })

  it('rejects identity changes between the two Clerk checks and creates linked missions through the owner', async () => {
    const client = createClient()
    state.client = client
    state.currentUserId = 'user_other'
    await expect(startTracking('mission-1', 'user_123')).resolves.toEqual({
      ok: false,
      error: CLERK_SESSION_REQUIRED_ERROR,
    })

    state.currentUserId = 'user_123'
    await expect(createMission('user_123', ' Terrain ', ' action-1 ')).resolves.toEqual({
      ok: true,
      data: mission,
    })
    expect(createLinked).toHaveBeenCalledWith('Terrain', 'action-1')

    await expect(createMission('   ', 'Mission')).resolves.toEqual({
      ok: false,
      error: CLERK_SESSION_REQUIRED_ERROR,
    })
    state.currentUserId = 'other'
    await expect(createMission('user_123', 'Mission')).resolves.toEqual({
      ok: false,
      error: CLERK_SESSION_REQUIRED_ERROR,
    })
    state.currentUserId = 'user_123'
    await expect(createMission('user_123', '   ')).resolves.toEqual({
      ok: false,
      error: 'Libellé de mission requis.',
    })

    state.client = null
    await expect(createMission('user_123', 'Mission')).resolves.toEqual({
      ok: false,
      error: CLERK_SESSION_REQUIRED_ERROR,
    })

    state.client = createClient({ insertError: new Error('RLS denied') })
    await expect(createMission('user_123', 'Mission')).resolves.toEqual({
      ok: false,
      error: 'Impossible de créer la mission : RLS denied',
    })
  })

  it('covers the mobile start orchestration and identity changes while resolving the client', async () => {
    state.constants.appOwnership = 'expo'
    await expect(requestTrackingPermissions()).resolves.toEqual({ ok: false, error: EXPO_GO_TRACKING_WARNING })

    state.constants.appOwnership = 'standalone'
    const client = createClient()
    let releaseClient!: (value: unknown) => void
    state.client = client
    state.clientPromise = new Promise((resolve) => { releaseClient = resolve })
    const pendingStart = startTracking('mission-1', 'user_123')
    await Promise.resolve()
    state.currentUserId = 'other'
    releaseClient(client)
    await expect(pendingStart).resolves.toEqual({ ok: false, error: CLERK_SESSION_REQUIRED_ERROR })

    state.clientPromise = null
    state.currentUserId = 'user_123'
    state.client = client
    await expect(startMobileMission('user_123', 'Terrain', 'action-1')).resolves.toMatchObject({ ok: true })

    state.client = createClient({ insertError: new Error('create refused') })
    await expect(startMobileMission('user_123')).resolves.toEqual({
      ok: false,
      error: 'Impossible de créer la mission : create refused',
    })

    state.client = null
    await expect(startMobileMission('user_123', 'Terrain', 'action-1')).resolves.toEqual({
      ok: false,
      error: CLERK_SESSION_REQUIRED_ERROR,
    })
  })

  it('stops safely, keeps the mission on flush or finalization errors, and completes owner-scoped missions', async () => {
    state.storedOwnerId = null
    await expect(stopTracking('mission-1')).resolves.toEqual({
      ok: false,
      error: `${CLERK_SESSION_REQUIRED_ERROR} Aucun propriétaire local vérifiable.`,
    })

    state.storedOwnerId = 'user_123'
    state.currentUserId = 'other'
    await expect(stopTracking('mission-1')).resolves.toEqual({
      ok: false,
      error: `${CLERK_SESSION_REQUIRED_ERROR} Identité Clerk obsolète.`,
    })

    state.currentUserId = 'user_123'
    state.taskRegistered = true
    state.stopError = new Error('stop failed')
    await expect(stopTracking('mission-1')).resolves.toMatchObject({ ok: false, error: expect.stringContaining('stop failed') })

    state.stopError = null
    state.flushResult = { ok: false, error: 'flush failed' }
    state.startError = new Error('resume failed')
    state.client = createClient()
    await expect(stopTracking('mission-1')).resolves.toEqual({
      ok: false,
      error: 'flush failed. Impossible de reprendre le suivi GPS : resume failed',
    })

    state.flushResult = { ok: true, data: undefined }
    state.startError = null
    state.currentUserId = 'other'
    await expect(stopTracking('mission-1')).resolves.toEqual({
      ok: false,
      error: `${CLERK_SESSION_REQUIRED_ERROR} Identité Clerk obsolète.`,
    })

    state.currentUserId = 'user_123'
    state.client = null
    await expect(stopTracking('mission-1')).resolves.toEqual({
      ok: false,
      error: CLERK_SESSION_REQUIRED_ERROR,
    })

    state.client = createClient({ updateError: new Error('finalization refused') })
    await expect(stopTracking('mission-1')).resolves.toEqual({
      ok: false,
      error: 'Erreur lors de la finalisation : finalization refused.',
    })

    state.client = createClient({ updateData: { ...mission, status: 'completed' as const, action_id: null } })
    await expect(stopTracking('mission-1')).resolves.toMatchObject({ ok: true })

    state.taskRegistered = false
    state.client = createClient({ updateData: { ...mission, status: 'completed' as const, action_id: null } })
    await expect(stopTracking('mission-1')).resolves.toMatchObject({ ok: true })

    state.taskError = 'task lookup failed'
    await expect(stopTracking('mission-1')).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining('erreur inconnue.'),
    })

    state.taskError = null
    state.taskRegistered = true
    state.stopError = new Error('stop failed')
    state.constants.appOwnership = 'expo'
    await expect(stopTracking('mission-1')).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining(EXPO_GO_TRACKING_WARNING),
    })

    state.constants.appOwnership = 'standalone'
    state.stopError = null
    state.client = createClient({ updateData: { ...mission, status: 'completed' as const, action_id: 'action-1' } })
    state.reconcileResult = { ok: false, error: 'handoff terminal', terminal: true }
    await expect(stopTracking('mission-1')).resolves.toMatchObject({ ok: true })
  })

  it('buffers points offline, rejects changed identities, and preserves stable point writes', async () => {
    state.storedOwnerId = null
    await expect(saveLocationPoint('mission-1', { latitude: 48.8566, longitude: 2.3522 })).resolves.toEqual({
      ok: false,
      error: CLERK_SESSION_REQUIRED_ERROR,
    })

    state.storedOwnerId = 'user_123'
    state.currentUserId = 'other'
    await expect(saveLocationPoint('mission-1', { latitude: 48.8566, longitude: 2.3522 })).resolves.toEqual({
      ok: false,
      error: `${CLERK_SESSION_REQUIRED_ERROR} Identité Clerk obsolète.`,
    })

    state.currentUserId = 'user_123'
    state.client = null
    await expect(saveLocationPoint('mission-1', {
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy: 4,
      altitude: 35,
    })).resolves.toEqual({ ok: false, error: CLERK_SESSION_REQUIRED_ERROR })

    state.client = createClient()
    state.currentUserId = null
    await expect(saveLocationPoint('mission-1', { latitude: 48.8566, longitude: 2.3522 })).resolves.toEqual({
      ok: false,
      error: CLERK_SESSION_REQUIRED_ERROR,
    })

    state.currentUserId = 'user_other'
    await expect(saveLocationPoint('mission-1', { latitude: 48.8566, longitude: 2.3522 })).resolves.toEqual({
      ok: false,
      error: `${CLERK_SESSION_REQUIRED_ERROR} Identité Clerk obsolète.`,
    })

    state.currentUserId = 'user_123'
    state.client = createClient()
    await expect(saveLocationPoint('mission-1', {
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy: null,
      altitude: null,
    }, new Date('2026-10-20T10:00:00.000Z'))).resolves.toEqual({ ok: true, data: undefined })

    state.client = createClient({ upsertError: new Error('offline') })
    await expect(saveLocationPoint('mission-1', { latitude: 48.8566, longitude: 2.3522 })).resolves.toEqual({
      ok: false,
      error: 'offline',
    })

    state.client = createClient({ upsertThrow: 'network exploded' })
    await expect(saveLocationPoint('mission-1', { latitude: 48.8566, longitude: 2.3522 })).resolves.toEqual({
      ok: false,
      error: 'Session Clerk indisponible.',
    })

    state.client = createClient({ upsertThrow: new Error('request failed') })
    await expect(saveLocationPoint('mission-1', { latitude: 48.8566, longitude: 2.3522 })).resolves.toEqual({
      ok: false,
      error: 'request failed',
    })
  })

  it('restores mission and track data, sorts points, and reports invalid query responses', async () => {
    state.client = createClient({ selectData: mission })
    await expect(getMission('mission-1')).resolves.toEqual({ ok: true, data: mission })
    await expect(getMissionTrack('mission-1')).resolves.toEqual({ ok: true, data: [restoredPoints[1], restoredPoints[0]] })

    state.client = createClient({ selectData: null })
    await expect(getMission('mission-1')).resolves.toEqual({
      ok: false,
      error: 'Mission introuvable : Réponse mission invalide.',
    })

    state.client = createClient({ trackData: [], trackError: new Error('track unavailable') })
    await expect(getMissionTrack('mission-1')).resolves.toEqual({
      ok: false,
      error: 'Impossible de restaurer le tracé : track unavailable',
    })

    state.client = createClient({ selectThrow: 'query failed' })
    await expect(getMission('mission-1')).resolves.toEqual({
      ok: false,
      error: 'Mission introuvable : Session Clerk indisponible.',
    })

    state.client = createClient({ selectThrow: new Error('query failed') })
    await expect(getMission('mission-1')).resolves.toEqual({
      ok: false,
      error: 'Mission introuvable : query failed',
    })

    state.client = null
    await expect(getMissionTrack('mission-1')).resolves.toEqual({
      ok: false,
      error: CLERK_SESSION_REQUIRED_ERROR,
    })

    state.client = createClient({ trackData: null })
    await expect(getMissionTrack('mission-1')).resolves.toEqual({ ok: true, data: [] })

    const trackClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(async () => { throw 'track failed' }),
          })),
        })),
      })),
    }
    state.client = trackClient
    await expect(getMissionTrack('mission-1')).resolves.toEqual({
      ok: false,
      error: 'Impossible de restaurer le tracé : erreur inconnue.',
    })

    const errorTrackClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(async () => { throw new Error('track failed') }),
          })),
        })),
      })),
    }
    state.client = errorTrackClient
    await expect(getMissionTrack('mission-1')).resolves.toEqual({
      ok: false,
      error: 'Impossible de restaurer le tracé : track failed',
    })
  })
})
