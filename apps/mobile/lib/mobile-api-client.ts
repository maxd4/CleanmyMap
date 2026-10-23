import { getClerkSupabaseAccessToken } from './supabase'
import { getMobileApiBaseUrl } from './mobile-environment'

export async function mobileRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const origin = getMobileApiBaseUrl()
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
    const error = new Error(payload && typeof payload.error === 'string' ? payload.error : 'Compte indisponible.')
    ;(error as Error & { status?: number }).status = response.status
    throw error
  }
  return payload as T
}
