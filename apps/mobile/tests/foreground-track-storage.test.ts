import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
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
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => undefined),
  deleteItemAsync: vi.fn(async () => undefined),
}))

vi.mock('../lib/supabase', () => ({
  getAuthenticatedSupabaseClient: vi.fn(async () => null),
}))

import {
  clearStoredForegroundTrack,
  getPendingGpsPointCount,
  getStoredForegroundTrack,
  saveStoredForegroundTrack,
} from '../lib/storage'

describe('mobile foreground display track storage', () => {
  beforeEach(() => {
    state.values.clear()
    vi.clearAllMocks()
  })

  it('keeps the foreground display trace local and separate from the GPS sync buffer', async () => {
    const localTrack = [{ latitude: 48.8566, longitude: 2.3522, recordedAt: '2026-09-28T10:00:00.000Z' }]

    await saveStoredForegroundTrack('mission-1', localTrack)

    await expect(getStoredForegroundTrack('mission-1')).resolves.toEqual(localTrack)
    expect(await getPendingGpsPointCount()).toBe(0)

    await clearStoredForegroundTrack('mission-1')
    await expect(getStoredForegroundTrack('mission-1')).resolves.toEqual([])
  })
})
