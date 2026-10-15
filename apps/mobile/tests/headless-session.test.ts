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

import { getAuthenticatedSupabaseClient, getClerkSupabaseAccessToken, getClerkUserId } from '../lib/supabase'

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
    await expect(getAuthenticatedSupabaseClient()).resolves.toBeNull()
    expect(state.instance.session.getToken).toHaveBeenCalledTimes(2)
  })

  it('reads the same Clerk owner used to namespace headless GPS data', async () => {
    state.instance = createClerkInstance('headless-clerk-jwt', 'user_a')
    await expect(getClerkUserId()).resolves.toBe('user_a')
  })

  it('falls back to the Clerk session subject when the user object is unavailable', async () => {
    state.instance = createClerkInstance('headless-clerk-jwt', null, 'user_from_session')

    await expect(getClerkUserId()).resolves.toBe('user_from_session')
    await expect(getAuthenticatedSupabaseClient()).resolves.toBeTruthy()
  })

  it('returns no owner or authenticated client when Clerk loading fails', async () => {
    state.instance = {
      loaded: false,
      load: vi.fn(async () => { throw new Error('expired session') }),
      session: { getToken: vi.fn(async () => 'unreachable') },
      user: null,
    }

    await expect(getClerkUserId()).resolves.toBeNull()
    await expect(getAuthenticatedSupabaseClient()).resolves.toBeNull()
  })
})

function createClerkInstance(token: string | null = 'headless-clerk-jwt', userId: string | null = null, sessionUserId: string | null = null) {
  return {
    loaded: false,
    load: vi.fn(async function load(this: { loaded: boolean }) {
      this.loaded = true
    }),
    session: { getToken: vi.fn(async () => token), user: sessionUserId ? { id: sessionUserId } : undefined },
    user: userId ? { id: userId } : null,
  }
}
