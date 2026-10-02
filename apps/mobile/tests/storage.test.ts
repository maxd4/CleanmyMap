import { beforeEach, describe, expect, it, vi } from 'vitest'
import { storageTestState as state } from './support/storage-test-setup'

vi.mock('../lib/supabase', () => ({
  getAuthenticatedSupabaseClient: vi.fn(async () => state.client),
}))

import { bufferPoint, flushBuffer, getBufferCount } from '../lib/storage'

const point = {
  mission_id: 'mission-1',
  latitude: 48.8566,
  longitude: 2.3522,
  accuracy_m: 5,
  altitude_m: null,
  recorded_at: '2026-09-28T10:00:00.000Z',
}

describe('mobile GPS offline storage', () => {
  beforeEach(() => {
    state.client = null
    state.values.clear()
    vi.clearAllMocks()
  })

  it('keeps an offline point and replays it once Clerk/Supabase is available', async () => {
    await bufferPoint(point)
    expect(await getBufferCount()).toBe(1)

    const insert = vi.fn(async () => ({ error: null }))
    state.client = { from: vi.fn(() => ({ insert })) }

    await flushBuffer()

    expect(insert).toHaveBeenCalledWith([point])
    expect(await getBufferCount()).toBe(0)
  })

  it('does not discard the buffer when Supabase replay fails', async () => {
    await bufferPoint(point)
    const insert = vi.fn(async () => ({ error: new Error('network unavailable') }))
    state.client = { from: vi.fn(() => ({ insert })) }

    await flushBuffer()

    expect(insert).toHaveBeenCalledWith([point])
    expect(await getBufferCount()).toBe(1)
  })

})
