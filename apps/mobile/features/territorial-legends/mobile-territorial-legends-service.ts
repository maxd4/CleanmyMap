import { mobileRequest } from '../../shared/lib/mobile-api-client'

export type MobileTerritorialLegendLevel = 'arrondissement' | 'commune' | 'department' | 'region' | 'country'

export type MobileTerritorialLegendReward = {
  awardKind: 'conquest' | 'longevity' | 'season_end'
  thresholdDays: number
  validityStatus: 'active' | 'invalidated' | 'revoked' | 'closed' | string
}

export type MobileTerritorialLegendOverviewTerritory = {
  /** The server may expose an owner-eligible territory before any title or reward exists. */
  level: MobileTerritorialLegendLevel
  territoryCode: string
  territoryLabel: string | null
  private: {
    rank: number | null
    score: number
    distinctActions: number
    tied: boolean
    tieSize: number
    title: string | null
  } | null
  public: {
    competitorCount: number
    maxScore: number
    titleEligible: boolean
    title: string | null
    items: Array<{
      rank: number
      publicLabel: string
      score: number
      distinctActions: number
      tied: boolean
      tieSize: number
    }>
  }
  currentHold: { startedOn: string; lastVerifiedOn: string; days: number } | null
  bestHistory: { campaignYear: number; startedOn: string; endedOn: string | null; days: number } | null
  rewards: MobileTerritorialLegendReward[]
}

export type MobileTerritorialLegendOverview = {
  status: string
  campaignYear: number
  windowDays: number
  levels: MobileTerritorialLegendLevel[]
  territories: MobileTerritorialLegendOverviewTerritory[]
}

export type MobileTerritorialLegendConsent = {
  status: string
  enabled: boolean
  ageBand: string
  activatedAt: string | null
  revokedAt: string | null
  updatedAt?: string | null
}

export async function loadMobileTerritorialLegendOverview(): Promise<MobileTerritorialLegendOverview> {
  return mobileRequest<MobileTerritorialLegendOverview>('/api/gamification/territorial-leaderboard/overview')
}

export async function loadMobileTerritorialLegendConsent(): Promise<MobileTerritorialLegendConsent> {
  return mobileRequest<MobileTerritorialLegendConsent>('/api/users/profile/territorial-legend-consent')
}

export async function updateMobileTerritorialLegendConsent(enabled: boolean): Promise<MobileTerritorialLegendConsent> {
  return mobileRequest<MobileTerritorialLegendConsent>('/api/users/profile/territorial-legend-consent', {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
}
