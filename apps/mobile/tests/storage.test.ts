import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  client: null as any,
  values: new Map<string, string>(),
}))

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}))

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => state.values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      state.values.set(key, value)
    }),
    removeItem: vi.fn(async (key: string) => {
      state.values.delete(key)
    }),
  },
}))

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => state.values.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    state.values.set(key, value)
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    state.values.delete(key)
  }),
}))

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
