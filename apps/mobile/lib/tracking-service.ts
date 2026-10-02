/**
 * TrackingService — couche métier du suivi GPS.
 */

import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getAuthenticatedSupabaseClient } from './supabase';
import {
  getStoredMissionId,
  setStoredMissionId,
  clearStoredMissionId,
  bufferPoint,
  bufferAction,
  flushBuffer,
} from './storage';
import type {
  Mission,
  MissionLocation,
  MissionAction,
  MissionActionInsert,
  MissionFinalizationStage,
  ServiceResult,
} from '../types/mission';

export const GPS_TASK_NAME = 'GPS_TRACKING';
export const EXPO_GO_TRACKING_WARNING =
  "Le GPS en arrière-plan ne fonctionne pas dans Expo Go. Utilise un development build (npx expo run:android ou npx expo run:ios).";
export const CLERK_SESSION_REQUIRED_ERROR =
  "Connexion Clerk requise pour accéder à cette mission.";

function backgroundLocationOptions() {
  return {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5 * 60 * 1000,
    distanceInterval: 50,
    deferredUpdatesInterval: 5 * 60 * 1000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'CleanMyMap — Mission en cours',
      notificationBody: 'Suivi GPS actif. Vous pouvez éteindre l’écran.',
      notificationColor: '#10b981',
    },
  };
}

async function restartBackgroundTracking(): Promise<ServiceResult> {
  const trackingWarning = getBackgroundTrackingWarning();
  if (trackingWarning) return { ok: false, error: trackingWarning };

  try {
    await Location.startLocationUpdatesAsync(GPS_TASK_NAME, backgroundLocationOptions());
    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      error: `Impossible de reprendre le suivi GPS : ${error instanceof Error ? error.message : 'erreur inconnue.'}`,
    };
  }
}

export function getBackgroundTrackingWarning(): string | null {
  const appOwnership = (Constants as { appOwnership?: string }).appOwnership;
  const executionEnvironment = (Constants as { executionEnvironment?: string }).executionEnvironment;

  if (appOwnership === 'expo' || executionEnvironment === 'storeClient') {
    return EXPO_GO_TRACKING_WARNING;
  }

  return null;
}

async function requestPermissions(): Promise<ServiceResult> {
  const trackingWarning = getBackgroundTrackingWarning();
  if (trackingWarning) {
    return { ok: false, error: trackingWarning };
  }

  try {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== 'granted') {
      return { ok: false, error: 'Permission GPS premier plan refusée.' };
    }

    const { status: bg } = await Location.requestBackgroundPermissionsAsync();
    if (bg !== 'granted') {
      return {
        ok: false,
        error: 'Permission GPS arrière-plan refusée. Le suivi s\'arrêtera si l\'écran est éteint.',
      };
    }

    return { ok: true, data: undefined };
  } catch (error) {
    return {
      ok: false,
      error: `Impossible de vérifier les permissions GPS : ${error instanceof Error ? error.message : 'erreur inconnue.'}`,
    };
  }
}

export async function requestTrackingPermissions(): Promise<ServiceResult> {
  return requestPermissions();
}

async function cancelMissionAfterStartFailure(missionId: string): Promise<void> {
  const client = await getAuthenticatedSupabaseClient();
  if (!client) return;

  const result = await executeMissionQuery(
    async () => client
      .from('missions')
      .update({
        status: 'cancelled',
        ended_at: new Date().toISOString(),
      })
      .eq('id', missionId)
      .select()
      .single<Mission>(),
    'Impossible d\'annuler la mission interrompue',
  );

  if (!result.ok) {
    console.warn('[TrackingService] Nettoyage de mission échoué :', result.error);
  }
}

async function stopStartedTracking(): Promise<void> {
  try {
    await Location.stopLocationUpdatesAsync(GPS_TASK_NAME);
  } catch (error) {
    console.warn(
      '[TrackingService] Arrêt du GPS après échec impossible :',
      error instanceof Error ? error.message : error,
    );
  }
}

async function executeMissionQuery(
  operation: () => Promise<{ data: Mission | null; error: Error | null }>,
  errorPrefix: string,
): Promise<ServiceResult<Mission>> {
  let data: Mission | null = null;
  let error: Error | null = null;
  try {
    const result = await operation();
    data = result.data;
    error = result.error;
  } catch (requestError) {
    error = requestError instanceof Error ? requestError : new Error('Session Clerk indisponible.');
  }

  if (error || !data) {
    return {
      ok: false,
      error: `${errorPrefix} : ${error?.message ?? 'Réponse mission invalide.'}`,
    };
  }

  return { ok: true, data };
}

export async function startTracking(missionId: string): Promise<ServiceResult<Mission>> {
  const client = await getAuthenticatedSupabaseClient();
  if (!client) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  const trackingWarning = getBackgroundTrackingWarning();
  if (trackingWarning) {
    return { ok: false, error: trackingWarning };
  }

  try {
    await Location.startLocationUpdatesAsync(GPS_TASK_NAME, backgroundLocationOptions());
  } catch (error) {
    return {
      ok: false,
      error: `Impossible de démarrer le suivi GPS : ${error instanceof Error ? error.message : 'erreur inconnue.'}`,
    };
  }

  const missionResult = await executeMissionQuery(
    async () => client
      .from('missions')
      .update({
        status: 'tracking',
        started_at: new Date().toISOString(),
      })
      .eq('id', missionId)
      .select()
      .single<Mission>(),
    'Impossible de démarrer la mission',
  );
  if (!missionResult.ok) {
    await stopStartedTracking();
    return missionResult;
  }

  try {
    await setStoredMissionId(missionId);
  } catch (error) {
    await stopStartedTracking();
    return {
      ok: false,
      error: `Impossible de mémoriser la mission active : ${error instanceof Error ? error.message : 'erreur inconnue.'}`,
    };
  }

  return missionResult;
}

export async function startMobileMission(
  volunteerId: string,
  label = 'Action bénévole mobile',
): Promise<ServiceResult<Mission>> {
  const permissionResult = await requestTrackingPermissions();
  if (!permissionResult.ok) return permissionResult;

  const missionResult = await createMission(volunteerId, label);
  if (!missionResult.ok) return missionResult;

  const trackingResult = await startTracking(missionResult.data.id);
  if (trackingResult.ok) return trackingResult;

  await cancelMissionAfterStartFailure(missionResult.data.id);
  return trackingResult;
}

export async function createMission(volunteerId: string, label = 'Action bénévole mobile'): Promise<ServiceResult<Mission>> {
  const normalizedVolunteerId = volunteerId.trim();
  const normalizedLabel = label.trim();

  if (!normalizedVolunteerId) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  if (!normalizedLabel) {
    return { ok: false, error: 'Libellé de mission requis.' };
  }

  const client = await getAuthenticatedSupabaseClient();
  if (!client) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  return executeMissionQuery(
    async () => client
      .from('missions')
      .insert({ volunteer_id: normalizedVolunteerId, label: normalizedLabel })
      .select()
      .single<Mission>(),
    'Impossible de créer la mission',
  );
}

export async function stopTracking(
  missionId: string,
  onStageChange?: (stage: MissionFinalizationStage) => void,
): Promise<ServiceResult<Mission>> {
  const client = await getAuthenticatedSupabaseClient();
  if (!client) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GPS_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(GPS_TASK_NAME);
    }
  } catch (error) {
    const resumeResult = await restartBackgroundTracking();
    const resumeSuffix = resumeResult.ok ? '' : ` ${resumeResult.error}`;
    return {
      ok: false,
      error: `Impossible de suspendre le suivi GPS : ${error instanceof Error ? error.message : 'erreur inconnue.'}.${resumeSuffix}`,
    };
  }

  onStageChange?.('synchronizing');
  const flushResult = await flushBuffer();
  if (flushResult && !flushResult.ok) {
    const resumeResult = await restartBackgroundTracking();
    const resumeSuffix = resumeResult.ok ? '' : ` ${resumeResult.error}`;
    return { ok: false, error: `${flushResult.error}.${resumeSuffix}` };
  }

  onStageChange?.('finalizing');
  const missionResult = await executeMissionQuery(
    async () => client
      .from('missions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
      })
      .eq('id', missionId)
      .select()
      .single<Mission>(),
    'Erreur lors de la finalisation',
  );
  if (!missionResult.ok) {
    const resumeResult = await restartBackgroundTracking();
    const resumeSuffix = resumeResult.ok ? '' : ` ${resumeResult.error}`;
    return { ok: false, error: `${missionResult.error}.${resumeSuffix}` };
  }

  await clearStoredMissionId();

  return missionResult;
}

export async function saveLocationPoint(
  missionId: string,
  location: { latitude: number; longitude: number; accuracy?: number | null; altitude?: number | null },
  recordedAt?: Date,
): Promise<ServiceResult> {
  const point: MissionLocation = {
    mission_id: missionId,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy_m: location.accuracy ?? null,
    altitude_m: location.altitude ?? null,
    recorded_at: (recordedAt ?? new Date()).toISOString(),
  };

  const client = await getAuthenticatedSupabaseClient();
  if (!client) {
    await bufferPoint(point);
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  let error: Error | null = null;
  try {
    error = (await client.from('gps_points').insert(point)).error;
  } catch (requestError) {
    error = requestError instanceof Error ? requestError : new Error('Session Clerk indisponible.');
  }

  if (error) {
    console.warn('[TrackingService] Insert échoué, mise en buffer :', error.message);
    await bufferPoint(point);
    return { ok: false, error: error.message };
  }

  return { ok: true, data: undefined };
}

export async function saveMissionAction(
  missionId: string,
  actionType: MissionActionInsert['type'],
  location?: { latitude: number; longitude: number },
  content?: string,
  imageUrl?: string
): Promise<ServiceResult<MissionAction>> {
  const client = await getAuthenticatedSupabaseClient();
  if (!client) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  let finalLocation = location;

  if (!finalLocation) {
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      finalLocation = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
    } catch {
      return { ok: false, error: 'Impossible de récupérer la position GPS pour cette action.' };
    }
  }

  const action: MissionActionInsert = {
    mission_id: missionId,
    type: actionType,
    content,
    image_url: imageUrl,
    latitude: finalLocation.latitude,
    longitude: finalLocation.longitude,
    recorded_at: new Date().toISOString(),
  };

  let data: MissionAction | null = null;
  let error: Error | null = null;
  try {
    const result = await client
      .from('mission_actions')
      .insert(action)
      .select()
      .single<MissionAction>();
    data = result.data;
    error = result.error;
  } catch (requestError) {
    error = requestError instanceof Error ? requestError : new Error('Session Clerk indisponible.');
  }

  if (error || !data) {
    const message = error?.message ?? 'Réponse action invalide.';
    console.warn('[TrackingService] Action échouée, mise en buffer :', message);
    await bufferAction(action);
    return { ok: false, error: message };
  }

  return { ok: true, data };
}

export async function getMission(missionId: string): Promise<ServiceResult<Mission>> {
  const client = await getAuthenticatedSupabaseClient();
  if (!client) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  return executeMissionQuery(
    async () => client
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single<Mission>(),
    'Mission introuvable',
  );
}

export async function getMissionTrack(missionId: string): Promise<ServiceResult<MissionLocation[]>> {
  const client = await getAuthenticatedSupabaseClient();
  if (!client) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  try {
    const result = await client
      .from('gps_points')
      .select('id, mission_id, latitude, longitude, accuracy_m, altitude_m, recorded_at')
      .eq('mission_id', missionId)
      .order('recorded_at', { ascending: true });

    if (result.error) {
      return { ok: false, error: `Impossible de restaurer le tracé : ${result.error.message}` };
    }

    const points = (result.data ?? []) as MissionLocation[];
    points.sort((first, second) => Date.parse(first.recorded_at) - Date.parse(second.recorded_at));
    return { ok: true, data: points };
  } catch (error) {
    return {
      ok: false,
      error: `Impossible de restaurer le tracé : ${error instanceof Error ? error.message : 'erreur inconnue.'}`,
    };
  }
}

export async function restoreActiveTracking(): Promise<string | null> {
  return await getStoredMissionId();
}
