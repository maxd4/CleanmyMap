import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  token: 'clerk-session-token' as string | null,
}))

vi.mock('../lib/supabase', () => ({
  getClerkSupabaseAccessToken: vi.fn(async () => state.token),
}))

import { mobileRequest } from '../lib/mobile-api-client'

describe('mobile HTTP boundary client', () => {
  beforeEach(() => {
    state.token = 'clerk-session-token'
    process.env.EXPO_PUBLIC_WEB_APP_URL = 'https://cleanmymap.test/'
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('sends the Clerk Bearer token and returns the server payload', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(mobileRequest<{ status: string }>('/api/mobile/account')).resolves.toEqual({ status: 'ok' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://cleanmymap.test/api/mobile/account',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer clerk-session-token',
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('fails closed when the web origin is not configured', async () => {
    delete process.env.EXPO_PUBLIC_WEB_APP_URL

    await expect(mobileRequest('/api/mobile/account')).rejects.toThrow('URL du site web absente.')
  })

  it('returns an explicit expired-session error before making a request', async () => {
    state.token = null
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(mobileRequest('/api/mobile/account')).rejects.toMatchObject({
      message: 'Session Clerk expirée ou indisponible.',
      status: 401,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('preserves the server refusal and status for an authenticated request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })))

    await expect(mobileRequest('/api/account/active-profile', { method: 'POST' })).rejects.toMatchObject({ message: 'Forbidden', status: 403 })
  })

  it('uses the generic error when a refusal has no JSON payload', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not-json', { status: 500 })))

    await expect(mobileRequest('/api/mobile/account')).rejects.toMatchObject({ message: 'Compte indisponible.', status: 500 })
  })
})
