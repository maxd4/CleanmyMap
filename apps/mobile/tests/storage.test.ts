import { beforeEach, describe, expect, it, vi } from 'vitest'
import { storageTestState as state } from './support/storage-test-setup'

vi.mock('../lib/supabase', () => ({
  getAuthenticatedSupabaseClient: vi.fn(async () => state.client),
}))

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
  mission_id: 'mission-1',
  latitude: 48.8566,
  longitude: 2.3522,
  accuracy_m: 5,
  altitude_m: null,
  recorded_at: '2026-09-28T10:00:00.000Z',
}
const ownerId = 'user_123'

beforeEach(() => {
  state.client = null
  state.values.clear()
  vi.clearAllMocks()
})

describe('mobile GPS offline storage', () => {

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

  it('keeps an offline point and replays it once Clerk/Supabase is available', async () => {
    await bufferPoint(ownerId, point)
    expect(await getPendingGpsPointCount(ownerId)).toBe(1)

    const insert = vi.fn(async () => ({ error: null }))
    state.client = { from: vi.fn(() => ({ insert })) }

    await flushBuffer(ownerId)

    expect(insert).toHaveBeenCalledWith([point])
    expect(await getPendingGpsPointCount(ownerId)).toBe(0)
  })

  it('does not discard the buffer when Supabase replay fails', async () => {
    await bufferPoint(ownerId, point)
    const insert = vi.fn(async () => ({ error: new Error('network unavailable') }))
    state.client = { from: vi.fn(() => ({ insert })) }

    await flushBuffer(ownerId)

    expect(insert).toHaveBeenCalledWith([point])
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

    const insert = vi.fn(async () => ({ error: null }))
    state.client = { from: vi.fn(() => ({ insert })) }
    await flushBuffer('user_b')

    expect(insert).not.toHaveBeenCalled()
    expect(await getPendingGpsPointCount('user_a')).toBe(1)
    await flushBuffer('user_a')
    expect(insert).toHaveBeenCalledWith([point])
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
    const insert = vi.fn(async () => ({ error: null }))
    state.client = { from: vi.fn(() => ({ insert })) }

    await flushBuffer(ownerId)

    expect(insert).toHaveBeenCalledWith([point])
    expect(state.values.has('bad-record')).toBe(false)
    expect(await getPendingGpsPointCount(ownerId)).toBe(0)
  })

  it('keeps owner data when the replay request throws before confirmation', async () => {
    await bufferPoint(ownerId, point)
    const insert = vi.fn(async () => { throw new Error('connection reset') })
    state.client = { from: vi.fn(() => ({ insert })) }

    await expect(flushBuffer(ownerId)).resolves.toEqual({
      ok: false,
      error: 'Synchronisation GPS impossible : connection reset',
    })
    expect(await getPendingGpsPointCount(ownerId)).toBe(1)
  })

})

it('keeps a point buffered while an earlier replay is in flight', async () => {
  const pointB = { ...point, latitude: 48.857, recorded_at: '2026-09-28T10:00:05.000Z' }
  await bufferPoint(ownerId, point)

  let releaseFirstInsert!: () => void
  const insert = vi.fn()
    .mockImplementationOnce(
      () => new Promise<{ error: null }>((resolve) => {
        releaseFirstInsert = () => resolve({ error: null })
      }),
    )
    .mockResolvedValue({ error: null })
  state.client = { from: vi.fn(() => ({ insert })) }

  const firstFlush = flushBuffer(ownerId)
  await vi.waitFor(() => expect(insert).toHaveBeenCalledOnce())
  const concurrentFlush = flushBuffer(ownerId)

  await bufferPoint(ownerId, pointB)
  releaseFirstInsert()
  await Promise.all([firstFlush, concurrentFlush])

  expect(insert).toHaveBeenLastCalledWith([point])
  expect(await getPendingGpsPointCount(ownerId)).toBe(1)

  await flushBuffer(ownerId)

  expect(insert).toHaveBeenCalledTimes(2)
  expect(insert).toHaveBeenLastCalledWith([pointB])
  expect(await getPendingGpsPointCount(ownerId)).toBe(0)
})
