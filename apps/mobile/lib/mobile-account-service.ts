import { mobileRequest } from './mobile-api-client'

export type MobileAccountLocation = {
  country: 'France'
  level: 'country' | 'region' | 'department' | 'commune' | 'arrondissement'
  label: string
  subtitle: string | null
  arrondissement: number | null
  arrondissementCity: 'Paris' | 'Lyon' | 'Marseille' | null
} | null

export type MobileAccountHistoryItem = {
  id: string
  actionTitle?: string | null
  action_date: string
  location_label: string
  actionPhase: string
  participationStatus: string
  joinedAt: string | null
  individualImpact?: Record<string, unknown> | null
  personalImpactAttribution?: Record<string, unknown> | null
}

export type MobileAccountPayload = {
  identity: {
    userId: string
    displayName: string
    displayNameMode: 'full_name' | 'pseudo'
    handle: string
    firstName: string | null
    lastName: string | null
    username: string | null
    email: string | null
    grantedRole: string
    activeRole: string
    availableActiveRoles: string[]
    currentLevel: number
  }
  onboarding: { completed: boolean; version: number | null; currentVersion: number }
  locationPreferences: { residence: MobileAccountLocation; work: MobileAccountLocation }
  activityStatus: 'active' | 'inactive'
  notifications: {
    informationalEnabled: boolean
    actionRemindersEnabled: boolean
    mutedInformationActionIds: string[]
  }
  history: MobileAccountHistoryItem[]
  invitations: Array<Record<string, unknown>>
  missions: Array<{
    id: string
    label: string
    status: string
    action_id: string | null
    created_at: string
    started_at: string | null
    ended_at: string | null
    distance_m: number | null
    duration_s: number | null
  }>
  createdActions: Array<{
    id: string
    title: string | null
    actionDate: string
    locationLabel: string
    status: string
    actionPhase: string
    publishedAt: string | null
    createdAt: string
  }>
  progression: Record<string, unknown> | null
  counts: {
    registrations: number
    confirmedParticipations: number
    missions: number
    createdActions: number
  }
}

export async function loadMobileAccount() {
  return mobileRequest<{ status: string } & MobileAccountPayload>('/api/mobile/account')
}

export async function updateMobileAccountProfile(payload: {
  firstName: string
  lastName: string
  residenceLabel: string | null
  workLabel: string | null
  completeOnboarding?: boolean
}) {
  return mobileRequest<{ status: string; account: MobileAccountPayload }>('/api/mobile/account', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function updateMobileActiveRole(activeRole: string) {
  return mobileRequest<{ role: string; activeRole: string; activeProfile: string }>('/api/account/active-profile', {
    method: 'POST',
    body: JSON.stringify({ activeRole }),
  })
}

export async function updateMobileDisplayNameMode(displayNameMode: 'full_name' | 'pseudo') {
  return mobileRequest<{ status: string; displayNameMode: 'full_name' | 'pseudo'; displayName: string }>(
    '/api/users/profile/display-name-mode',
    { method: 'PATCH', body: JSON.stringify({ displayNameMode }) },
  )
}

export async function updateMobileActivityStatus(activityStatus: 'active' | 'inactive') {
  return mobileRequest<{ activityStatus: 'active' | 'inactive' }>('/api/account/activity-status', {
    method: 'PATCH',
    body: JSON.stringify({ activityStatus }),
  })
}

export async function updateMobileNotificationPreferences(payload: {
  informationalEnabled?: boolean
  actionRemindersEnabled?: boolean
}) {
  return mobileRequest<MobileAccountPayload['notifications']>('/api/notifications/preferences', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
