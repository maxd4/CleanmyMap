import { vi } from 'vitest'

export function createStandaloneExpoConstantsMock() {
  return {
    default: { appOwnership: 'standalone', executionEnvironment: 'standalone' },
  }
}

export function createBalancedLocationMock() {
  return { Accuracy: { Balanced: 'balanced' } }
}

export function createPermissionLocationMock(options: {
  foreground: () => string
  background: () => string
  onForeground?: () => void
  onBackground?: () => void
}) {
  return {
    ...createBalancedLocationMock(),
    requestForegroundPermissionsAsync: vi.fn(async () => {
      options.onForeground?.()
      return { status: options.foreground() }
    }),
    requestBackgroundPermissionsAsync: vi.fn(async () => {
      options.onBackground?.()
      return { status: options.background() }
    }),
  }
}

export function createSupabaseMock(getClient: () => unknown) {
  return {
    getAuthenticatedSupabaseClient: vi.fn(async () => getClient()),
    getClerkSupabaseAccessToken: vi.fn(async () => 'clerk-jwt'),
    getClerkUserId: vi.fn(async () => 'user_123'),
  }
}

type TrackingStorageOptions = {
  getStoredMissionId?: (ownerId: string) => unknown
  getStoredMissionOwnerId?: (missionId: string) => unknown
  setStoredMissionId?: (ownerId: string, id: string) => unknown
  clearStoredMissionId?: (ownerId: string) => unknown
  enqueuePendingLinkedMissionReconciliation?: (ownerId: string, id: string) => unknown
  removePendingLinkedMissionReconciliation?: (ownerId: string, id: string) => unknown
  bufferPoint?: (ownerId: string, point: unknown) => unknown
  flushBuffer?: (ownerId: string) => unknown
}

export function createTrackingStorageMock(options: TrackingStorageOptions = {}) {
  return {
    getStoredMissionId: vi.fn(async (ownerId: string) => options.getStoredMissionId?.(ownerId) ?? null),
    getStoredMissionOwnerId: vi.fn(async (missionId: string) => options.getStoredMissionOwnerId?.(missionId) ?? 'user_123'),
    setStoredMissionId: vi.fn(async (ownerId: string, id: string) => options.setStoredMissionId?.(ownerId, id)),
    clearStoredMissionId: vi.fn(async (ownerId: string) => options.clearStoredMissionId?.(ownerId)),
    enqueuePendingLinkedMissionReconciliation: vi.fn(async (ownerId: string, id: string) => options.enqueuePendingLinkedMissionReconciliation?.(ownerId, id)),
    removePendingLinkedMissionReconciliation: vi.fn(async (ownerId: string, id: string) => options.removePendingLinkedMissionReconciliation?.(ownerId, id)),
    bufferPoint: vi.fn(async (ownerId: string, point: unknown) => options.bufferPoint?.(ownerId, point)),
    flushBuffer: vi.fn(async (ownerId: string) => options.flushBuffer?.(ownerId)),
  }
}

export function createMissionIdStorageOptions(state: { storedMissionId: string | null }) {
  return {
    getStoredMissionId: () => state.storedMissionId,
    setStoredMissionId: (_ownerId: string, id: string) => { state.storedMissionId = id },
    clearStoredMissionId: () => { state.storedMissionId = null },
  }
}

type MissionClientOptions = {
  data: unknown
  error?: Error | null
  insertData?: unknown
  insertError?: Error | null
  updateData?: unknown
  updateError?: Error | null
  nextUpdateError?: () => Error | null
  recordMutationSequence?: boolean
  sequence?: string[]
}

export function createMissionClient({
  data,
  error = null,
  insertData = data,
  insertError = error,
  updateData = data,
  updateError = error,
  nextUpdateError,
  recordMutationSequence = true,
  sequence = [],
}: MissionClientOptions) {
  const updatePayloads: unknown[] = []
  const insertPayloads: unknown[] = []
  const response = (result: { data: unknown; error: Error | null }) => ({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => result),
      })),
    })),
  })
  const update = vi.fn((payload: unknown) => {
    if (recordMutationSequence) sequence.push('update')
    updatePayloads.push(payload)
    return response({ data: updateData, error: nextUpdateError?.() ?? updateError })
  })
  const insert = vi.fn((payload: unknown) => {
    if (recordMutationSequence) sequence.push('insert')
    insertPayloads.push(payload)
    return { select: vi.fn(() => ({ single: vi.fn(async () => ({ data: insertData, error: insertError })) })) }
  })
  const select = vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(async () => ({ data, error })),
    })),
  }))

  return {
    updatePayloads,
    insertPayloads,
    from: vi.fn((table: string) => {
      if (table !== 'missions') throw new Error(`Unexpected table: ${table}`)
      return { update, insert, select }
    }),
  }
}
