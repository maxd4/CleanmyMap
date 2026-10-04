import { beforeEach, describe, expect, it, vi } from 'vitest'
import { storageTestState as state } from './support/storage-test-setup'

vi.mock('../lib/supabase', () => ({
  getAuthenticatedSupabaseClient: vi.fn(async () => state.client),
}))

import { bufferPoint, flushBuffer, getPendingGpsPointCount } from '../lib/storage'

const point = {
  mission_id: 'mission-1',
  latitude: 48.8566,
  longitude: 2.3522,
  accuracy_m: 5,
  altitude_m: null,
  recorded_at: '2026-09-28T10:00:00.000Z',
}

beforeEach(() => {
  state.client = null
  state.values.clear()
  vi.clearAllMocks()
})

describe('mobile GPS offline storage', () => {

  it('keeps an offline point and replays it once Clerk/Supabase is available', async () => {
    await bufferPoint(point)
    expect(await getPendingGpsPointCount()).toBe(1)

    const insert = vi.fn(async () => ({ error: null }))
    state.client = { from: vi.fn(() => ({ insert })) }

    await flushBuffer()

    expect(insert).toHaveBeenCalledWith([point])
    expect(await getPendingGpsPointCount()).toBe(0)
  })

  it('does not discard the buffer when Supabase replay fails', async () => {
    await bufferPoint(point)
    const insert = vi.fn(async () => ({ error: new Error('network unavailable') }))
    state.client = { from: vi.fn(() => ({ insert })) }

    await flushBuffer()

    expect(insert).toHaveBeenCalledWith([point])
    expect(await getPendingGpsPointCount()).toBe(1)
  })

})

it('keeps a point buffered while an earlier replay is in flight', async () => {
  const pointB = { ...point, latitude: 48.857, recorded_at: '2026-09-28T10:00:05.000Z' }
  await bufferPoint(point)

  let releaseFirstInsert!: () => void
  const insert = vi.fn()
    .mockImplementationOnce(
      () => new Promise<{ error: null }>((resolve) => {
        releaseFirstInsert = () => resolve({ error: null })
      }),
    )
    .mockResolvedValue({ error: null })
  state.client = { from: vi.fn(() => ({ insert })) }

  const firstFlush = flushBuffer()
  await vi.waitFor(() => expect(insert).toHaveBeenCalledOnce())
  const concurrentFlush = flushBuffer()

  await bufferPoint(pointB)
  releaseFirstInsert()
  await Promise.all([firstFlush, concurrentFlush])

  expect(insert).toHaveBeenLastCalledWith([point])
  expect(await getPendingGpsPointCount()).toBe(1)

  await flushBuffer()

  expect(insert).toHaveBeenCalledTimes(2)
  expect(insert).toHaveBeenLastCalledWith([pointB])
  expect(await getPendingGpsPointCount()).toBe(0)
})
