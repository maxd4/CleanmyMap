import { beforeEach, expect, it, vi } from 'vitest'
import { storageTestState as state } from './support/storage-test-setup'

function createStorageSupabaseMock() { return {
  getAuthenticatedSupabaseClient: vi.fn(async () => state.client),
  getClerkUserId: vi.fn(async () => state.currentUserId),
} }

vi.mock('../lib/supabase', createStorageSupabaseMock)

import {
  bufferPoint,
  clearStoredMissionId,
  enqueuePendingLinkedMissionReconciliation,
  flushBuffer,
  getPendingGpsPointCount,
  getPendingLinkedMissionReconciliationIds,
  getStoredActiveMissionContext,
  getStoredMissionId,
  getStoredMissionOwnerId,
  removePendingLinkedMissionReconciliation,
  setStoredMissionId,
} from '../lib/storage'

const point = {
  client_point_id: 'point-1',
  mission_id: 'mission-1',
  latitude: 48.8566,
  longitude: 2.3522,
  accuracy_m: 5,
  altitude_m: null,
  recorded_at: '2026-09-28T10:00:00.000Z',
}
const ownerId = 'user_123'

function resetStorageState() {
  state.client = null
  state.currentUserId = 'user_123'
  state.values.clear()
  vi.clearAllMocks()
}

beforeEach(resetStorageState)

async function replaysOfflinePoint() {
  await bufferPoint(ownerId, point)
  expect(await getPendingGpsPointCount(ownerId)).toBe(1)

  const upsert = vi.fn(async () => ({ error: null }))
  state.client = { from: vi.fn(() => ({ upsert })) }

  await flushBuffer(ownerId)

  expect(upsert).toHaveBeenCalledWith([point], {
    onConflict: 'mission_id,client_point_id',
    ignoreDuplicates: true,
  })
  expect(await getPendingGpsPointCount(ownerId)).toBe(0)
}

it('keeps mission and reconciliation state scoped to the Clerk owner', async () => {
    await setStoredMissionId('user_a', 'mission-a')

    await expect(getStoredMissionId('user_a')).resolves.toBe('mission-a')
    await expect(getStoredMissionId('user_b')).resolves.toBeNull()
    await expect(getStoredActiveMissionContext()).resolves.toEqual({ ownerId: 'user_a', missionId: 'mission-a' })
    await expect(getStoredMissionOwnerId('mission-a')).resolves.toBe('user_a')
    await expect(getStoredMissionOwnerId('mission-b')).resolves.toBeNull()

    await enqueuePendingLinkedMissionReconciliation('user_a', 'mission-a')
    await enqueuePendingLinkedMissionReconciliation('user_a', 'mission-a')
    await enqueuePendingLinkedMissionReconciliation('user_a', '  ')
    await expect(getPendingLinkedMissionReconciliationIds('user_a')).resolves.toEqual(['mission-a'])
    await removePendingLinkedMissionReconciliation('user_a', 'mission-a')
    await expect(getPendingLinkedMissionReconciliationIds('user_a')).resolves.toEqual([])

    await clearStoredMissionId('user_a')
    await expect(getStoredActiveMissionContext()).resolves.toBeNull()
})

it('rejects invalid mission owners before writing local identity state', async () => {
    await expect(setStoredMissionId('user/a', 'mission-a')).rejects.toThrow('Owner Clerk invalide')
    await clearStoredMissionId('user/a')
    await expect(getStoredActiveMissionContext()).resolves.toBeNull()
})

it('serializes reconciliation queue additions per owner without cross-owner loss', async () => {
    await Promise.all([
      enqueuePendingLinkedMissionReconciliation('user_a', 'mission-a1'),
      enqueuePendingLinkedMissionReconciliation('user_a', 'mission-a2'),
      enqueuePendingLinkedMissionReconciliation('user_b', 'mission-b1'),
    ])

    await expect(getPendingLinkedMissionReconciliationIds('user_a')).resolves.toEqual(['mission-a1', 'mission-a2'])
    await expect(getPendingLinkedMissionReconciliationIds('user_b')).resolves.toEqual(['mission-b1'])
})

it('serializes reconciliation additions and removals for one owner', async () => {
    await enqueuePendingLinkedMissionReconciliation('user_a', 'mission-a1')

    await Promise.all([
      enqueuePendingLinkedMissionReconciliation('user_a', 'mission-a2'),
      removePendingLinkedMissionReconciliation('user_a', 'mission-a1'),
    ])

    await expect(getPendingLinkedMissionReconciliationIds('user_a')).resolves.toEqual(['mission-a2'])
})

it('keeps an offline point and replays it once Clerk/Supabase is available', replaysOfflinePoint)

it('does not discard the buffer when Supabase replay fails', async () => {
    await bufferPoint(ownerId, point)
    const upsert = vi.fn(async () => ({ error: new Error('network unavailable') }))
    state.client = { from: vi.fn(() => ({ upsert })) }

    await flushBuffer(ownerId)

    expect(upsert).toHaveBeenCalledWith([point], expect.any(Object))
    expect(await getPendingGpsPointCount(ownerId)).toBe(1)
})

it('keeps the buffer when the Clerk session is unavailable', async () => {
    await bufferPoint(ownerId, point)

    await expect(flushBuffer(ownerId)).resolves.toEqual({
      ok: false,
      error: 'Connexion Clerk requise pour synchroniser les données.',
    })

    expect(await getPendingGpsPointCount(ownerId)).toBe(1)
})

it('never exposes or replays one owner buffer through another owner namespace', async () => {
    await bufferPoint('user_a', point)
    expect(await getPendingGpsPointCount('user_a')).toBe(1)
    expect(await getPendingGpsPointCount('user_b')).toBe(0)

    const upsert = vi.fn(async () => ({ error: null }))
    state.client = { from: vi.fn(() => ({ upsert })) }
    await flushBuffer('user_b')

    expect(upsert).not.toHaveBeenCalled()
    expect(await getPendingGpsPointCount('user_a')).toBe(1)
    state.currentUserId = 'user_a'
    await flushBuffer('user_a')
    expect(upsert).toHaveBeenCalledWith([point], expect.any(Object))
})

it('fails closed for empty or unsafe owner identifiers', async () => {
    await bufferPoint('user/a', point)
    await bufferPoint('   ', point)

    expect(await getPendingGpsPointCount('user/a')).toBe(0)
    expect(await getPendingGpsPointCount('   ')).toBe(0)
    expect(state.values.size).toBe(0)
})

it('removes malformed records without replaying them or discarding valid owner data', async () => {
    state.values.set('_cmm_gps_buffer_index_user_123', JSON.stringify(['bad-record', 'valid-record']))
    state.values.set('bad-record', '{not-json')
    state.values.set('valid-record', JSON.stringify(point))
    const upsert = vi.fn(async () => ({ error: null }))
    state.client = { from: vi.fn(() => ({ upsert })) }

    await flushBuffer(ownerId)

    expect(upsert).toHaveBeenCalledWith([point], expect.any(Object))
    expect(state.values.has('bad-record')).toBe(false)
    expect(await getPendingGpsPointCount(ownerId)).toBe(0)
})

it('keeps owner data when the replay request throws before confirmation', async () => {
    await bufferPoint(ownerId, point)
    const upsert = vi.fn(async () => { throw new Error('connection reset') })
    state.client = { from: vi.fn(() => ({ upsert })) }

    await expect(flushBuffer(ownerId)).resolves.toEqual({
      ok: false,
      error: 'Synchronisation GPS impossible : connection reset',
    })
    expect(await getPendingGpsPointCount(ownerId)).toBe(1)
})

it('retries a point after a lost acknowledgement with the same stable identity', async () => {
    await bufferPoint(ownerId, point)
    const acceptedPointIds: string[] = []
    const upsert = vi.fn()
      .mockImplementationOnce(async (rows: typeof point[]) => {
        acceptedPointIds.push(rows[0].client_point_id)
        throw new Error('ack lost after commit')
      })
      .mockImplementationOnce(async (rows: typeof point[]) => {
        acceptedPointIds.push(rows[0].client_point_id)
        return { error: null }
      })
    state.client = { from: vi.fn(() => ({ upsert })) }

    await flushBuffer(ownerId)
    expect(await getPendingGpsPointCount(ownerId)).toBe(1)
    await flushBuffer(ownerId)

    expect(acceptedPointIds).toEqual(['point-1', 'point-1'])
    expect(await getPendingGpsPointCount(ownerId)).toBe(0)
})

it('persists an identity for a legacy buffered point before a restart/retry', async () => {
    const legacyPoint = { ...point, client_point_id: undefined }
    state.values.set('_cmm_gps_buffer_index_user_123', JSON.stringify(['legacy-record']))
    state.values.set('legacy-record', JSON.stringify(legacyPoint))
    const acceptedPointIds: string[] = []
    const upsert = vi.fn()
      .mockImplementationOnce(async (rows: typeof point[]) => {
        acceptedPointIds.push(rows[0].client_point_id)
        return { error: new Error('ack lost after commit') }
      })
      .mockImplementationOnce(async (rows: typeof point[]) => {
        acceptedPointIds.push(rows[0].client_point_id)
        return { error: null }
      })
    state.client = { from: vi.fn(() => ({ upsert })) }

    await flushBuffer(ownerId)
    const persistedAfterFirstAttempt = JSON.parse(state.values.get('legacy-record') ?? '{}') as { client_point_id?: string }
    expect(persistedAfterFirstAttempt.client_point_id).toEqual(expect.any(String))
    expect(await getPendingGpsPointCount(ownerId)).toBe(1)

    await flushBuffer(ownerId)

    expect(acceptedPointIds).toHaveLength(2)
    expect(acceptedPointIds[1]).toBe(acceptedPointIds[0])
    expect(await getPendingGpsPointCount(ownerId)).toBe(0)
})

it('refuses replay after the Clerk account changes without touching the owner buffer', async () => {
    await bufferPoint(ownerId, point)
    state.currentUserId = 'user_other'
    const upsert = vi.fn(async () => ({ error: null }))
    state.client = { from: vi.fn(() => ({ upsert })) }

    await expect(flushBuffer(ownerId)).resolves.toEqual({
      ok: false,
      error: 'Identité Clerk obsolète : synchronisation interrompue.',
    })
    expect(upsert).not.toHaveBeenCalled()
    expect(await getPendingGpsPointCount(ownerId)).toBe(1)
})

it('keeps a point buffered while an earlier replay is in flight', async () => {
  const pointB = { ...point, latitude: 48.857, recorded_at: '2026-09-28T10:00:05.000Z' }
  await bufferPoint(ownerId, point)

  let releaseFirstInsert!: () => void
  const upsert = vi.fn()
    .mockImplementationOnce(
      () => new Promise<{ error: null }>((resolve) => {
        releaseFirstInsert = () => resolve({ error: null })
      }),
    )
    .mockResolvedValue({ error: null })
  state.client = { from: vi.fn(() => ({ upsert })) }

  const firstFlush = flushBuffer(ownerId)
  await vi.waitFor(() => expect(upsert).toHaveBeenCalledOnce())
  const concurrentFlush = flushBuffer(ownerId)

  await bufferPoint(ownerId, pointB)
  releaseFirstInsert()
  await Promise.all([firstFlush, concurrentFlush])

  expect(upsert).toHaveBeenLastCalledWith([point], expect.any(Object))
  expect(await getPendingGpsPointCount(ownerId)).toBe(1)

  await flushBuffer(ownerId)

  expect(upsert).toHaveBeenCalledTimes(2)
  expect(upsert).toHaveBeenLastCalledWith([pointB], expect.any(Object))
  expect(await getPendingGpsPointCount(ownerId)).toBe(0)
})
