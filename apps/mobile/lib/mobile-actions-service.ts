import { getClerkSupabaseAccessToken } from './supabase'

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

const baseUrl = () => process.env.EXPO_PUBLIC_WEB_APP_URL?.trim().replace(/\/$/, '')

async function mobileRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const origin = baseUrl()
  if (!origin) throw new Error('URL du site web absente.')
  const token = await getClerkSupabaseAccessToken()
  if (!token) {
    const error = new Error('Session Clerk expirée ou indisponible.')
    ;(error as Error & { status?: number }).status = 401
    throw error
  }

  const response = await fetch(`${origin}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const payload = await response.json().catch(() => null) as (T & { error?: string }) | null
  if (!response.ok) {
    const error = new Error(payload && typeof payload.error === 'string' ? payload.error : 'Action indisponible.')
    ;(error as Error & { status?: number }).status = response.status
    throw error
  }
  return payload as T
}

export async function loadMobileActions(params: { view: 'all' | 'future' | 'past'; query?: string } = { view: 'all' }) {
  const query = new URLSearchParams({ view: params.view, limit: '24', historyLimit: '200' })
  if (params.query?.trim()) query.set('q', params.query.trim())
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
