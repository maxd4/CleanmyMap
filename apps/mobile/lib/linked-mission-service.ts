import { getClerkSupabaseAccessToken } from './supabase';
import type { Mission, ServiceResult } from '../types/mission';

const CLERK_SESSION_REQUIRED_ERROR =
  "Connexion Clerk requise pour accéder à cette mission.";

export async function createLinkedMission(
  label: string,
  actionId: string,
): Promise<ServiceResult<Mission>> {
  const baseUrl = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim().replace(/\/$/, '');
  if (!baseUrl) {
    return { ok: false, error: 'URL du site web absente pour créer une mission liée.' };
  }

  const token = await getClerkSupabaseAccessToken();
  if (!token) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  try {
    const response = await fetch(`${baseUrl}/api/missions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ actionId, label }),
    });
    const payload = (await response.json().catch(() => null)) as {
      mission?: Mission;
      error?: string;
    } | null;
    if (!response.ok || !payload?.mission) {
      return {
        ok: false,
        error: payload?.error ?? 'Impossible de créer la mission GPS liée.',
      };
    }
    return { ok: true, data: payload.mission };
  } catch (error) {
    return {
      ok: false,
      error: `Impossible de joindre le site pour créer la mission liée : ${error instanceof Error ? error.message : 'erreur inconnue.'}`,
    };
  }
}

/** Retryable server handoff; it reads canonical contribution facts, never GPS points. */
export async function reconcileLinkedMission(
  missionId: string,
): Promise<ServiceResult<{ missionId: string; actionId: string }>> {
  const baseUrl = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim().replace(/\/$/, '');
  if (!baseUrl) return { ok: false, error: 'URL du site web absente pour réconcilier la mission liée.' };
  const token = await getClerkSupabaseAccessToken();
  if (!token) return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  try {
    const response = await fetch(`${baseUrl}/api/missions/${encodeURIComponent(missionId)}/reconcile`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await response.json().catch(() => null)) as {
      missionId?: string; actionId?: string; error?: string;
    } | null;
    if (!response.ok || !payload?.missionId || !payload.actionId) {
      return { ok: false, error: payload?.error ?? 'Réconciliation différée.' };
    }
    return { ok: true, data: { missionId: payload.missionId, actionId: payload.actionId } };
  } catch {
    return { ok: false, error: 'Réconciliation différée.' };
  }
}
