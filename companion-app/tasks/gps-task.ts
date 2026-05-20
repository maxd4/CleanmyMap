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
import { supabase } from '../lib/supabase';
import { getStoredMissionId, bufferPoint, flushBuffer } from '../lib/storage';
import { GPS_TASK_NAME } from '../lib/tracking-service';
import type { MissionLocationInsert } from '../types/mission';

// Enregistrement de la tâche — doit être au top-level du module
TaskManager.defineTask(GPS_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[GPS Task] Erreur TaskManager:', error.message);
    return;
  }
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const missionId = await getStoredMissionId();
  if (!missionId) {
    console.warn('[GPS Task] Aucun missionId en storage — tâche ignorée.');
    return;
  }

  for (const loc of locations) {
    const point: MissionLocationInsert = {
      mission_id: missionId,
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy_m: loc.coords.accuracy,
      altitude_m: loc.coords.altitude,
      recorded_at: new Date(loc.timestamp).toISOString(),
    };

    const { error: insertError } = await supabase.from('gps_points').insert(point);

    if (insertError) {
      // Hors ligne ou erreur réseau : buffer local
      console.warn('[GPS Task] Insert échoué, buffer:', insertError.message);
      await bufferPoint(point);
    } else {
      console.log('[GPS Task] Point enregistré');
    }
  }

  // Tentative de flush du buffer à chaque réveil
  await flushBuffer();
});
