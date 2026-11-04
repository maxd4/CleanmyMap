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

function Probe({ ownerId, onValue, onSessionExpired }: { ownerId: string | null; onValue: (value: ReturnType<typeof useTerritorialLegendsController>) => void; onSessionExpired: () => void }) {
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

  it('clears owner data on prop transitions A to B to A and then null without a subscription event', async () => {
    let latest!: ReturnType<typeof useTerritorialLegendsController>
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<Probe ownerId="user-a" onValue={(value) => { latest = value }} onSessionExpired={vi.fn()} />)
      await settle()
    })
    expect(latest.overview).toBe(overview)

    let resolveB!: (value: typeof overview) => void
    state.currentUserId = 'user-b'
    state.loadOverview.mockReturnValueOnce(new Promise((resolve) => { resolveB = resolve }))
    await act(async () => {
      renderer.update(<Probe ownerId="user-b" onValue={(value) => { latest = value }} onSessionExpired={vi.fn()} />)
      await settle()
    })
    expect(latest.overview).toBeNull()
    expect(latest.consent).toBeNull()
    resolveB(overview)
    await act(async () => { await settle() })
    expect(latest.overview).toBe(overview)

    state.currentUserId = 'user-a'
    await act(async () => {
      renderer.update(<Probe ownerId="user-a" onValue={(value) => { latest = value }} onSessionExpired={vi.fn()} />)
      await settle()
    })
    expect(latest.overview).toBe(overview)

    state.currentUserId = null
    await act(async () => {
      renderer.update(<Probe ownerId={null} onValue={(value) => { latest = value }} onSessionExpired={vi.fn()} />)
      await settle()
    })
    expect(latest.overview).toBeNull()
    expect(latest.consent).toBeNull()
    renderer.unmount()
  })

  it('rejects a response when Clerk identity is unknown instead of treating null as compatible', async () => {
    let latest!: ReturnType<typeof useTerritorialLegendsController>
    let renderer!: TestRenderer.ReactTestRenderer
    state.currentUserId = null
    await act(async () => {
      renderer = TestRenderer.create(<Probe ownerId="user-a" onValue={(value) => { latest = value }} onSessionExpired={vi.fn()} />)
      await settle()
    })
    expect(latest.overview).toBeNull()
    expect(latest.consent).toBeNull()
    renderer.unmount()
  })

  it('keeps the newest concurrent refresh and drops the older response', async () => {
    let latest!: ReturnType<typeof useTerritorialLegendsController>
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<Probe ownerId="user-a" onValue={(value) => { latest = value }} onSessionExpired={vi.fn()} />)
      await settle()
    })
    let resolveFirst!: (value: typeof overview) => void
    state.loadOverview.mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }))
    state.loadOverview.mockResolvedValueOnce({ ...overview, campaignYear: 2027 })
    let first!: Promise<void>
    let second!: Promise<void>
    await act(async () => {
      first = latest.refresh()
      second = latest.refresh()
      await second
      resolveFirst(overview)
      await first
      await settle()
    })
    expect(latest.overview?.campaignYear).toBe(2027)
    renderer.unmount()
  })
})
