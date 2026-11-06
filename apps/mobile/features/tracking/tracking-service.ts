/**
 * TrackingService — couche métier du suivi GPS.
 */

import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  getAuthenticatedSupabaseClient,
  getClerkUserId,
  subscribeToClerkIdentityChanges,
} from '../../shared/lib/supabase';
import { createLinkedMission, reconcileLinkedMission } from './linked-mission-service';
import {
  getStoredMissionId,
  getStoredActiveMissionContext,
  getStoredMissionOwnerId,
  setStoredMissionId,
  clearStoredMissionId,
  getOrCreateMissionStartRequestId,
  clearMissionStartRequestId,
  enqueuePendingLinkedMissionReconciliation,
  removePendingLinkedMissionReconciliation,
  bufferPoint,
  flushBuffer,
} from '../../shared/lib/storage';
import { showGpsPermissionRationale } from './gps-permission-rationale';
import { createGpsPointId } from './gps-point-identity';
import type {
  Mission,
  MissionLocation,
  MissionLocationInsert,
  MissionFinalizationStage,
  ServiceResult,
} from './mission';

export const GPS_TASK_NAME = 'GPS_TRACKING';
export const EXPO_GO_TRACKING_WARNING =
  "Le GPS en arrière-plan ne fonctionne pas dans Expo Go. Utilise un development build (npx expo run:android ou npx expo run:ios).";
export const CLERK_SESSION_REQUIRED_ERROR =
  "Connexion Clerk requise pour accéder à cette mission.";
const TERMINAL_MISSION_RETRY_ERROR =
  'La mission précédente est déjà terminée. Une nouvelle tentative explicite est nécessaire.';
export const GPS_TRACKING_INTERRUPTED_ERROR =
  'Le suivi GPS est interrompu. Reprenez explicitement cette mission lorsque le suivi natif est disponible.';

type TrackingOperationToken = {
  ownerId: string;
  missionId: string;
  operationId: number;
  identityChanged: boolean;
  removeIdentityListener: (() => void) | null;
};

let nextTrackingOperationId = 0;
let nativeTrackingOperation: TrackingOperationToken | null = null;
let latestTrackingOperation: TrackingOperationToken | null = null;
let nativeStartQueue: Promise<void> = Promise.resolve();

export { createLinkedMission } from './linked-mission-service';

function backgroundLocationOptions() {
  return {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5 * 60 * 1000,
    distanceInterval: 50,
    deferredUpdatesInterval: 5 * 60 * 1000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'CleanMyMap — Mission en cours',
      notificationBody: 'Suivi GPS actif. Vous pouvez éteindre l’écran.',
      notificationColor: '#10b981',
    },
  };
}

function staleNativeTrackingError(): string {
  return `${CLERK_SESSION_REQUIRED_ERROR} Le suivi GPS appartient à une autre session.`;
}

async function restartBackgroundTracking(ownerId: string, missionId: string): Promise<ServiceResult> {
  const trackingWarning = getBackgroundTrackingWarning();
  if (trackingWarning) return { ok: false, error: trackingWarning };

  return withNativeStartLock(async () => {
    if (await getClerkUserId() !== ownerId) return { ok: false, error: staleNativeTrackingError() };
    const activeContext = await getStoredActiveMissionContext();
    if (activeContext?.ownerId !== ownerId || activeContext.missionId !== missionId) {
      return { ok: false, error: staleNativeTrackingError() };
    }
    if (nativeTrackingOperation && latestTrackingOperation?.operationId === nativeTrackingOperation.operationId &&
      (nativeTrackingOperation.ownerId !== ownerId || nativeTrackingOperation.missionId !== missionId)) {
      return { ok: false, error: staleNativeTrackingError() };
    }
    if (await getClerkUserId() !== ownerId) return { ok: false, error: staleNativeTrackingError() };

    const operation: TrackingOperationToken = {
      ownerId,
      missionId,
      operationId: ++nextTrackingOperationId,
      identityChanged: false,
      removeIdentityListener: null,
    };
    nativeTrackingOperation = operation;
    try {
      await Location.startLocationUpdatesAsync(GPS_TASK_NAME, backgroundLocationOptions());
      if (await getClerkUserId() !== ownerId) {
        await Location.stopLocationUpdatesAsync(GPS_TASK_NAME);
        nativeTrackingOperation = null;
        return { ok: false, error: staleNativeTrackingError() };
      }
      return { ok: true, data: undefined };
    } catch (error) {
      if (nativeTrackingOperation?.operationId === operation.operationId) nativeTrackingOperation = null;
      return {
        ok: false,
        error: `Impossible de reprendre le suivi GPS : ${error instanceof Error ? error.message : 'erreur inconnue.'}`,
      };
    }
  });
}

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

  try {
    const rationaleAccepted = await showGpsPermissionRationale();
    if (!rationaleAccepted) {
      return { ok: false, error: 'Information GPS requise avant de demander les permissions système.' };
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
  } catch (error) {
    return {
      ok: false,
      error: `Impossible de vérifier les permissions GPS : ${error instanceof Error ? error.message : 'erreur inconnue.'}`,
    };
  }
}

export async function requestTrackingPermissions(): Promise<ServiceResult> {
  return requestPermissions();
}

async function cancelMissionAfterStartFailure(missionId: string, ownerId: string): Promise<ServiceResult<Mission> | null> {
  if (await getClerkUserId() !== ownerId.trim()) return null;
  const client = await getAuthenticatedSupabaseClient();
  if (!client) return null;
  if (await getClerkUserId() !== ownerId.trim()) return null;

  const result = await executeMissionQuery(
    async () => client
      .from('missions')
      .update({
        status: 'cancelled',
        ended_at: new Date().toISOString(),
      })
      .eq('id', missionId)
      .select()
      .single<Mission>(),
    'Impossible d\'annuler la mission interrompue',
  );

  if (!result.ok) {
    console.warn('[TrackingService] Nettoyage de mission échoué :', result.error);
  }
  return result;
}

async function observeTrackingOwner(): Promise<string | null> {
  return getClerkUserId();
}

async function beginTrackingOperation(ownerId: string, missionId: string): Promise<TrackingOperationToken | null> {
  if ((await observeTrackingOwner()) !== ownerId) return null;
  if (latestTrackingOperation) latestTrackingOperation.identityChanged = true;
  nextTrackingOperationId += 1;
  const operation: TrackingOperationToken = {
    ownerId,
    missionId,
    operationId: nextTrackingOperationId,
    identityChanged: false,
    removeIdentityListener: null,
  };
  latestTrackingOperation = operation;

  try {
    if (typeof subscribeToClerkIdentityChanges === 'function') {
      operation.removeIdentityListener = subscribeToClerkIdentityChanges((nextOwnerId) => {
        if (nextOwnerId !== operation.ownerId) operation.identityChanged = true;
      });
    }
  } catch {
    // Headless/background runtimes may not expose a configured Clerk instance.
  }

  if ((await observeTrackingOwner()) !== ownerId) {
    operation.identityChanged = true;
    operation.removeIdentityListener?.();
    return null;
  }

  return operation;
}

async function isCurrentTrackingOperation(operation: TrackingOperationToken): Promise<boolean> {
  if (operation.identityChanged || latestTrackingOperation?.operationId !== operation.operationId) return false;
  const currentOwnerId = await observeTrackingOwner();
  if (currentOwnerId !== operation.ownerId) {
    operation.identityChanged = true;
    return false;
  }
  return true;
}

function finishTrackingOperation(operation: TrackingOperationToken): void {
  operation.removeIdentityListener?.();
  operation.removeIdentityListener = null;
  if (latestTrackingOperation?.operationId === operation.operationId) latestTrackingOperation = null;
}

async function stopStartedTracking(operation: TrackingOperationToken): Promise<void> {
  if (nativeTrackingOperation?.operationId !== operation.operationId) return;
  try {
    await Location.stopLocationUpdatesAsync(GPS_TASK_NAME);
  } catch (error) {
    console.warn(
      '[TrackingService] Arrêt du GPS après échec impossible :',
      error instanceof Error ? error.message : error,
    );
  } finally {
    if (nativeTrackingOperation?.operationId === operation.operationId) nativeTrackingOperation = null;
  }
}

async function withNativeStartLock<T>(work: () => Promise<T>): Promise<T> {
  const previous = nativeStartQueue;
  let release!: () => void;
  nativeStartQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await work();
  } finally {
    release();
  }
}

async function startOrReuseNativeTracking(
  operation: TrackingOperationToken,
  missionId: string,
  ownerId: string,
): Promise<ServiceResult<boolean>> {
  return withNativeStartLock(async () => {
    if (!await isCurrentTrackingOperation(operation)) {
      return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
    }

    let taskRegistered = false;
    try {
      taskRegistered = await TaskManager.isTaskRegisteredAsync(GPS_TASK_NAME);
    } catch (error) {
      return {
        ok: false,
        error: `Impossible de vérifier le suivi GPS natif : ${error instanceof Error ? error.message : 'erreur inconnue.'}`,
      };
    }

    if (!await isCurrentTrackingOperation(operation)) {
      return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
    }

    if (taskRegistered) {
      const activeContext = await getStoredActiveMissionContext();
      if (!await isCurrentTrackingOperation(operation)) {
        return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
      }
      if (activeContext?.ownerId !== ownerId || activeContext.missionId !== missionId) {
        return { ok: false, error: GPS_TRACKING_INTERRUPTED_ERROR };
      }
      if (!await isCurrentTrackingOperation(operation)) {
        return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
      }
      nativeTrackingOperation = operation;
      return { ok: true, data: false };
    }

    const trackingWarning = getBackgroundTrackingWarning();
    if (trackingWarning) return { ok: false, error: trackingWarning };
    if (!await isCurrentTrackingOperation(operation)) {
      return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
    }

    try {
      nativeTrackingOperation = operation;
      await Location.startLocationUpdatesAsync(GPS_TASK_NAME, backgroundLocationOptions());
      if (!await isCurrentTrackingOperation(operation)) {
        await stopStartedTracking(operation);
        return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
      }
      return { ok: true, data: true };
    } catch (error) {
      if (nativeTrackingOperation?.operationId === operation.operationId) nativeTrackingOperation = null;
      return {
        ok: false,
        error: `Impossible de démarrer le suivi GPS : ${error instanceof Error ? error.message : 'erreur inconnue.'}`,
      };
    }
  });
}

async function executeMissionQuery(
  operation: () => Promise<{ data: Mission | null; error: Error | null }>,
  errorPrefix: string,
): Promise<ServiceResult<Mission>> {
  let data: Mission | null = null;
  let error: Error | null = null;
  try {
    const result = await operation();
    data = result.data;
    error = result.error;
  } catch (requestError) {
    error = requestError instanceof Error ? requestError : new Error('Session Clerk indisponible.');
  }

  if (error || !data) {
    return {
      ok: false,
      error: `${errorPrefix} : ${error?.message ?? 'Réponse mission invalide.'}`,
    };
  }

  return { ok: true, data };
}

async function startTrackingWithOperation(
  operation: TrackingOperationToken,
  missionId: string,
  expectedOwnerId: string,
  knownMission?: Mission,
): Promise<ServiceResult<Mission>> {
    const client = await getAuthenticatedSupabaseClient();
    if (!client) {
      return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
    }
    if (!await isCurrentTrackingOperation(operation)) {
      return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
    }

  const missionResult = knownMission
    ? { ok: true as const, data: knownMission }
    : await executeMissionQuery(
      async () => client
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .single<Mission>(),
      'Impossible de retrouver la mission',
    );
  if (!missionResult.ok) return missionResult;

  const mission = missionResult.data;
  if (mission.volunteer_id && mission.volunteer_id !== expectedOwnerId) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }
  if (!await isCurrentTrackingOperation(operation)) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }
  if (mission.status === 'completed' || mission.status === 'cancelled') {
    return { ok: false, error: TERMINAL_MISSION_RETRY_ERROR };
  }
  if (mission.status !== 'pending' && mission.status !== 'tracking') {
    return { ok: false, error: 'Statut de mission incompatible avec le démarrage GPS.' };
  }

  const nativeStartResult = await startOrReuseNativeTracking(operation, missionId, expectedOwnerId);
  if (!nativeStartResult.ok) return nativeStartResult;
  if (!await isCurrentTrackingOperation(operation)) {
    await stopStartedTracking(operation);
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  let activeMission = mission;
  if (mission.status === 'pending') {
    const activationResult = await executeMissionQuery(
      async () => client
        .from('missions')
        .update({
          status: 'tracking',
          started_at: new Date().toISOString(),
        })
        .eq('id', missionId)
        .select()
        .single<Mission>(),
      'Impossible de démarrer la mission',
    );
    if (!activationResult.ok) {
      await stopStartedTracking(operation);
      return activationResult;
    }
    activeMission = activationResult.data;
  }
  if (!await isCurrentTrackingOperation(operation)) {
    await stopStartedTracking(operation);
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  try {
    await setStoredMissionId(expectedOwnerId, missionId, () => isCurrentTrackingOperation(operation));
  } catch (error) {
    await stopStartedTracking(operation);
    if (!await isCurrentTrackingOperation(operation)) {
      return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
    }
    return {
      ok: false,
      error: `Impossible de mémoriser la mission active : ${error instanceof Error ? error.message : 'erreur inconnue.'}`,
    };
  }
  if (!await isCurrentTrackingOperation(operation)) {
    await stopStartedTracking(operation);
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

    return { ok: true, data: activeMission };
}

export async function startTracking(
  missionId: string,
  ownerId: string,
  knownMission?: Mission,
): Promise<ServiceResult<Mission>> {
  const expectedOwnerId = ownerId.trim();
  const operation = await beginTrackingOperation(expectedOwnerId, missionId);
  if (!operation) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }
  try {
    return await startTrackingWithOperation(operation, missionId, expectedOwnerId, knownMission);
  } finally {
    finishTrackingOperation(operation);
  }
}

export async function ensureNativeTracking(
  missionId: string,
  ownerId: string,
  knownMission?: Mission,
): Promise<ServiceResult<Mission>> {
  const expectedOwnerId = ownerId.trim();
  const operation = expectedOwnerId ? await beginTrackingOperation(expectedOwnerId, missionId) : null;
  if (!operation) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  try {
    const missionResult = knownMission
      ? { ok: true as const, data: knownMission }
      : await executeMissionQuery(
        async () => (await getAuthenticatedSupabaseClient())
          ?.from('missions')
          .select('*')
          .eq('id', missionId)
          .single<Mission>() ?? { data: null, error: new Error(CLERK_SESSION_REQUIRED_ERROR) },
        'Impossible de retrouver la mission',
      );
    if (!missionResult.ok) return missionResult;

  const mission = missionResult.data;
  if (mission.id !== missionId || mission.volunteer_id !== expectedOwnerId) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }
  if (mission.status !== 'tracking') {
    return { ok: false, error: 'Statut de mission incompatible avec la reprise GPS.' };
  }
    if (!await isCurrentTrackingOperation(operation)) {
      return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
    }

  let taskRegistered = false;
  try {
    taskRegistered = await TaskManager.isTaskRegisteredAsync(GPS_TASK_NAME);
  } catch (error) {
    return {
      ok: false,
      error: `Impossible de vérifier le suivi GPS natif : ${error instanceof Error ? error.message : 'erreur inconnue.'}`,
    };
  }

  if (!await isCurrentTrackingOperation(operation)) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  if (taskRegistered) {
    const activeContext = await getStoredActiveMissionContext();
    if (!await isCurrentTrackingOperation(operation)) {
      return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
    }
    if (activeContext?.ownerId !== expectedOwnerId || activeContext.missionId !== missionId) {
      return { ok: false, error: GPS_TRACKING_INTERRUPTED_ERROR };
    }
    if (!await isCurrentTrackingOperation(operation)) {
      return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
    }
    nativeTrackingOperation = operation;
    return { ok: true, data: mission };
  }

    if (!await isCurrentTrackingOperation(operation)) {
      return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
    }
    return await startTrackingWithOperation(operation, missionId, expectedOwnerId, mission);
  } finally {
    finishTrackingOperation(operation);
  }
}

const mobileMissionStartInFlight = new Map<string, Promise<ServiceResult<Mission>>>();

async function startMobileMissionOnce(
  volunteerId: string,
  label = 'Action bénévole mobile',
  actionId?: string | null,
): Promise<ServiceResult<Mission>> {
  const permissionResult = await requestTrackingPermissions();
  if (!permissionResult.ok) return permissionResult;

  const normalizedActionId = actionId?.trim() || null;
  const requestScope = normalizedActionId ? `action:${normalizedActionId}` : null;
  const requestId = requestScope
    ? await getOrCreateMissionStartRequestId(volunteerId, requestScope)
    : null;
  if (requestScope && !requestId) {
    return { ok: false, error: 'Une création de mission est déjà en attente pour ce compte.' };
  }

  const missionResult = await createMission(volunteerId, label, normalizedActionId, requestId ?? undefined);
  if (!missionResult.ok) return missionResult;

  if (missionResult.data.status === 'completed' || missionResult.data.status === 'cancelled') {
    if (requestId) await clearMissionStartRequestId(volunteerId, requestId);
    return { ok: false, error: TERMINAL_MISSION_RETRY_ERROR };
  }

  const trackingResult = await startTracking(missionResult.data.id, volunteerId, missionResult.data);
  if (trackingResult.ok) {
    if (requestId) await clearMissionStartRequestId(volunteerId, requestId);
    return trackingResult;
  }

  if (missionResult.data.status !== 'pending') return trackingResult;
  const cancellation = await cancelMissionAfterStartFailure(missionResult.data.id, volunteerId);
  if (requestId && cancellation?.ok) await clearMissionStartRequestId(volunteerId, requestId);
  return trackingResult;
}

export function startMobileMission(
  volunteerId: string,
  label = 'Action bénévole mobile',
  actionId?: string | null,
): Promise<ServiceResult<Mission>> {
  const scope = `${volunteerId.trim()}:${actionId?.trim() || 'unlinked'}`;
  const existing = mobileMissionStartInFlight.get(scope);
  if (existing) return existing;
  const promise = startMobileMissionOnce(volunteerId, label, actionId).finally(() => {
    if (mobileMissionStartInFlight.get(scope) === promise) mobileMissionStartInFlight.delete(scope);
  });
  mobileMissionStartInFlight.set(scope, promise);
  return promise;
}

export async function createMission(
  volunteerId: string,
  label = 'Action bénévole mobile',
  actionId?: string | null,
  idempotencyKey?: string,
): Promise<ServiceResult<Mission>> {
  const normalizedVolunteerId = volunteerId.trim();
  const normalizedLabel = label.trim();

  if (!normalizedVolunteerId) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }
  if (await getClerkUserId() !== normalizedVolunteerId) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  if (!normalizedLabel) {
    return { ok: false, error: 'Libellé de mission requis.' };
  }

  if (actionId?.trim()) {
    return createLinkedMission(normalizedLabel, actionId.trim(), idempotencyKey, normalizedVolunteerId);
  }

  const client = await getAuthenticatedSupabaseClient();
  if (!client) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }
  if (await getClerkUserId() !== normalizedVolunteerId) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  return executeMissionQuery(
    async () => client
      .from('missions')
      .insert({ volunteer_id: normalizedVolunteerId, label: normalizedLabel })
      .select()
      .single<Mission>(),
    'Impossible de créer la mission',
  );
}

export async function stopTracking(
  missionId: string,
  onStageChange?: (stage: MissionFinalizationStage) => void,
  ownerId?: string,
): Promise<ServiceResult<Mission>> {
  const resolvedOwnerId = ownerId?.trim() || await getStoredMissionOwnerId(missionId);
  if (!resolvedOwnerId) {
    return { ok: false, error: `${CLERK_SESSION_REQUIRED_ERROR} Aucun propriétaire local vérifiable.` };
  }
  if (await getClerkUserId() !== resolvedOwnerId) {
    return { ok: false, error: `${CLERK_SESSION_REQUIRED_ERROR} Identité Clerk obsolète.` };
  }

  const stopError = await stopRegisteredTracking(resolvedOwnerId, missionId);
  if (stopError) return resumeAfterFailure(stopError, resolvedOwnerId, missionId);

  const client = await getAuthenticatedSupabaseClient();
  if (!client) {
    return resumeAfterFailure(CLERK_SESSION_REQUIRED_ERROR, resolvedOwnerId, missionId);
  }

  onStageChange?.('synchronizing');
  const flushResult = await flushBuffer(resolvedOwnerId);
  if (flushResult && !flushResult.ok) {
    return resumeAfterFailure(flushResult.error, resolvedOwnerId, missionId);
  }
  if (await getClerkUserId() !== resolvedOwnerId) {
    return resumeAfterFailure(`${CLERK_SESSION_REQUIRED_ERROR} Identité Clerk obsolète.`, resolvedOwnerId, missionId);
  }

  onStageChange?.('finalizing');
  const missionResult = await executeMissionQuery(
    async () => client
      .from('missions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
      })
      .eq('id', missionId)
      .select()
      .single<Mission>(),
    'Erreur lors de la finalisation',
  );
  if (!missionResult.ok) {
    return resumeAfterFailure(missionResult.error, resolvedOwnerId, missionId);
  }

  await clearStoredMissionId(resolvedOwnerId);
  await reconcileCompletedMission(missionResult.data, resolvedOwnerId);

  return missionResult;
}

async function stopRegisteredTracking(ownerId: string, missionId: string): Promise<string | null> {
  return withNativeStartLock(async () => {
    if (await getClerkUserId() !== ownerId) return staleNativeTrackingError();
    try {
      const taskRegistered = await TaskManager.isTaskRegisteredAsync(GPS_TASK_NAME);
      if (!taskRegistered) return null;
      if (await getClerkUserId() !== ownerId) return staleNativeTrackingError();
      const activeContext = await getStoredActiveMissionContext();
      if (activeContext?.ownerId !== ownerId || activeContext.missionId !== missionId) {
        return staleNativeTrackingError();
      }
      if (nativeTrackingOperation && latestTrackingOperation?.operationId === nativeTrackingOperation.operationId &&
        (nativeTrackingOperation.ownerId !== ownerId || nativeTrackingOperation.missionId !== missionId)) {
        return staleNativeTrackingError();
      }
      if (await getClerkUserId() !== ownerId) return staleNativeTrackingError();
      await Location.stopLocationUpdatesAsync(GPS_TASK_NAME);
      if (nativeTrackingOperation?.ownerId === ownerId && nativeTrackingOperation.missionId === missionId) {
        nativeTrackingOperation = null;
      }
      return null;
    } catch (error) {
      return `Impossible de suspendre le suivi GPS : ${error instanceof Error ? error.message : 'erreur inconnue.'}`;
    }
  });
}

async function resumeAfterFailure(message: string, ownerId: string, missionId: string): Promise<ServiceResult<never>> {
  const resumeResult = await restartBackgroundTracking(ownerId, missionId);
  const resumeSuffix = resumeResult.ok ? '' : ` ${resumeResult.error}`;
  const normalizedMessage = /[.!?]$/.test(message) ? message : `${message}.`;
  return { ok: false, error: `${normalizedMessage}${resumeSuffix}` };
}

async function reconcileCompletedMission(mission: Mission, ownerId: string): Promise<void> {
  if (!mission.action_id) return;
  await enqueuePendingLinkedMissionReconciliation(ownerId, mission.id);
  const handoff = await reconcileLinkedMission(mission.id, ownerId);
  if (handoff.ok || handoff.terminal) {
    await removePendingLinkedMissionReconciliation(ownerId, mission.id);
  } else {
    console.warn('[GPS] Mission finalisée; réconciliation gamification différée.', handoff.error);
  }
}

export async function saveLocationPoint(
  missionId: string,
  location: { latitude: number; longitude: number; accuracy?: number | null; altitude?: number | null },
  recordedAt?: Date,
  ownerId?: string,
): Promise<ServiceResult> {
  const point: MissionLocationInsert = {
    client_point_id: createGpsPointId(),
    mission_id: missionId,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy_m: location.accuracy ?? null,
    altitude_m: location.altitude ?? null,
    recorded_at: (recordedAt ?? new Date()).toISOString(),
  };

  const resolvedOwnerId = ownerId?.trim() || await getStoredMissionOwnerId(missionId);
  if (!resolvedOwnerId) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }
  const currentUserId = await getClerkUserId();
  if (currentUserId && currentUserId !== resolvedOwnerId) {
    return { ok: false, error: `${CLERK_SESSION_REQUIRED_ERROR} Identité Clerk obsolète.` };
  }
  const client = await getAuthenticatedSupabaseClient();
  if (!client) {
    await bufferPoint(resolvedOwnerId, point);
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }
  const verifiedUserId = await getClerkUserId();
  if (verifiedUserId !== resolvedOwnerId) {
    if (!verifiedUserId) {
      await bufferPoint(resolvedOwnerId, point);
      return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
    }
    return { ok: false, error: `${CLERK_SESSION_REQUIRED_ERROR} Identité Clerk obsolète.` };
  }

  let error: Error | null = null;
  try {
    error = (await client.from('gps_points').upsert(point, {
      onConflict: 'mission_id,client_point_id',
      ignoreDuplicates: true,
    })).error;
  } catch (requestError) {
    error = requestError instanceof Error ? requestError : new Error('Session Clerk indisponible.');
  }

  if (error) {
    console.warn('[TrackingService] Insert échoué, mise en buffer :', error.message);
    await bufferPoint(resolvedOwnerId, point);
    return { ok: false, error: error.message };
  }

  return { ok: true, data: undefined };
}

export async function getMission(missionId: string): Promise<ServiceResult<Mission>> {
  const client = await getAuthenticatedSupabaseClient();
  if (!client) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  return executeMissionQuery(
    async () => client
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single<Mission>(),
    'Mission introuvable',
  );
}

export async function getMissionTrack(missionId: string): Promise<ServiceResult<MissionLocation[]>> {
  const client = await getAuthenticatedSupabaseClient();
  if (!client) {
    return { ok: false, error: CLERK_SESSION_REQUIRED_ERROR };
  }

  try {
    const result = await client
      .from('gps_points')
      .select('id, client_point_id, mission_id, latitude, longitude, accuracy_m, altitude_m, recorded_at')
      .eq('mission_id', missionId)
      .order('recorded_at', { ascending: true });

    if (result.error) {
      return { ok: false, error: `Impossible de restaurer le tracé : ${result.error.message}` };
    }

    const points = (result.data ?? []) as MissionLocation[];
    points.sort((first, second) => Date.parse(first.recorded_at) - Date.parse(second.recorded_at));
    return { ok: true, data: points };
  } catch (error) {
    return {
      ok: false,
      error: `Impossible de restaurer le tracé : ${error instanceof Error ? error.message : 'erreur inconnue.'}`,
    };
  }
}

export async function restoreActiveTracking(ownerId: string): Promise<string | null> {
  return await getStoredMissionId(ownerId);
}
