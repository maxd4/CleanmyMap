import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { MissionLocationInsert } from '../types/mission';

const MISSION_KEY = '@cmm_current_mission_id';
const BUFFER_KEY = '@cmm_gps_buffer';

// ─── Mission ID persistant ────────────────────────────────────────────────────

export async function setStoredMissionId(id: string): Promise<void> {
  await AsyncStorage.setItem(MISSION_KEY, id);
}

export async function getStoredMissionId(): Promise<string | null> {
  return AsyncStorage.getItem(MISSION_KEY);
}

export async function clearStoredMissionId(): Promise<void> {
  await AsyncStorage.removeItem(MISSION_KEY);
}

// ─── Buffer hors-ligne ────────────────────────────────────────────────────────

/**
 * Ajoute un point GPS au buffer local (AsyncStorage).
 * Utilisé quand l'envoi Supabase échoue (pas de réseau).
 */
export async function bufferPoint(point: MissionLocationInsert): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(BUFFER_KEY);
    const buffer: MissionLocationInsert[] = existing ? JSON.parse(existing) : [];
    buffer.push(point);
    await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(buffer));
    console.log(`[Storage] Point bufferisé. Total buffer : ${buffer.length}`);
  } catch (e) {
    console.error('[Storage] Impossible de bufferiser le point', e);
  }
}

/**
 * Tente d'envoyer tous les points en buffer à Supabase.
 * En cas de succès, vide le buffer. En cas d'échec partiel, garde le buffer intact.
 *
 * TODO : implémenter un retry exponentiel si le réseau est instable sur la durée.
 */
export async function flushBuffer(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(BUFFER_KEY);
    if (!existing) return;

    const buffer: MissionLocationInsert[] = JSON.parse(existing);
    if (buffer.length === 0) return;

    console.log(`[Storage] Flush buffer : ${buffer.length} point(s)`);

    const { error } = await supabase.from('gps_points').insert(buffer);

    if (!error) {
      await AsyncStorage.removeItem(BUFFER_KEY);
      console.log('[Storage] Buffer vidé avec succès');
    } else {
      console.warn('[Storage] Flush échoué (réseau ?) :', error.message);
    }
  } catch (e) {
    console.error('[Storage] Erreur lors du flush', e);
  }
}

/**
 * Retourne le nombre de points actuellement en buffer (pour affichage UI).
 */
export async function getBufferCount(): Promise<number> {
  try {
    const existing = await AsyncStorage.getItem(BUFFER_KEY);
    if (!existing) return 0;
    const buffer: MissionLocationInsert[] = JSON.parse(existing);
    return buffer.length;
  } catch {
    return 0;
  }
}
