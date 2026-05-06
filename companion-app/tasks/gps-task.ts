import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { getStoredMissionId, bufferPoint, flushBuffer } from '../lib/storage';

export const TASK_NAME = 'GPS_TRACKING';

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error || !data) {
    console.error('Error in TaskManager:', error);
    return;
  }

  const { locations } = data as { locations: Location.LocationObject[] };
  const missionId = await getStoredMissionId();
  if (!missionId) return;

  for (const loc of locations) {
    const point = {
      mission_id: missionId,
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy_m: loc.coords.accuracy,
      altitude_m: loc.coords.altitude,
      recorded_at: new Date(loc.timestamp).toISOString(),
    };

    // Tenter l'envoi direct
    const { error: insertError } = await supabase.from('gps_points').insert(point);
    if (insertError) {
      console.warn('Network error, buffering point', insertError);
      await bufferPoint(point);
    }
  }

  // Tenter de vider le buffer à chaque réveil background
  await flushBuffer();
});

export async function startTrackingTask() {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    alert('Permission Foreground requise');
    return;
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    alert('Permission Background requise pour continuer écran éteint');
    return;
  }

  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,    // ~100m, économise la batterie
    timeInterval: 5 * 60 * 1000,             // 5 min (Android)
    distanceInterval: 50,                    // 50m minimum entre 2 points
    deferredUpdatesInterval: 5 * 60 * 1000,  // iOS deferred updates
    showsBackgroundLocationIndicator: true,   // Indicateur bleu iOS
    foregroundService: {                      // Notification persistante Android
      notificationTitle: 'CleanMyMap en cours',
      notificationBody: 'Enregistrement de votre parcours',
      notificationColor: '#10b981', // emerald-500
    },
  });
}

export async function stopTrackingTask() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  }
}
