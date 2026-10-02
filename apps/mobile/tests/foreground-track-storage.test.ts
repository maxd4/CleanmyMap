import { beforeEach, describe, expect, it, vi } from 'vitest'
import { storageTestState as state } from './support/storage-test-setup'

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
