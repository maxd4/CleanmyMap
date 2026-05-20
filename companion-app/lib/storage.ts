import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { MissionLocationInsert, MissionActionInsert } from '../types/mission';

const MISSION_KEY = 'cmm_current_mission_id';
const GPS_BUFFER_INDEX_KEY = '@cmm_gps_buffer_index';
const ACTION_BUFFER_INDEX_KEY = '@cmm_action_buffer_index';
const GPS_BUFFER_RECORD_PREFIX = 'cmm_gps_buffer';
const ACTION_BUFFER_RECORD_PREFIX = 'cmm_action_buffer';
const USE_SECURE_STORE = Platform.OS !== 'web';

function normalizeSecureStoreKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

function makeBufferRecordKey(prefix: string): string {
  return normalizeSecureStoreKey(`${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}`);
}

async function readStoredValue(key: string): Promise<string | null> {
  if (USE_SECURE_STORE) {
    return SecureStore.getItemAsync(key);
  }

  return AsyncStorage.getItem(key);
}

async function writeStoredValue(key: string, value: string): Promise<void> {
  if (USE_SECURE_STORE) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  await AsyncStorage.setItem(key, value);
}

async function removeStoredValue(key: string): Promise<void> {
  if (USE_SECURE_STORE) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  await AsyncStorage.removeItem(key);
}

async function readIndex(indexKey: string): Promise<string[]> {
  const existing = await readStoredValue(indexKey);
  if (!existing) {
    return [];
  }

  try {
    const parsed = JSON.parse(existing) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function writeIndex(indexKey: string, keys: string[]): Promise<void> {
  if (keys.length === 0) {
    await removeStoredValue(indexKey);
    return;
  }

  await writeStoredValue(indexKey, JSON.stringify(keys));
}

async function appendSecureBufferRecord<T>(
  indexKey: string,
  prefix: string,
  value: T,
): Promise<number> {
  const recordKey = makeBufferRecordKey(prefix);
  await writeStoredValue(recordKey, JSON.stringify(value));
  const keys = await readIndex(indexKey);
  keys.push(recordKey);
  await writeIndex(indexKey, keys);
  return keys.length;
}

async function readSecureBufferRecords<T>(indexKey: string): Promise<{ keys: string[]; records: T[] }> {
  const keys = await readIndex(indexKey);
  if (keys.length === 0) {
    return { keys: [], records: [] };
  }

  const records: T[] = [];
  const keptKeys: string[] = [];

  for (const key of keys) {
    const raw = await readStoredValue(key);
    if (!raw) {
      continue;
    }

    try {
      records.push(JSON.parse(raw) as T);
      keptKeys.push(key);
    } catch {
      await removeStoredValue(key);
    }
  }

  if (keptKeys.length !== keys.length) {
    await writeIndex(indexKey, keptKeys);
  }

  return { keys: keptKeys, records };
}

async function clearSecureBufferRecords(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => removeStoredValue(key).catch(() => undefined)));
}

// Mission ID persistant

export async function setStoredMissionId(id: string): Promise<void> {
  await writeStoredValue(MISSION_KEY, id);
}

export async function getStoredMissionId(): Promise<string | null> {
  return readStoredValue(MISSION_KEY);
}

export async function clearStoredMissionId(): Promise<void> {
  await removeStoredValue(MISSION_KEY);
}

// Buffer GPS

export async function bufferPoint(point: MissionLocationInsert): Promise<void> {
  try {
    const total = await appendSecureBufferRecord(
      GPS_BUFFER_INDEX_KEY,
      GPS_BUFFER_RECORD_PREFIX,
      point,
    );
    console.log(`[Storage] Point bufferisé. Total buffer : ${total}`);
  } catch (e) {
    console.error('[Storage] bufferPoint error', e);
  }
}

// Buffer Actions

export async function bufferAction(action: MissionActionInsert): Promise<void> {
  try {
    const total = await appendSecureBufferRecord(
      ACTION_BUFFER_INDEX_KEY,
      ACTION_BUFFER_RECORD_PREFIX,
      action,
    );
    console.log(`[Storage] Action bufferisée. Total actions : ${total}`);
  } catch (e) {
    console.error('[Storage] bufferAction error', e);
  }
}

// Flush

export async function flushBuffer(): Promise<void> {
  // Flush GPS points
  try {
    const { keys, records: buffer } = await readSecureBufferRecords<MissionLocationInsert>(
      GPS_BUFFER_INDEX_KEY,
    );
    if (buffer.length > 0) {
      console.log(`[Storage] Flush GPS : ${buffer.length} points`);
      const { error } = await supabase.from('gps_points').insert(buffer);
      if (!error) {
        await clearSecureBufferRecords(keys);
        await writeIndex(GPS_BUFFER_INDEX_KEY, []);
        console.log('[Storage] Buffer GPS vidé');
      }
    }
  } catch (e) {
    console.error('[Storage] flush GPS error', e);
  }

  // Flush Actions
  try {
    const { keys, records: buffer } = await readSecureBufferRecords<MissionActionInsert>(
      ACTION_BUFFER_INDEX_KEY,
    );
    if (buffer.length > 0) {
      console.log(`[Storage] Flush Actions : ${buffer.length} actions`);
      const { error } = await supabase.from('mission_actions').insert(buffer);
      if (!error) {
        await clearSecureBufferRecords(keys);
        await writeIndex(ACTION_BUFFER_INDEX_KEY, []);
        console.log('[Storage] Buffer Actions vidé');
      }
    }
  } catch (e) {
    console.error('[Storage] flush actions error', e);
  }
}

export async function getBufferCount(): Promise<number> {
  try {
    const [gps, acts] = await Promise.all([
      readIndex(GPS_BUFFER_INDEX_KEY),
      readIndex(ACTION_BUFFER_INDEX_KEY),
    ]);
    const gpsCount = gps.length;
    const actCount = acts.length;
    return gpsCount + actCount;
  } catch {
    return 0;
  }
}
