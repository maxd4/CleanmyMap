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

describe('mobile GPS flush concurrency', () => {
  beforeEach(() => {
    state.client = null
    state.values.clear()
    vi.clearAllMocks()
  })

  it('shares one in-flight replay when foreground and background flush together', async () => {
    await bufferPoint(point)

    let releaseInsert!: () => void
    const insert = vi.fn(
      () => new Promise<{ error: null }>((resolve) => {
        releaseInsert = () => resolve({ error: null })
      }),
    )
    state.client = { from: vi.fn(() => ({ insert })) }

    const foregroundFlush = flushBuffer()
    const backgroundFlush = flushBuffer()

    await vi.waitFor(() => expect(insert).toHaveBeenCalledOnce())

    releaseInsert()
    await expect(Promise.all([foregroundFlush, backgroundFlush])).resolves.toEqual([
      { ok: true, data: undefined },
      { ok: true, data: undefined },
    ])
    expect(await getPendingGpsPointCount()).toBe(0)
  })
})
