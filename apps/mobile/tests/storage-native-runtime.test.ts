import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ values: new Map<string, string>(), asyncCalls: 0, secureCalls: 0 }))

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => { state.asyncCalls += 1; return null }),
    setItem: vi.fn(async () => { state.asyncCalls += 1 }),
    removeItem: vi.fn(async () => { state.asyncCalls += 1 }),
  },
}))
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => { state.secureCalls += 1; return state.values.get(key) ?? null }),
  setItemAsync: vi.fn(async (key: string, value: string) => { state.secureCalls += 1; state.values.set(key, value) }),
  deleteItemAsync: vi.fn(async (key: string) => { state.secureCalls += 1; state.values.delete(key) }),
}))
vi.mock('../lib/supabase', () => ({
  getAuthenticatedSupabaseClient: vi.fn(async () => null),
  getClerkUserId: vi.fn(async () => null),
}))

import { clearStoredMissionId, getStoredMissionId, setStoredMissionId } from '../lib/storage'

describe('mobile native storage path', () => {
  beforeEach(() => {
    state.values.clear()
    state.asyncCalls = 0
    state.secureCalls = 0
  })

  it('uses SecureStore for owner-scoped mission identity and never AsyncStorage', async () => {
    await setStoredMissionId('native-user', 'mission-native')
    await expect(getStoredMissionId('native-user')).resolves.toBe('mission-native')
    await clearStoredMissionId('native-user')
    await expect(getStoredMissionId('native-user')).resolves.toBeNull()

    expect(state.secureCalls).toBeGreaterThan(0)
    expect(state.asyncCalls).toBe(0)
  })
})
