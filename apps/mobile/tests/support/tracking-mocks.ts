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
  }
}

type TrackingStorageOptions = {
  getStoredMissionId?: () => unknown
  setStoredMissionId?: (id: string) => unknown
  clearStoredMissionId?: () => unknown
  bufferPoint?: (point: unknown) => unknown
  bufferAction?: (action: unknown) => unknown
  flushBuffer?: () => unknown
}

export function createTrackingStorageMock(options: TrackingStorageOptions = {}) {
  return {
    getStoredMissionId: vi.fn(async () => options.getStoredMissionId?.() ?? null),
    setStoredMissionId: vi.fn(async (id: string) => options.setStoredMissionId?.(id)),
    clearStoredMissionId: vi.fn(async () => options.clearStoredMissionId?.()),
    bufferPoint: vi.fn(async (point: unknown) => options.bufferPoint?.(point)),
    bufferAction: vi.fn(async (action: unknown) => options.bufferAction?.(action)),
    flushBuffer: vi.fn(async () => options.flushBuffer?.()),
  }
}

export function createMissionIdStorageOptions(state: { storedMissionId: string | null }) {
  return {
    getStoredMissionId: () => state.storedMissionId,
    setStoredMissionId: (id: string) => { state.storedMissionId = id },
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
