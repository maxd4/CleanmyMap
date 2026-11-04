import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { commonNativeComponents, nativeComponent } from './support/native-component'
import type { TerritorialLegendsController } from '../features/territorial-legends/use-territorial-legends-controller'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('react-native', () => ({ ...commonNativeComponents(), ScrollView: nativeComponent('ScrollView') }))

import { TerritorialLegendsScreen } from '../features/territorial-legends/territorial-legends-screen'

function controller(overrides: Partial<TerritorialLegendsController> = {}): TerritorialLegendsController {
  return {
    overview: {
      status: 'ok', campaignYear: 2026, windowDays: 90,
      levels: ['arrondissement', 'commune', 'department', 'region', 'country'],
      territories: [{
        level: 'commune', territoryCode: '75056', territoryLabel: 'Paris',
        private: { rank: 1, score: 2, distinctActions: 2, tied: true, tieSize: 2, title: 'Légende de Paris' },
        public: { competitorCount: 2, maxScore: 2, titleEligible: true, title: 'Légende de Paris', items: [{ rank: 1, publicLabel: 'Camille', score: 2, distinctActions: 2, tied: true, tieSize: 2 }] },
        currentHold: { startedOn: '2026-11-01', lastVerifiedOn: '2026-11-04', days: 4 },
        bestHistory: { campaignYear: 2026, startedOn: '2026-10-01', endedOn: '2026-11-04', days: 35 },
        rewards: [{ awardKind: 'conquest', thresholdDays: 0, validityStatus: 'active' }, { awardKind: 'longevity', thresholdDays: 7, validityStatus: 'active' }],
      }],
    },
    consent: { status: 'ok', enabled: false, ageBand: 'unknown', activatedAt: null, revokedAt: null },
    overviewLoading: false, consentLoading: false, savingConsent: false, error: null, message: null,
    refresh: vi.fn(async () => undefined), setTerritorialLegendConsent: vi.fn(async () => undefined),
    ...overrides,
  }
}

function textContent(node: TestRenderer.ReactTestInstance): string {
  return node.children.map((child) => typeof child === 'string' ? child : textContent(child)).join('')
}

describe('territorial legends screen runtime', () => {
  it('renders grades, private title, public ties, periods and server-confirmed rewards', async () => {
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<TerritorialLegendsScreen controller={controller()} onOpenPreferences={vi.fn()} />) })
    const text = textContent(renderer.root)
    expect(text).toContain('Cinq grades')
    expect(text).toContain('Légende de Paris')
    expect(text).toContain('égalité à 2')
    expect(text).toContain('35 j')
    expect(text).toContain('Première conquête')
    expect(text).toContain('7 jours de détention')
  })

  it('keeps empty competition and partial data explicit without fabricating awards', async () => {
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<TerritorialLegendsScreen controller={controller({ overview: { status: 'ok', campaignYear: 2026, windowDays: 90, levels: [], territories: [] }, consent: { status: 'ok', enabled: false, ageBand: 'unknown', activatedAt: null, revokedAt: null } })} onOpenPreferences={vi.fn()} />) })
    const text = textContent(renderer.root)
    expect(text).toContain('Aucune compétition territoriale disponible')
    expect(text).toContain('progression privée reste consultable')
    expect(text).not.toContain('Première conquête')
  })

  it('renders the loading and error states', async () => {
    let loading!: TestRenderer.ReactTestRenderer
    await act(async () => { loading = TestRenderer.create(<TerritorialLegendsScreen controller={controller({ overview: null, overviewLoading: true })} onOpenPreferences={vi.fn()} />) })
    expect(textContent(loading.root)).toContain('Chargement des Légendes territoriales')
    let error!: TestRenderer.ReactTestRenderer
    await act(async () => { error = TestRenderer.create(<TerritorialLegendsScreen controller={controller({ overview: null, error: 'Réponse indisponible' })} onOpenPreferences={vi.fn()} />) })
    expect(textContent(error.root)).toContain('Réponse indisponible')
  })
})
