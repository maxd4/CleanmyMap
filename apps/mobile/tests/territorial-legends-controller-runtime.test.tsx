import React, { useEffect } from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  loadConsent: vi.fn(),
  loadOverview: vi.fn(),
  updateConsent: vi.fn(),
  currentUserId: 'user-a' as string | null,
  identityListener: null as ((userId: string | null) => void) | null,
}))

vi.mock('../features/territorial-legends/mobile-territorial-legends-service', () => ({
  loadMobileTerritorialLegendConsent: state.loadConsent,
  loadMobileTerritorialLegendOverview: state.loadOverview,
  updateMobileTerritorialLegendConsent: state.updateConsent,
}))
vi.mock('../shared/lib/supabase', () => ({
  getClerkUserId: vi.fn(async () => state.currentUserId),
  subscribeToClerkIdentityChanges: (listener: (userId: string | null) => void) => {
    state.identityListener = listener
    return () => { if (state.identityListener === listener) state.identityListener = null }
  },
}))

import { useTerritorialLegendsController } from '../features/territorial-legends/use-territorial-legends-controller'

const consent = { status: 'ok', enabled: false, ageBand: '15_or_over', activatedAt: null, revokedAt: null }
const overview = { status: 'ok', campaignYear: 2026, windowDays: 90, levels: ['arrondissement', 'commune', 'department', 'region', 'country'], territories: [] }

function Probe({ ownerId, onValue, onSessionExpired }: { ownerId: string; onValue: (value: ReturnType<typeof useTerritorialLegendsController>) => void; onSessionExpired: () => void }) {
  const value = useTerritorialLegendsController({ ownerId, shouldLoadOverview: true, onSessionExpired })
  useEffect(() => { onValue(value) }, [onValue, value])
  return null
}

async function settle() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('territorial legends controller runtime', () => {
  beforeEach(() => {
    state.loadConsent.mockReset().mockResolvedValue(consent)
    state.loadOverview.mockReset().mockResolvedValue(overview)
    state.updateConsent.mockReset().mockResolvedValue({ ...consent, enabled: true })
    state.currentUserId = 'user-a'
    state.identityListener = null
  })

  it('drops a response that resolves after the Clerk identity changes', async () => {
    let resolveOverview!: (value: typeof overview) => void
    state.loadOverview.mockReturnValueOnce(new Promise((resolve) => { resolveOverview = resolve }))
    let latest!: ReturnType<typeof useTerritorialLegendsController>
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<Probe ownerId="user-a" onValue={(value) => { latest = value }} onSessionExpired={vi.fn()} />)
      await settle()
    })
    state.currentUserId = 'user-b'
    await act(async () => { state.identityListener?.('user-b'); resolveOverview(overview); await settle() })
    expect(latest.overview).toBeNull()
    expect(latest.error).toContain('compte Clerk a changé')
    renderer.unmount()
  })

  it('keeps consent server-owned and refreshes the overview after a change', async () => {
    let latest!: ReturnType<typeof useTerritorialLegendsController>
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<Probe ownerId="user-a" onValue={(value) => { latest = value }} onSessionExpired={vi.fn()} />); await settle() })
    expect(latest.overview?.windowDays).toBe(90)
    await act(async () => { await latest.setTerritorialLegendConsent(true); await settle() })
    expect(state.updateConsent).toHaveBeenCalledWith(true)
    expect(latest.consent?.enabled).toBe(true)
    expect(state.loadOverview).toHaveBeenCalledTimes(2)
    renderer.unmount()
  })
})
