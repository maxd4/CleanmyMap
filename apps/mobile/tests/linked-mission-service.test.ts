import { afterEach, describe, expect, it, vi } from 'vitest'

const getToken = vi.hoisted(() => vi.fn())
const getUserId = vi.hoisted(() => vi.fn())
const storage = vi.hoisted(() => ({ pending: [] as string[] }))
vi.mock('../lib/supabase', () => ({ getClerkSupabaseAccessToken: getToken, getClerkUserId: getUserId }))
vi.mock('../lib/storage', () => ({
  getPendingLinkedMissionReconciliationIds: vi.fn(async () => storage.pending),
  removePendingLinkedMissionReconciliation: vi.fn(async (_ownerId: string, id: string) => {
    storage.pending = storage.pending.filter((pendingId) => pendingId !== id)
  }),
}))

import { createLinkedMission, reconcileLinkedMission } from '../lib/linked-mission-service'

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
    getUserId.mockResolvedValue('user_123')
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

  it('creates a linked mission only through the authenticated web boundary', async () => {
    vi.stubEnv('EXPO_PUBLIC_WEB_APP_URL', 'https://cleanmymap.test/')
    getToken.mockResolvedValue('clerk-bearer')
    const mission = { id: 'mission-1', action_id: 'action-1', volunteer_id: 'user_123', label: 'Terrain', status: 'pending' }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ mission }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createLinkedMission(' Terrain ', 'action-1')).resolves.toEqual({ ok: true, data: mission })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://cleanmymap.test/api/missions',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer clerk-bearer', 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: 'action-1', label: ' Terrain ' }),
      }),
    )
    expect(JSON.stringify(fetchMock.mock.calls[0]?.[1])).not.toContain('distance_m')
    expect(JSON.stringify(fetchMock.mock.calls[0]?.[1])).not.toContain('gps_points')
  })

  it('fails closed for missing tokens, forbidden responses and network errors without local success', async () => {
    vi.stubEnv('EXPO_PUBLIC_WEB_APP_URL', 'https://cleanmymap.test')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    getToken.mockResolvedValueOnce(null)
    await expect(createLinkedMission('Terrain', 'action-1')).resolves.toEqual({
      ok: false,
      error: 'Connexion Clerk requise pour accéder à cette mission.',
    })
    expect(fetchMock).not.toHaveBeenCalled()

    getToken.mockResolvedValueOnce('clerk-bearer')
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }))
    await expect(createLinkedMission('Terrain', 'action-1')).resolves.toEqual({ ok: false, error: 'Forbidden' })

    fetchMock.mockRejectedValueOnce(new Error('network unavailable'))
    await expect(createLinkedMission('Terrain', 'action-1')).resolves.toEqual({
      ok: false,
      error: 'Impossible de joindre le site pour créer la mission liée : network unavailable',
    })
  })

  it('replays several pending missions once and removes successful handoffs', async () => {
    vi.stubEnv('EXPO_PUBLIC_WEB_APP_URL', 'https://cleanmymap.test')
    getToken.mockResolvedValue('clerk-bearer')
    getUserId.mockResolvedValue('user_123')
    storage.pending = ['mission-1', 'mission-2', 'mission-3']
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ missionId: 'mission-1', actionId: 'action-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ missionId: 'mission-2', actionId: 'action-2' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'introuvable' }), { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    const { reconcilePendingLinkedMissions } = await import('../lib/linked-mission-service')
    await reconcilePendingLinkedMissions('user_123')

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(storage.pending).toEqual([])
  })

  it('retains a retryable failure for the next meaningful resume', async () => {
    vi.stubEnv('EXPO_PUBLIC_WEB_APP_URL', 'https://cleanmymap.test')
    getToken.mockResolvedValue('clerk-bearer')
    getUserId.mockResolvedValue('user_123')
    storage.pending = ['mission-1']
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })))

    const { reconcilePendingLinkedMissions } = await import('../lib/linked-mission-service')
    await reconcilePendingLinkedMissions('user_123')

    expect(storage.pending).toEqual(['mission-1'])
  })

  it('coalesces concurrent replays for the same owner', async () => {
    vi.stubEnv('EXPO_PUBLIC_WEB_APP_URL', 'https://cleanmymap.test')
    getToken.mockResolvedValue('clerk-bearer')
    getUserId.mockResolvedValue('user_123')
    storage.pending = ['mission-1']
    let release!: () => void
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => {
      release = () => resolve(new Response(JSON.stringify({ missionId: 'mission-1', actionId: 'action-1' }), { status: 200 }))
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { reconcilePendingLinkedMissions } = await import('../lib/linked-mission-service')
    const first = reconcilePendingLinkedMissions('user_123')
    const second = reconcilePendingLinkedMissions('user_123')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    release()
    await Promise.all([first, second])

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(storage.pending).toEqual([])
  })

  it('refuses a replay explicitly owned by an obsolete Clerk identity', async () => {
    vi.stubEnv('EXPO_PUBLIC_WEB_APP_URL', 'https://cleanmymap.test')
    getToken.mockResolvedValue('clerk-bearer')
    getUserId.mockResolvedValue('user_b')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { reconcileLinkedMission } = await import('../lib/linked-mission-service')
    await expect(reconcileLinkedMission('mission-1', 'user_a')).resolves.toEqual({
      ok: false,
      error: 'Identité Clerk obsolète : réconciliation interrompue.',
      terminal: false,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('stops before the network when Clerk changes while the token is acquired', async () => {
    vi.stubEnv('EXPO_PUBLIC_WEB_APP_URL', 'https://cleanmymap.test')
    getUserId
      .mockResolvedValueOnce('user_123')
      .mockResolvedValueOnce('user_other')
    getToken.mockResolvedValue('clerk-bearer')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(reconcileLinkedMission('mission-1', 'user_123')).resolves.toEqual({
      ok: false,
      error: 'Identité Clerk obsolète : réconciliation interrompue.',
      terminal: false,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
