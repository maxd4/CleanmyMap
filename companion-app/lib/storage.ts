import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const MISSION_KEY = '@current_mission_id';
const BUFFER_KEY = '@gps_points_buffer';

export async function setStoredMissionId(id: string) {
  await AsyncStorage.setItem(MISSION_KEY, id);
}

export async function getStoredMissionId() {
  return await AsyncStorage.getItem(MISSION_KEY);
}

export async function clearStoredMissionId() {
  await AsyncStorage.removeItem(MISSION_KEY);
}

// Pour stocker temporairement si hors ligne
export async function bufferPoint(point: any) {
  try {
    const existing = await AsyncStorage.getItem(BUFFER_KEY);
    const buffer = existing ? JSON.parse(existing) : [];
    buffer.push(point);
    await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(buffer));
  } catch (e) {
    console.error('Failed to buffer point', e);
  }
}

export async function flushBuffer() {
  try {
    const existing = await AsyncStorage.getItem(BUFFER_KEY);
    if (!existing) return;

    const buffer = JSON.parse(existing);
    if (buffer.length === 0) return;

    const { error } = await supabase.from('gps_points').insert(buffer);
    if (!error) {
      await AsyncStorage.removeItem(BUFFER_KEY); // Vidé avec succès
    }
  } catch (e) {
    console.error('Failed to flush buffer', e);
  }
}
