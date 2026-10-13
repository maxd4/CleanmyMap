import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseMock } from './support/tracking-mocks'

const state = vi.hoisted(() => ({
  task: null as ((input: { data?: unknown; error?: Error }) => Promise<void>) | null,
  missionId: 'mission-1' as string | null,
  ownerId: 'user_123' as string | null,
  contextOwnerId: 'user_123' as string | null,
  client: null as any,
  currentUserId: 'user_123' as string | null,
  bufferedPoints: [] as unknown[],
  flushCount: 0,
}))

vi.mock('expo-task-manager', () => ({
  defineTask: vi.fn((_name: string, task: typeof state.task) => {
    state.task = task
  }),
}))

vi.mock('expo-location', () => ({}))

vi.mock('../lib/tracking-service', () => ({ GPS_TASK_NAME: 'GPS_TRACKING' }))

vi.mock('../lib/supabase', () => ({
  ...createSupabaseMock(() => state.client),
  getClerkUserId: vi.fn(async () => state.currentUserId),
}))

vi.mock('../lib/storage', () => ({
  getStoredActiveMissionContext: vi.fn(async () => state.missionId && state.contextOwnerId ? { missionId: state.missionId, ownerId: state.contextOwnerId } : null),
  bufferPoint: vi.fn(async (...args: [string, unknown]) => {
    const point = args[1]
    state.bufferedPoints.push(point)
  }),
  flushBuffer: vi.fn(async () => {
    state.flushCount += 1
  }),
}))

import '../tasks/gps-task'

const location = {
  coords: { latitude: 48.8566, longitude: 2.3522, accuracy: 5, altitude: 35 },
  timestamp: Date.parse('2026-10-02T10:00:00.000Z'),
}

async function runGpsTaskWithInsert(
  upsert: ReturnType<typeof vi.fn>,
) {
  state.client = { from: vi.fn(() => ({ upsert })) }
  await state.task?.({ data: { locations: [location] } })
}

function expectGpsPointInsert(insert: ReturnType<typeof vi.fn>) {
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({
    client_point_id: expect.any(String),
    mission_id: 'mission-1',
    latitude: 48.8566,
    longitude: 2.3522,
    accuracy_m: 5,
    altitude_m: 35,
    recorded_at: '2026-10-02T10:00:00.000Z',
  }), { onConflict: 'mission_id,client_point_id', ignoreDuplicates: true })
}

describe('mobile GPS TaskManager task', () => {
  beforeEach(() => {
    state.missionId = 'mission-1'
    state.ownerId = 'user_123'
    state.currentUserId = 'user_123'
    state.contextOwnerId = 'user_123'
    state.client = null
    state.bufferedPoints.length = 0
    state.flushCount = 0
  })

  it('buffers all points when headless Clerk has no valid token', async () => {
    expect(state.task).toBeTypeOf('function')
    await state.task?.({ data: { locations: [location] } })

    expect(state.bufferedPoints).toEqual([{
      client_point_id: expect.any(String),
      mission_id: 'mission-1',
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy_m: 5,
      altitude_m: 35,
      recorded_at: '2026-10-02T10:00:00.000Z',
    }])
    expect(state.flushCount).toBe(0)
  })

  it('uses the Clerk-backed client when a later headless wake has a session', async () => {
    const upsert = vi.fn(async () => ({ error: null }))

    await runGpsTaskWithInsert(upsert)

    expectGpsPointInsert(upsert)
    expect(state.bufferedPoints).toEqual([])
    expect(state.flushCount).toBe(1)
  })

  it('buffers a point when the headless GPS insert fails', async () => {
    const insertError = new Error('network unavailable')
    const upsert = vi.fn(async () => ({ error: insertError }))

    await runGpsTaskWithInsert(upsert)

    expectGpsPointInsert(upsert)
    expect(state.bufferedPoints).toHaveLength(1)
    expect(state.bufferedPoints[0]).toEqual(expect.objectContaining({
      client_point_id: expect.any(String),
      mission_id: 'mission-1',
    }))
    const directPoint = ((upsert.mock.calls as unknown[][])[0]?.[0] as { client_point_id: string } | undefined)
    expect((state.bufferedPoints[0] as { client_point_id: string }).client_point_id)
      .toBe(directPoint?.client_point_id)
    expect(state.flushCount).toBe(1)
  })

  it('does not send owner A points with owner B session', async () => {
    state.currentUserId = 'user_b'
    const upsert = vi.fn(async () => ({ error: null }))
    await runGpsTaskWithInsert(upsert)

    expect(upsert).not.toHaveBeenCalled()
    expect(state.bufferedPoints).toEqual([])
    expect(state.flushCount).toBe(0)
  })

  it('ignores an OS task error or an empty wake without touching storage', async () => {
    const upsert = vi.fn(async () => ({ error: null }))
    state.client = { from: vi.fn(() => ({ upsert })) }

    await state.task?.({ error: new Error('location unavailable') })
    await state.task?.({})

    expect(upsert).not.toHaveBeenCalled()
    expect(state.bufferedPoints).toEqual([])
    expect(state.flushCount).toBe(0)
  })

  it('fails closed when no owner-scoped active mission context is recoverable', async () => {
    state.missionId = null
    const upsert = vi.fn(async () => ({ error: null }))
    state.client = { from: vi.fn(() => ({ upsert })) }

    await state.task?.({ data: { locations: [location] } })

    expect(upsert).not.toHaveBeenCalled()
    expect(state.bufferedPoints).toEqual([])
    expect(state.flushCount).toBe(0)
  })
})
