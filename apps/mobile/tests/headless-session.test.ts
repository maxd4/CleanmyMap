import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => {
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_headless'
  return {
    instance: null as any,
    getClerkInstance: vi.fn(),
    tokenCache: { getToken: vi.fn() },
  }
})

vi.mock('@clerk/expo', () => ({
  getClerkInstance: state.getClerkInstance,
}))

vi.mock('@clerk/expo/token-cache', () => ({
  tokenCache: state.tokenCache,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}))

vi.mock('react-native-url-polyfill/auto', () => ({}))

import { getClerkSupabaseAccessToken } from '../lib/supabase'

describe('mobile headless Clerk session', () => {
  beforeEach(() => {
    state.instance = null
    state.getClerkInstance.mockReset()
    state.getClerkInstance.mockImplementation((options?: unknown) => {
      if (!options && !state.instance) throw new Error('missing publishable key')
      if (options && !state.instance) state.instance = createClerkInstance()
      return state.instance
    })
    vi.clearAllMocks()
  })

  it('initializes and loads Clerk from the SecureStore token cache in headless mode', async () => {
    const result = await getClerkSupabaseAccessToken()

    expect(result).toBe('headless-clerk-jwt')
    expect(state.getClerkInstance).toHaveBeenCalledWith({
      publishableKey: expect.any(String),
      tokenCache: state.tokenCache,
    })
    expect(state.instance.load).toHaveBeenCalledOnce()
    expect(state.instance.session.getToken).toHaveBeenCalledOnce()
  })

  it('returns no token without inventing an anonymous or Supabase session', async () => {
    state.instance = createClerkInstance(null)

    await expect(getClerkSupabaseAccessToken()).resolves.toBeNull()
    expect(state.instance.session.getToken).toHaveBeenCalledOnce()
  })
})

function createClerkInstance(token: string | null = 'headless-clerk-jwt') {
  return {
    loaded: false,
    load: vi.fn(async function load(this: { loaded: boolean }) {
      this.loaded = true
    }),
    session: { getToken: vi.fn(async () => token) },
  }
}
