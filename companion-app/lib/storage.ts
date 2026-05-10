import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { MissionLocationInsert, MissionActionInsert } from '../types/mission';

const MISSION_KEY = '@cmm_current_mission_id';
const BUFFER_KEY = '@cmm_gps_buffer';
const ACTION_BUFFER_KEY = '@cmm_action_buffer';

// Mission ID persistant

export async function setStoredMissionId(id: string): Promise<void> {
  await AsyncStorage.setItem(MISSION_KEY, id);
}

export async function getStoredMissionId(): Promise<string | null> {
  return AsyncStorage.getItem(MISSION_KEY);
}

export async function clearStoredMissionId(): Promise<void> {
  await AsyncStorage.removeItem(MISSION_KEY);
}

// Buffer GPS

export async function bufferPoint(point: MissionLocationInsert): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(BUFFER_KEY);
    const buffer: MissionLocationInsert[] = existing ? JSON.parse(existing) : [];
    buffer.push(point);
    await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(buffer));
    console.log(`[Storage] Point bufferisé. Total buffer : ${buffer.length}`);
  } catch (e) {
    console.error('[Storage] bufferPoint error', e);
  }
}

// Buffer Actions

export async function bufferAction(action: MissionActionInsert): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(ACTION_BUFFER_KEY);
    const buffer: MissionActionInsert[] = existing ? JSON.parse(existing) : [];
    buffer.push(action);
    await AsyncStorage.setItem(ACTION_BUFFER_KEY, JSON.stringify(buffer));
    console.log(`[Storage] Action bufferisée. Total actions : ${buffer.length}`);
  } catch (e) {
    console.error('[Storage] bufferAction error', e);
  }
}

// Flush

export async function flushBuffer(): Promise<void> {
  // Flush GPS points
  try {
    const existing = await AsyncStorage.getItem(BUFFER_KEY);
    if (existing) {
      const buffer: MissionLocationInsert[] = JSON.parse(existing);
      if (buffer.length > 0) {
        console.log(`[Storage] Flush GPS : ${buffer.length} points`);
        const { error } = await supabase.from('gps_points').insert(buffer);
        if (!error) {
          await AsyncStorage.removeItem(BUFFER_KEY);
          console.log('[Storage] Buffer GPS vidé');
        }
      }
    }
  } catch (e) {
    console.error('[Storage] flush GPS error', e);
  }

  // Flush Actions
  try {
    const existing = await AsyncStorage.getItem(ACTION_BUFFER_KEY);
    if (existing) {
      const buffer: MissionActionInsert[] = JSON.parse(existing);
      if (buffer.length > 0) {
        console.log(`[Storage] Flush Actions : ${buffer.length} actions`);
        const { error } = await supabase.from('mission_actions').insert(buffer);
        if (!error) {
          await AsyncStorage.removeItem(ACTION_BUFFER_KEY);
          console.log('[Storage] Buffer Actions vidé');
        }
      }
    }
  } catch (e) {
    console.error('[Storage] flush actions error', e);
  }
}

export async function getBufferCount(): Promise<number> {
  try {
    const gps = await AsyncStorage.getItem(BUFFER_KEY);
    const acts = await AsyncStorage.getItem(ACTION_BUFFER_KEY);
    const gpsCount = gps ? JSON.parse(gps).length : 0;
    const actCount = acts ? JSON.parse(acts).length : 0;
    return gpsCount + actCount;
  } catch {
    return 0;
  }
}
