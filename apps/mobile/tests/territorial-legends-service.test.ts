import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestMock = vi.hoisted(() => vi.fn())

vi.mock('../shared/lib/mobile-api-client', () => ({ mobileRequest: requestMock }))

import {
  loadMobileTerritorialLegendConsent,
  loadMobileTerritorialLegendOverview,
  updateMobileTerritorialLegendConsent,
} from '../features/territorial-legends/mobile-territorial-legends-service'

describe('mobile territorial legends service', () => {
  beforeEach(() => requestMock.mockReset().mockResolvedValue({ status: 'ok' }))

  it('reads the shared owner-scoped overview contract without local derivation', async () => {
    await loadMobileTerritorialLegendOverview()
    expect(requestMock).toHaveBeenCalledWith('/api/gamification/territorial-leaderboard/overview')
  })

  it('synchronizes the existing territorial consent contract', async () => {
    await loadMobileTerritorialLegendConsent()
    await updateMobileTerritorialLegendConsent(false)
    expect(requestMock).toHaveBeenNthCalledWith(1, '/api/users/profile/territorial-legend-consent')
    expect(requestMock).toHaveBeenNthCalledWith(2, '/api/users/profile/territorial-legend-consent', {
      method: 'PATCH',
      body: JSON.stringify({ enabled: false }),
    })
  })
})
