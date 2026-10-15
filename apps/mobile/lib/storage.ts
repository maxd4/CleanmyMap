import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getAuthenticatedSupabaseClient, getClerkUserId } from './supabase';
import { ensureGpsPointIdentity } from './gps-point-identity';
import { createLocalIdentifier } from './local-identifier';
import type {
  ForegroundTrackPoint,
  MissionLocationInsert,
  ServiceResult,
} from '../types/mission';
import type { EmergencyContact } from '../types/emergency-contact';

const MISSION_KEY_PREFIX = 'cmm_current_mission_id';
const ACTIVE_MISSION_OWNER_KEY = 'cmm_active_mission_owner';
const PENDING_LINKED_MISSION_RECONCILIATIONS_KEY_PREFIX = 'cmm_pending_linked_mission_reconciliations';
const MAX_PENDING_LINKED_MISSION_RECONCILIATIONS = 50;
const GPS_BUFFER_INDEX_KEY_PREFIX = '@cmm_gps_buffer_index';
const GPS_BUFFER_RECORD_PREFIX = 'cmm_gps_buffer';
const FOREGROUND_TRACK_KEY_PREFIX = '@cmm_foreground_track';
const EMERGENCY_CONTACT_KEY = 'cmm_emergency_contact';
const USE_SECURE_STORE = Platform.OS !== 'web';

function normalizeSecureStoreKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

function normalizeOwnerId(ownerId: string): string | null {
  const normalized = ownerId.trim();
  return /^[A-Za-z0-9_-]+$/.test(normalized) ? normalized : null;
}

function ownerScopedKey(prefix: string, ownerId: string): string | null {
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  return normalizedOwnerId ? normalizeSecureStoreKey(`${prefix}:${normalizedOwnerId}`) : null;
}

function makeBufferRecordKey(prefix: string): string {
  return normalizeSecureStoreKey(`${prefix}.${createLocalIdentifier()}`);
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
  await Promise.all(keys.map((key) => removeStoredValue(key)));
}

// Mission ID persistant

export async function setStoredMissionId(ownerId: string, id: string): Promise<void> {
  const missionKey = ownerScopedKey(MISSION_KEY_PREFIX, ownerId);
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  if (!missionKey || !normalizedOwnerId) throw new Error('Owner Clerk invalide pour la mission locale.');
  await writeStoredValue(missionKey, id);
  await writeStoredValue(ACTIVE_MISSION_OWNER_KEY, normalizedOwnerId);
}

export async function getStoredMissionId(ownerId: string): Promise<string | null> {
  const missionKey = ownerScopedKey(MISSION_KEY_PREFIX, ownerId);
  return missionKey ? readStoredValue(missionKey) : null;
}

export async function getStoredActiveMissionContext(): Promise<{ ownerId: string; missionId: string } | null> {
  const ownerId = await readStoredValue(ACTIVE_MISSION_OWNER_KEY);
  if (!ownerId || !normalizeOwnerId(ownerId)) return null;
  const missionId = await getStoredMissionId(ownerId);
  return missionId ? { ownerId, missionId } : null;
}

export async function getStoredMissionOwnerId(missionId: string): Promise<string | null> {
  const context = await getStoredActiveMissionContext();
  return context?.missionId === missionId ? context.ownerId : null;
}

export async function clearStoredMissionId(ownerId: string): Promise<void> {
  const missionKey = ownerScopedKey(MISSION_KEY_PREFIX, ownerId);
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  if (!missionKey || !normalizedOwnerId) return;
  await removeStoredValue(missionKey);
  const activeOwner = await readStoredValue(ACTIVE_MISSION_OWNER_KEY);
  if (activeOwner === normalizedOwnerId) await removeStoredValue(ACTIVE_MISSION_OWNER_KEY);
}

export async function getPendingLinkedMissionReconciliationIds(ownerId: string): Promise<string[]> {
  const key = ownerScopedKey(PENDING_LINKED_MISSION_RECONCILIATIONS_KEY_PREFIX, ownerId);
  if (!key) return [];
  const values = await readIndex(key);
  return [...new Set(values)].slice(0, MAX_PENDING_LINKED_MISSION_RECONCILIATIONS);
}

export async function enqueuePendingLinkedMissionReconciliation(ownerId: string, missionId: string): Promise<void> {
  const normalized = missionId.trim();
  if (!normalized) return;
  const key = ownerScopedKey(PENDING_LINKED_MISSION_RECONCILIATIONS_KEY_PREFIX, ownerId);
  if (!key) return;
  await withOwnerMutation(ownerId, async () => {
    const existing = await getPendingLinkedMissionReconciliationIds(ownerId);
    if (existing.includes(normalized)) return;
    await writeIndex(key, [...existing, normalized].slice(0, MAX_PENDING_LINKED_MISSION_RECONCILIATIONS));
  });
}

export async function removePendingLinkedMissionReconciliation(ownerId: string, missionId: string): Promise<void> {
  const key = ownerScopedKey(PENDING_LINKED_MISSION_RECONCILIATIONS_KEY_PREFIX, ownerId);
  if (!key) return;
  await withOwnerMutation(ownerId, async () => {
    const remaining = (await getPendingLinkedMissionReconciliationIds(ownerId)).filter((id) => id !== missionId);
    await writeIndex(key, remaining);
  });
}

// Tracé foreground UX uniquement. Il reste séparé du buffer GPS afin de ne
// jamais être rejoué vers Supabase comme un second flux de persistance.
function foregroundTrackKey(ownerId: string, missionId: string): string | null {
  const owner = normalizeOwnerId(ownerId);
  const normalizedMissionId = missionId.trim();
  return owner && normalizedMissionId ? normalizeSecureStoreKey(`${FOREGROUND_TRACK_KEY_PREFIX}:${owner}:${normalizedMissionId}`) : null;
}

function isForegroundTrackPoint(value: unknown): value is ForegroundTrackPoint {
  if (!value || typeof value !== 'object') return false;
  const point = value as Record<string, unknown>;
  return (
    typeof point.latitude === 'number' &&
    Number.isFinite(point.latitude) &&
    typeof point.longitude === 'number' &&
    Number.isFinite(point.longitude) &&
    typeof point.recordedAt === 'string' &&
    !Number.isNaN(Date.parse(point.recordedAt))
  );
}

export async function getStoredForegroundTrack(ownerId: string, missionId: string): Promise<ForegroundTrackPoint[]> {
  try {
    const key = foregroundTrackKey(ownerId, missionId);
    if (!key) return [];
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isForegroundTrackPoint) : [];
  } catch {
    return [];
  }
}

export async function saveStoredForegroundTrack(
  ownerId: string,
  missionId: string,
  points: ReadonlyArray<ForegroundTrackPoint>,
): Promise<void> {
  try {
    const key = foregroundTrackKey(ownerId, missionId);
    if (!key) return;
    await AsyncStorage.setItem(key, JSON.stringify(points));
  } catch (e) {
    console.warn('[Storage] Tracé foreground local indisponible :', e);
  }
}

export async function clearStoredForegroundTrack(ownerId: string, missionId: string): Promise<void> {
  try {
    const key = foregroundTrackKey(ownerId, missionId);
    if (key) await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn('[Storage] Nettoyage du tracé foreground local impossible :', e);
  }
}

export async function getStoredEmergencyContact(): Promise<EmergencyContact | null> {
  try {
    const raw = await readStoredValue(EMERGENCY_CONTACT_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const contact = parsed as Record<string, unknown>;
    if (
      typeof contact.name !== 'string' ||
      typeof contact.relation !== 'string' ||
      typeof contact.phone !== 'string'
    ) return null;

    return { name: contact.name, relation: contact.relation, phone: contact.phone };
  } catch {
    return null;
  }
}

export async function saveStoredEmergencyContact(contact: EmergencyContact): Promise<void> {
  await writeStoredValue(EMERGENCY_CONTACT_KEY, JSON.stringify(contact));
}

export async function clearStoredEmergencyContact(): Promise<void> {
  await removeStoredValue(EMERGENCY_CONTACT_KEY);
}

// Buffer GPS

export async function bufferPoint(ownerId: string, point: MissionLocationInsert): Promise<void> {
  try {
    const indexKey = ownerScopedKey(GPS_BUFFER_INDEX_KEY_PREFIX, ownerId);
    const recordPrefix = ownerScopedKey(GPS_BUFFER_RECORD_PREFIX, ownerId);
    if (!indexKey || !recordPrefix) return;
    const total = await withGpsBufferMutation(ownerId, () =>
      appendSecureBufferRecord(
        indexKey,
        recordPrefix,
        ensureGpsPointIdentity(point),
      ),
    );
    console.log(`[Storage] Point bufferisé. Total buffer : ${total}`);
  } catch (e) {
    console.error('[Storage] bufferPoint error', e);
  }
}

// Flush

const flushInFlight = new Map<string, Promise<ServiceResult>>();
const gpsBufferMutationsInFlight = new Map<string, Promise<void>>();
const ownerMutationsInFlight = new Map<string, Promise<void>>();

function withOwnerMutation<T>(ownerId: string, operation: () => Promise<T>): Promise<T> {
  const previous = ownerMutationsInFlight.get(ownerId) ?? Promise.resolve();
  const mutation = previous.then(operation, operation);
  const settled = mutation.then(() => undefined, () => undefined);
  ownerMutationsInFlight.set(ownerId, settled);
  void settled.then(() => {
    if (ownerMutationsInFlight.get(ownerId) === settled) ownerMutationsInFlight.delete(ownerId);
  });
  return mutation;
}

function withGpsBufferMutation<T>(ownerId: string, operation: () => Promise<T>): Promise<T> {
  const previous = gpsBufferMutationsInFlight.get(ownerId) ?? Promise.resolve();
  const mutation = previous.then(operation, operation);
  const settled = mutation.then(() => undefined, () => undefined);
  gpsBufferMutationsInFlight.set(ownerId, settled);
  void settled.then(() => {
    if (gpsBufferMutationsInFlight.get(ownerId) === settled) gpsBufferMutationsInFlight.delete(ownerId);
  });
  return mutation;
}

async function flushBufferOnce(ownerId: string): Promise<ServiceResult> {
  const indexKey = ownerScopedKey(GPS_BUFFER_INDEX_KEY_PREFIX, ownerId);
  if (!indexKey) return { ok: false, error: 'Connexion Clerk requise pour synchroniser les données.' };
  const currentUserId = await getClerkUserId();
  if (currentUserId !== ownerId) {
    return { ok: false, error: 'Identité Clerk obsolète : synchronisation interrompue.' };
  }
  const client = await getAuthenticatedSupabaseClient();
  if (!client) {
    // Sans session Clerk, les données restent persistées localement.
    return { ok: false, error: 'Connexion Clerk requise pour synchroniser les données.' };
  }
  if (await getClerkUserId() !== ownerId) {
    return { ok: false, error: 'Identité Clerk obsolète : synchronisation interrompue.' };
  }

  // Flush GPS points
  try {
    const { keys, records } = await withGpsBufferMutation(ownerId, () =>
      readSecureBufferRecords<MissionLocationInsert>(indexKey),
    );
    const buffer = records.map((record) => ensureGpsPointIdentity(record));
    const hasLegacyIdentity = buffer.some((record, index) => !records[index]?.client_point_id);
    if (hasLegacyIdentity) {
      await withGpsBufferMutation(ownerId, async () => {
        await Promise.all(buffer.map((record, index) => (
          records[index]?.client_point_id
            ? Promise.resolve()
            : writeStoredValue(keys[index], JSON.stringify(record))
        )));
      });
    }
    if (buffer.length > 0) {
      console.log(`[Storage] Flush GPS : ${buffer.length} points`);
      const { error } = await client.from('gps_points').upsert(buffer, {
        onConflict: 'mission_id,client_point_id',
        ignoreDuplicates: true,
      });
      if (error) {
        return { ok: false, error: `Synchronisation GPS impossible : ${error.message}` };
      }

      await withGpsBufferMutation(ownerId, async () => {
        const currentKeys = await readIndex(indexKey);
        const flushedKeys = new Set(keys);
        await clearSecureBufferRecords(keys);
        await writeIndex(
          indexKey,
          currentKeys.filter((key) => !flushedKeys.has(key)),
        );
      });
      console.log('[Storage] Buffer GPS vidé');
    }
  } catch (e) {
    console.error('[Storage] flush GPS error', e);
    return {
      ok: false,
      error: `Synchronisation GPS impossible : ${e instanceof Error ? e.message : 'erreur inconnue.'}`,
    };
  }

  return { ok: true, data: undefined };
}

export async function flushBuffer(ownerId: string): Promise<ServiceResult> {
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  if (!normalizedOwnerId) return { ok: false, error: 'Connexion Clerk requise pour synchroniser les données.' };
  const inFlight = flushInFlight.get(normalizedOwnerId);
  if (inFlight) return inFlight;

  const promise = flushBufferOnce(normalizedOwnerId).finally(() => {
    flushInFlight.delete(normalizedOwnerId);
  });
  flushInFlight.set(normalizedOwnerId, promise);
  return promise;
}

export async function getPendingGpsPointCount(ownerId: string): Promise<number> {
  try {
    const indexKey = ownerScopedKey(GPS_BUFFER_INDEX_KEY_PREFIX, ownerId);
    return indexKey ? (await readIndex(indexKey)).length : 0;
  } catch {
    return 0;
  }
}
