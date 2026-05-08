/**
 * TrackingService — couche métier du suivi GPS.
 *
 * Responsabilités :
 *  - Demander les permissions GPS (foreground + background)
 *  - Démarrer / arrêter la tâche TaskManager background
 *  - Insérer un point GPS dans Supabase (avec buffer hors-ligne)
 *  - Mettre à jour le statut de la mission dans Supabase
 *
 * TODO (plugin natif) :
 *  - Remplacer startLocationUpdatesAsync par le plugin
 *    @capacitor-community/background-geolocation ou expo-location v2
 *    selon la cible de publication finale.
 *  - Sur Android, s'assurer que le Foreground Service est déclaré dans
 *    AndroidManifest.xml avec FOREGROUND_SERVICE_LOCATION.
 *  - Sur iOS, vérifier que NSLocationAlwaysAndWhenInUseUsageDescription
 *    est présent dans Info.plist (géré via app.json → infoPlist).
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from './supabase';
import {
  getStoredMissionId,
  setStoredMissionId,
  clearStoredMissionId,
  bufferPoint,
  flushBuffer,
} from './storage';
import type { Mission, MissionLocation, MissionLocationInsert, ServiceResult } from '../types/mission';

// ─── Constante ───────────────────────────────────────────────────────────────

export const GPS_TASK_NAME = 'GPS_TRACKING';

// ─── Permissions ─────────────────────────────────────────────────────────────

async function requestPermissions(): Promise<ServiceResult> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') {
    return { ok: false, error: 'Permission GPS premier plan refusée.' };
  }

  // TODO : Sur Android 11+, la permission background déclenche une popup
  // système séparée. Afficher un écran explicatif AVANT cet appel.
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg !== 'granted') {
    return {
      ok: false,
      error:
        'Permission GPS arrière-plan refusée. Le suivi s\'arrêtera si l\'écran est éteint.',
    };
  }

  return { ok: true, data: undefined };
}

// ─── startTracking ────────────────────────────────────────────────────────────

/**
 * Démarre le suivi GPS pour une mission donnée.
 *
 * 1. Vérifie les permissions
 * 2. Met à jour le status Supabase → 'tracking'
 * 3. Stocke l'ID mission localement (pour la tâche background)
 * 4. Lance la tâche TaskManager background
 */
export async function startTracking(missionId: string): Promise<ServiceResult<Mission>> {
  // 1. Permissions
  const permResult = await requestPermissions();
  if (!permResult.ok) return permResult;

  // 2. Mise à jour Supabase
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

  // 3. Persistance locale de l'ID
  await setStoredMissionId(missionId);

  // 4. Démarrage du tracking background
  // TODO : remplacer par le plugin natif si expo-location ne couvre pas le besoin iOS
  await Location.startLocationUpdatesAsync(GPS_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,   // ~100m — bon compromis batterie/précision
    timeInterval: 5 * 60 * 1000,            // 5 min (Android)
    distanceInterval: 50,                    // 50m minimum entre deux points
    deferredUpdatesInterval: 5 * 60 * 1000, // iOS deferred updates
    showsBackgroundLocationIndicator: true,  // Indicateur bleu iOS
    foregroundService: {
      notificationTitle: 'CleanMyMap — Mission en cours',
      notificationBody: 'Suivi GPS actif. Vous pouvez éteindre l\'écran.',
      notificationColor: '#10b981', // emerald-500
    },
  });

  return { ok: true, data };
}

// ─── stopTracking ─────────────────────────────────────────────────────────────

/**
 * Arrête le suivi GPS et finalise la mission.
 *
 * 1. Arrête la tâche TaskManager
 * 2. Flush le buffer hors-ligne
 * 3. Met à jour le status Supabase → 'completed'
 * 4. Déclenche le calcul de distance (RPC Supabase)
 * 5. Nettoie le stockage local
 */
export async function stopTracking(missionId: string): Promise<ServiceResult<Mission>> {
  // 1. Arrêt de la tâche
  const isRegistered = await TaskManager.isTaskRegisteredAsync(GPS_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(GPS_TASK_NAME);
  }

  // 2. Flush des points bufferisés
  await flushBuffer();

  // 3. Mise à jour Supabase
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

  // 4. Calcul de distance (fonction SQL Haversine, définie dans architecture_gps_companion.md)
  // TODO : Appeler après un délai si iOS a encore des points en transit
  const { error: rpcError } = await supabase.rpc('compute_mission_distance', {
    p_mission_id: missionId,
  });
  if (rpcError) {
    console.warn('compute_mission_distance échoué (non bloquant) :', rpcError.message);
  }

  // 5. Nettoyage local
  await clearStoredMissionId();

  return { ok: true, data };
}

// ─── saveLocationPoint ────────────────────────────────────────────────────────

/**
 * Insère un point GPS dans Supabase.
 * En cas d'échec réseau, le point est mis en buffer local (AsyncStorage).
 *
 * Appelé directement depuis la tâche TaskManager background (gps-task.ts).
 * Peut aussi être appelé manuellement depuis l'UI pour un point immédiat.
 */
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

// ─── getMission ───────────────────────────────────────────────────────────────

/**
 * Récupère les détails d'une mission depuis Supabase.
 * Utilisé à l'ouverture de l'app ou via deep link.
 */
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

// ─── Restauration au démarrage ────────────────────────────────────────────────

/**
 * Vérifie si une mission est déjà active au démarrage de l'app
 * (cas de redémarrage après crash ou kill par l'OS).
 */
export async function restoreActiveTracking(): Promise<string | null> {
  return await getStoredMissionId();
}
