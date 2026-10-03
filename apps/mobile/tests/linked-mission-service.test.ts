import { afterEach, describe, expect, it, vi } from 'vitest'

const getToken = vi.hoisted(() => vi.fn())
vi.mock('../lib/supabase', () => ({ getClerkSupabaseAccessToken: getToken }))

import { reconcileLinkedMission } from '../lib/linked-mission-service'

describe('linked mission gamification handoff', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('uses the authenticated retryable server handoff without carrying GPS data', async () => {
    vi.stubEnv('EXPO_PUBLIC_WEB_APP_URL', 'https://cleanmymap.test/')
    getToken.mockResolvedValue('clerk-bearer')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ missionId: 'mission-1', actionId: 'action-1' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(reconcileLinkedMission('mission-1')).resolves.toEqual({
      ok: true,
      data: { missionId: 'mission-1', actionId: 'action-1' },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://cleanmymap.test/api/missions/mission-1/reconcile',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer clerk-bearer' },
      }),
    )
    expect(JSON.stringify(fetchMock.mock.calls[0]?.[1])).not.toContain('gps_points')
  })
})
