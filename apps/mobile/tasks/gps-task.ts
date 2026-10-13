/**
 * gps-task.ts — Tâche background TaskManager
 *
 * Ce fichier DOIT être importé au niveau racine de l'app (index.ts)
 * AVANT registerRootComponent, sinon la tâche ne sera pas enregistrée
 * quand l'OS réveille l'app en background.
 *
 * TODO (plugin natif Android) :
 *  - Ajouter dans AndroidManifest.xml :
 *    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
 *    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
 *  - Le foregroundService config ci-dessous gère la notification persistante Android.
 *
 * TODO (plugin natif iOS) :
 *  - Vérifier que UIBackgroundModes contient "location" dans app.json → ios.infoPlist
 *    (déjà configuré dans ce repo).
 *  - Sur iOS, timeInterval n'est pas garanti — l'OS peut différer jusqu'à 15 min.
 *    Combiner avec significantLocationChange pour les réveils fiables.
 */

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { getAuthenticatedSupabaseClient, getClerkUserId } from '../lib/supabase';
import { getStoredActiveMissionContext, bufferPoint, flushBuffer } from '../lib/storage';
import { createGpsPointId } from '../lib/gps-point-identity';
import { GPS_TASK_NAME } from '../lib/tracking-service';
import type { MissionLocationInsert } from '../types/mission';

function toMissionLocationInsert(
  missionId: string,
  location: Location.LocationObject,
): MissionLocationInsert {
  return {
    client_point_id: createGpsPointId(),
    mission_id: missionId,
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy_m: location.coords.accuracy,
    altitude_m: location.coords.altitude,
    recorded_at: new Date(location.timestamp).toISOString(),
  };
}

// Enregistrement de la tâche — doit être au top-level du module
TaskManager.defineTask(GPS_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[GPS Task] Erreur TaskManager:', error.message);
    return;
  }
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const context = await getStoredActiveMissionContext();
  if (!context) {
    console.warn('[GPS Task] Aucun missionId en storage — tâche ignorée.');
    return;
  }
  const { missionId, ownerId } = context;
  const currentUserId = await getClerkUserId();
  if (currentUserId && currentUserId !== ownerId) {
    // Un compte différent ne doit ni lire ni envoyer le buffer A. Les points
    // reçus après un changement de session ne sont pas attribués à A.
    console.warn('[GPS Task] Identité Clerk différente de la mission active — points ignorés.');
    return;
  }

  const client = await getAuthenticatedSupabaseClient();
  if (!client) {
    // Un réveil headless sans session Clerk valide ne doit jamais basculer vers
    // Supabase Auth anonyme. Les points restent dans le buffer local.
    for (const loc of locations) {
      await bufferPoint(ownerId, toMissionLocationInsert(missionId, loc));
    }
    return;
  }
  const verifiedUserId = await getClerkUserId();
  if (!verifiedUserId) {
    for (const loc of locations) {
      await bufferPoint(ownerId, toMissionLocationInsert(missionId, loc));
    }
    return;
  }
  if (verifiedUserId !== ownerId) {
    console.warn('[GPS Task] Identité Clerk devenue obsolète avant émission — points ignorés.');
    return;
  }

  for (const loc of locations) {
    const point = toMissionLocationInsert(missionId, loc);

    let insertError: Error | null = null;
    try {
      const result = await client.from('gps_points').upsert(point, {
        onConflict: 'mission_id,client_point_id',
        ignoreDuplicates: true,
      });
      insertError = result.error;
    } catch (error) {
      insertError = error instanceof Error ? error : new Error('Session Clerk indisponible.');
    }

    if (insertError) {
      // Hors ligne ou erreur réseau : buffer local
      console.warn('[GPS Task] Insert échoué, buffer:', insertError.message);
      await bufferPoint(ownerId, point);
    } else {
      console.log('[GPS Task] Point enregistré');
    }
  }

  // Tentative de flush du buffer à chaque réveil
  await flushBuffer(ownerId);
});
