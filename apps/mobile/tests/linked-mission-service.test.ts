import { afterEach, describe, expect, it, vi } from 'vitest'

const getToken = vi.hoisted(() => vi.fn())
const storage = vi.hoisted(() => ({ pending: [] as string[] }))
vi.mock('../lib/supabase', () => ({ getClerkSupabaseAccessToken: getToken }))
vi.mock('../lib/storage', () => ({
  getPendingLinkedMissionReconciliationIds: vi.fn(async () => storage.pending),
  removePendingLinkedMissionReconciliation: vi.fn(async (id: string) => {
    storage.pending = storage.pending.filter((pendingId) => pendingId !== id)
  }),
}))

import { reconcileLinkedMission } from '../lib/linked-mission-service'

describe('linked mission gamification handoff', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    storage.pending = []
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

  it('replays several pending missions once and removes successful handoffs', async () => {
    vi.stubEnv('EXPO_PUBLIC_WEB_APP_URL', 'https://cleanmymap.test')
    getToken.mockResolvedValue('clerk-bearer')
    storage.pending = ['mission-1', 'mission-2', 'mission-3']
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ missionId: 'mission-1', actionId: 'action-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ missionId: 'mission-2', actionId: 'action-2' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'introuvable' }), { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    const { reconcilePendingLinkedMissions } = await import('../lib/linked-mission-service')
    await reconcilePendingLinkedMissions()

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(storage.pending).toEqual([])
  })

  it('retains a retryable failure for the next meaningful resume', async () => {
    vi.stubEnv('EXPO_PUBLIC_WEB_APP_URL', 'https://cleanmymap.test')
    getToken.mockResolvedValue('clerk-bearer')
    storage.pending = ['mission-1']
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })))

    const { reconcilePendingLinkedMissions } = await import('../lib/linked-mission-service')
    await reconcilePendingLinkedMissions()

    expect(storage.pending).toEqual(['mission-1'])
  })
})
