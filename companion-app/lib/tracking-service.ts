/**
 * TrackingService — couche métier du suivi GPS.
 */

import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from './supabase';
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
  MissionLocationInsert,
  MissionAction,
  MissionActionInsert,
  ServiceResult,
} from '../types/mission';

export const GPS_TASK_NAME = 'GPS_TRACKING';
export const EXPO_GO_TRACKING_WARNING =
  "Le GPS en arrière-plan ne fonctionne pas dans Expo Go. Utilise un development build (npx expo run:android ou npx expo run:ios).";

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
}

export async function startTracking(missionId: string): Promise<ServiceResult<Mission>> {
  const trackingWarning = getBackgroundTrackingWarning();
  if (trackingWarning) {
    return { ok: false, error: trackingWarning };
  }

  const permResult = await requestPermissions();
  if (!permResult.ok) return permResult;

  const { data, error } = await supabase
    .from('missions')
    .update({
      status: 'tracking',
      started_at: new Date().toISOString(),
    })
    .eq('id', missionId)
    .select()
    .single<Mission>();

  if (error) {
    return { ok: false, error: `Impossible de démarrer la mission : ${error.message}` };
  }

  await setStoredMissionId(missionId);

  await Location.startLocationUpdatesAsync(GPS_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5 * 60 * 1000,
    distanceInterval: 50,
    deferredUpdatesInterval: 5 * 60 * 1000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'CleanMyMap — Mission en cours',
      notificationBody: 'Suivi GPS actif. Vous pouvez éteindre l\'écran.',
      notificationColor: '#10b981',
    },
  });

  return { ok: true, data };
}

export async function stopTracking(missionId: string): Promise<ServiceResult<Mission>> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(GPS_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(GPS_TASK_NAME);
  }

  await flushBuffer();

  const { data, error } = await supabase
    .from('missions')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
    })
    .eq('id', missionId)
    .select()
    .single<Mission>();

  if (error) {
    return { ok: false, error: `Erreur lors de la finalisation : ${error.message}` };
  }

  await supabase.rpc('compute_mission_distance', {
    p_mission_id: missionId,
  });

  await clearStoredMissionId();

  return { ok: true, data };
}

export async function saveLocationPoint(
  missionId: string,
  location: { latitude: number; longitude: number; accuracy?: number | null; altitude?: number | null },
  recordedAt?: Date,
): Promise<ServiceResult> {
  const point: MissionLocationInsert = {
    mission_id: missionId,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy_m: location.accuracy ?? null,
    altitude_m: location.altitude ?? null,
    recorded_at: (recordedAt ?? new Date()).toISOString(),
  };

  const { error } = await supabase.from('gps_points').insert(point);

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
  let finalLocation = location;

  if (!finalLocation) {
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      finalLocation = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
    } catch (e) {
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

  const { data, error } = await supabase
    .from('mission_actions')
    .insert(action)
    .select()
    .single<MissionAction>();

  if (error) {
    console.warn('[TrackingService] Action échouée, mise en buffer :', error.message);
    await bufferAction(action);
    return { ok: false, error: error.message };
  }

  return { ok: true, data };
}

export async function getMission(missionId: string): Promise<ServiceResult<Mission>> {
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('id', missionId)
    .single<Mission>();

  if (error) {
    return { ok: false, error: `Mission introuvable : ${error.message}` };
  }

  return { ok: true, data };
}

export async function restoreActiveTracking(): Promise<string | null> {
  return await getStoredMissionId();
}
