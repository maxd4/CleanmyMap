import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseMock } from './support/tracking-mocks'

const state = vi.hoisted(() => ({
  task: null as ((input: { data?: unknown; error?: Error }) => Promise<void>) | null,
  missionId: 'mission-1' as string | null,
  client: null as any,
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

vi.mock('../lib/supabase', () => createSupabaseMock(() => state.client))

vi.mock('../lib/storage', () => ({
  getStoredMissionId: vi.fn(async () => state.missionId),
  bufferPoint: vi.fn(async (point: unknown) => {
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
  insert: (point: unknown) => Promise<{ error: Error | null }>,
) {
  state.client = { from: vi.fn(() => ({ insert })) }
  await state.task?.({ data: { locations: [location] } })
}

function expectGpsPointInsert(insert: ReturnType<typeof vi.fn>) {
  expect(insert).toHaveBeenCalledWith({
    mission_id: 'mission-1',
    latitude: 48.8566,
    longitude: 2.3522,
    accuracy_m: 5,
    altitude_m: 35,
    recorded_at: '2026-10-02T10:00:00.000Z',
  })
}

describe('mobile GPS TaskManager task', () => {
  beforeEach(() => {
    state.missionId = 'mission-1'
    state.client = null
    state.bufferedPoints.length = 0
    state.flushCount = 0
  })

  it('buffers all points when headless Clerk has no valid token', async () => {
    expect(state.task).toBeTypeOf('function')
    await state.task?.({ data: { locations: [location] } })

    expect(state.bufferedPoints).toEqual([{
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
    const insert = vi.fn(async () => ({ error: null }))

    await runGpsTaskWithInsert(insert)

    expectGpsPointInsert(insert)
    expect(state.bufferedPoints).toEqual([])
    expect(state.flushCount).toBe(1)
  })

  it('buffers a point when the headless GPS insert fails', async () => {
    const insertError = new Error('network unavailable')
    const insert = vi.fn(async () => ({ error: insertError }))

    await runGpsTaskWithInsert(insert)

    expectGpsPointInsert(insert)
    expect(state.bufferedPoints).toEqual([{
      mission_id: 'mission-1',
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy_m: 5,
      altitude_m: 35,
      recorded_at: '2026-10-02T10:00:00.000Z',
    }])
    expect(state.flushCount).toBe(1)
  })
})
