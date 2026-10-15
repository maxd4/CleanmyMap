import { mobileRequest } from './mobile-api-client'

export type MobileActionItem = {
  id: string
  created_at: string
  action_date: string
  location_label: string
  actionTitle?: string | null
  volunteers_count: number
  duration_minutes: number
  status: string
  actionPhase?: string
  participantsCount?: number
  joined?: boolean
  awaitingApproval?: boolean
  joinedAt?: string | null
  participationStatus?: string | null
  participationSource?: string | null
  practicalInfo?: Record<string, unknown> | null
  contract?: {
    metadata?: { actionPhase?: string | null; preparationData?: Record<string, unknown> | null }
    dates?: { eventStartTime?: string | null }
  }
}

export type MobileInvitation = {
  registration_id: string
  action_id: string
  action_title?: string | null
  action_date?: string | null
  location_label?: string | null
}

export type MobileActionReviewItem = {
  id: string
  actionId: string
  displayName: string
  handle: string | null
  joinedAt: string
  participationStatus: string
  participationSource: string
}

type MobileActionsPayload = {
  future: MobileActionItem[]
  past: MobileActionItem[]
  history: MobileActionItem[]
  invitations: MobileInvitation[]
}

export type MobileActionEditor = MobileActionItem & {
  id: string
  createdAt?: string
  publishedAt?: string | null
  actionPhase?: string
  preparationData?: Record<string, unknown> | null
  organizerType?: string | null
  organizerName?: string | null
  groupJoinEnabled?: boolean
  eventStartTime?: string | null
  eventEndTime?: string | null
  latitude?: number | null
  longitude?: number | null
  notes?: string | null
}

export type MobileActionDraftPayload = {
  actionDate: string
  locationLabel: string
  latitude?: number
  longitude?: number
  associationName: string
  organizerType: 'association' | 'spontaneous' | 'collective' | 'student_association' | 'other'
  organizerName?: string
  organizerAccounts?: string[]
  participantAccounts?: string[]
  groupJoinEnabled: boolean
  actionPhase: 'pre_action' | 'post_action_draft'
  submissionMode: 'complete'
  eventStartTime?: string | null
  eventEndTime?: string | null
  routeTopology: 'loop' | 'point_to_point'
  routeStyle: 'direct' | 'souple'
  departureLocationLabel?: string
  arrivalLocationLabel?: string
  wasteKg: number
  cigaretteButts: number
  volunteersCount: number
  durationMinutes: number
  wasteMeasurementMethod: 'manual' | 'estimated' | 'weighed' | null
  notes?: string
  preparationData: Record<string, unknown>
}

export type MobileSignalement = {
  id: string
  created_at: string
  label: string
  spot_type: 'spot' | 'clean_place'
  latitude: number | null
  longitude: number | null
  status: 'new' | 'validated' | 'cleaned'
  notes: string | null
}

export async function loadMobileActions(params?: { view: 'all' | 'future' | 'past'; query?: string }) {
  const view = params?.view ?? 'all'
  const search = params?.query
  const query = new URLSearchParams({ view, limit: '24', historyLimit: '200' })
  if (search?.trim()) query.set('q', search.trim())
  return mobileRequest<MobileActionsPayload>(`/api/mobile/actions?${query.toString()}`)
}

export async function loadMobileActionDetail(actionId: string) {
  return mobileRequest<{ action: MobileActionItem; participation: MobileActionItem | null; canJoin: boolean; canClaim: boolean }>(
    `/api/mobile/actions/${encodeURIComponent(actionId)}`,
  )
}

export async function requestFutureAction(actionId: string) {
  return mobileRequest<{ participationStatus: string; joinedAt: string; participantsCount: number }>('/api/mobile/actions', {
    method: 'POST',
    body: JSON.stringify({ actionId, intent: 'join' }),
  })
}

export async function claimPastAction(actionId: string) {
  return mobileRequest<{ participationStatus: string; joinedAt: string }>(`/api/mobile/actions/${encodeURIComponent(actionId)}`, {
    method: 'POST',
    body: JSON.stringify({ intent: 'claim' }),
  })
}

export async function cancelFutureAction(actionId: string) {
  return mobileRequest<{ participationStatus: string }>(`/api/mobile/actions/${encodeURIComponent(actionId)}`, {
    method: 'DELETE',
  })
}

export async function respondToInvitation(registrationId: string, decision: 'accept' | 'reject') {
  return mobileRequest<{ status: string }>('/api/mobile/actions/invitations', {
    method: 'PATCH',
    body: JSON.stringify({ registrationId, decision }),
  })
}

export async function loadActionReview(actionId: string) {
  return mobileRequest<{ pendingRequests: MobileActionReviewItem[]; confirmedParticipants: MobileActionReviewItem[] }>(
    `/api/mobile/actions/${encodeURIComponent(actionId)}/review`,
  )
}

export async function reviewActionRequest(actionId: string, participantId: string, decision: 'accept' | 'reject') {
  return mobileRequest<{ participationStatus: string }>(`/api/mobile/actions/${encodeURIComponent(actionId)}/review`, {
    method: 'POST',
    body: JSON.stringify({ participantId, decision }),
  })
}

export async function createMobileAction(payload: MobileActionDraftPayload) {
  return mobileRequest<{ status: string; id: string; source: string }>('/api/actions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function loadMobileActionEditor(actionId: string) {
  return mobileRequest<{ status: string; action: MobileActionEditor }>(
    `/api/actions/${encodeURIComponent(actionId)}`,
  )
}

export async function updateMobileAction(actionId: string, payload: Partial<MobileActionDraftPayload>) {
  return mobileRequest<{ status: string; actionId: string; actionPhase: string | null }>(
    `/api/actions/${encodeURIComponent(actionId)}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  )
}

export async function publishMobileAction(actionId: string) {
  return mobileRequest<{ status: string; id: string; publishedAt: string; alreadyPublished: boolean }>(
    `/api/actions/${encodeURIComponent(actionId)}/publish`,
    { method: 'POST', body: JSON.stringify({}) },
  )
}

export async function loadMobileActionDay(actionId: string) {
  return mobileRequest<{ status: string; actionId: string; access: string; action: Record<string, unknown> }>(
    `/api/actions/${encodeURIComponent(actionId)}/day`,
  )
}

export async function createMobileSignalement(payload: {
  type: 'spot' | 'clean_place'
  label: string
  latitude: number
  longitude: number
  notes?: string
  wasteCategories?: string[]
}) {
  return mobileRequest<{ status: string; source: string; item: MobileSignalement }>('/api/spots', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function loadMyMobileSignalements() {
  return mobileRequest<{ status: string; items: Array<{
    id: string
    createdAt: string
    type: 'spot' | 'clean_place'
    label: string
    status: 'new' | 'validated' | 'cleaned'
    latitude: number | null
    longitude: number | null
    validatedAt: string | null
    cleanedAt: string | null
  }> }>('/api/signalements/me?limit=100')
}
