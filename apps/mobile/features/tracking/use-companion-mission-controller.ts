import { useAuth, useClerk } from '@clerk/expo'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert, AppState } from 'react-native'
import {
  getMission,
  ensureNativeTracking,
  restoreActiveTracking,
  startMobileMission,
  stopTracking,
} from './tracking-service'
import { clearStoredForegroundTrack, flushBuffer, getPendingGpsPointCount } from '../../shared/lib/storage'
import { reconcilePendingLinkedMissions } from './linked-mission-service'
import { usePendingGpsPointCountPolling } from './pending-gps-point-polling'
import type { Mission, MissionFinalizationStage, TrackingPhase } from './mission'

type OwnedState<T> = { ownerId: string | null; value: T }

function owned<T>(ownerId: string | null, value: T): OwnedState<T> {
  return { ownerId, value }
}

function formatDuration(startedAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
  return `${remainingSeconds}s`
}

function useRestoreActiveMission({
  isLoaded,
  isSignedIn,
  setMission,
  setPhase,
  startDurationTimer,
  stopDurationTimer,
  refreshPendingGpsPointCount,
  setErrorMsg,
  restoreAttempt,
  userId,
  beginOperation,
  isCurrentOperation,
}: {
  isLoaded: boolean
  isSignedIn: boolean
  setMission: React.Dispatch<React.SetStateAction<OwnedState<Mission> | null>>
  setPhase: React.Dispatch<React.SetStateAction<OwnedState<TrackingPhase> | null>>
  startDurationTimer: (ownerId: string, startedAt: string) => void
  stopDurationTimer: () => void
  refreshPendingGpsPointCount: () => Promise<void>
  setErrorMsg: React.Dispatch<React.SetStateAction<OwnedState<string> | null>>
  restoreAttempt: number
  userId: string | null
  beginOperation: (ownerId: string) => number
  isCurrentOperation: (ownerId: string, operationId: number) => boolean
}) {
  const restoreGenerationRef = useRef(0)

  useEffect(() => {
    restoreGenerationRef.current += 1
    stopDurationTimer()
    setMission(null)
    setPhase(null)
    setErrorMsg(null)
    if (!isLoaded || !isSignedIn) return

    let cancelled = false
    const isCurrentRestore = (restoreGeneration: number, operationId: number) =>
      !cancelled && restoreGenerationRef.current === restoreGeneration &&
      userId !== null && isCurrentOperation(userId, operationId)
    const setRestoreFailure = (restoreGeneration: number, operationId: number, message: string) => {
      if (!isCurrentRestore(restoreGeneration, operationId) || !userId) return
      stopDurationTimer()
      setMission(null)
      setErrorMsg(owned(userId, message))
      setPhase(owned(userId, 'error'))
    }
    const handleRestoreError = (restoreGeneration: number, operationId: number, error: unknown) => {
      setRestoreFailure(
        restoreGeneration,
        operationId,
        `Impossible de restaurer le suivi GPS : ${error instanceof Error ? error.message : 'erreur inconnue.'}`,
      )
    }
    async function restoreMission(restoreGeneration: number, operationId: number) {
      if (!userId) return
      void reconcilePendingLinkedMissions(userId).catch(() => undefined)
      const flushPromise = flushBuffer(userId).catch(() => null)
      const id = await restoreActiveTracking(userId)
      if (!id || !isCurrentRestore(restoreGeneration, operationId)) return

      const result = await getMission(id)
      if (!isCurrentRestore(restoreGeneration, operationId)) return
      if (!result.ok) {
        setRestoreFailure(restoreGeneration, operationId, result.error)
        return
      }
      if (result.data.status !== 'tracking') return

      const nativeResult = await ensureNativeTracking(id, userId, result.data)
      if (!isCurrentRestore(restoreGeneration, operationId)) return
      if (!nativeResult.ok) {
        setRestoreFailure(restoreGeneration, operationId, nativeResult.error)
        return
      }

      setMission(owned(userId, nativeResult.data))
      setPhase(owned(userId, 'tracking'))
      startDurationTimer(userId, nativeResult.data.started_at ?? new Date().toISOString())
      await flushPromise
      if (isCurrentRestore(restoreGeneration, operationId)) await refreshPendingGpsPointCount()
    }

    const launchRestore = () => {
      const restoreGeneration = ++restoreGenerationRef.current
      const operationId = userId ? beginOperation(userId) : 0
      void restoreMission(restoreGeneration, operationId).catch((error) => handleRestoreError(restoreGeneration, operationId, error))
    }

    launchRestore()
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') launchRestore()
    })

    return () => {
      cancelled = true
      appStateSubscription.remove()
      stopDurationTimer()
    }
  }, [beginOperation, isCurrentOperation, isLoaded, isSignedIn, refreshPendingGpsPointCount, restoreAttempt, setErrorMsg, setMission, setPhase, startDurationTimer, stopDurationTimer, userId])
}

export function useCompanionMissionController() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { signOut } = useClerk()
  const currentOwnerId = userId ?? null
  const identityRef = useRef<string | null>(currentOwnerId)
  const identityVersionRef = useRef(1)
  const [identityVersion, setIdentityVersion] = useState(1)
  const operationRef = useRef(1)
  const callbackIdentityVersion = identityVersion
  useLayoutEffect(() => {
    if (identityRef.current !== currentOwnerId) {
      identityRef.current = currentOwnerId
      identityVersionRef.current += 1
      operationRef.current += 1
      setIdentityVersion(identityVersionRef.current)
    }
  }, [currentOwnerId])

  const [phaseState, setPhase] = useState<OwnedState<TrackingPhase> | null>(null)
  const [missionState, setMission] = useState<OwnedState<Mission> | null>(null)
  const [errorState, setErrorMsg] = useState<OwnedState<string> | null>(null)
  const [durationState, setDuration] = useState<OwnedState<string> | null>(null)
  const [pendingGpsPointCountState, setPendingGpsPointCount] = useState<OwnedState<number> | null>(null)
  const [finalizationStageState, setFinalizationStage] = useState<OwnedState<MissionFinalizationStage> | null>(null)
  const [completionSummaryState, setCompletionSummary] = useState<OwnedState<Mission> | null>(null)
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const beginOperation = useCallback((ownerId: string) => {
    if (identityRef.current !== ownerId) return -1
    return ++operationRef.current
  }, [])
  const isCurrentOperation = useCallback((ownerId: string, operationId: number) =>
    identityRef.current === ownerId && operationRef.current === operationId, [])
  const isCurrentIdentity = useCallback((ownerId: string, identityVersion: number) =>
    identityRef.current === ownerId && identityVersionRef.current === identityVersion, [])

  const mission = missionState?.ownerId === currentOwnerId ? missionState.value : null
  const phase = phaseState?.ownerId === currentOwnerId ? phaseState.value : 'idle'
  const errorMsg = errorState?.ownerId === currentOwnerId ? errorState.value : null
  const duration = durationState?.ownerId === currentOwnerId ? durationState.value : ''
  const pendingGpsPointCount = pendingGpsPointCountState?.ownerId === currentOwnerId ? pendingGpsPointCountState.value : 0
  const finalizationStage = finalizationStageState?.ownerId === currentOwnerId ? finalizationStageState.value : null
  const completionSummary = completionSummaryState?.ownerId === currentOwnerId ? completionSummaryState.value : null

  const readPendingGpsPointCount = useCallback(
    () => userId ? getPendingGpsPointCount(userId) : Promise.resolve(0),
    [userId],
  )

  const stopDurationTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  const startDurationTimer = useCallback((ownerId: string, startedAt: string) => {
    stopDurationTimer()
    setDuration(owned(ownerId, formatDuration(startedAt)))
    timerRef.current = setInterval(() => {
      if (identityRef.current === ownerId) setDuration(owned(ownerId, formatDuration(startedAt)))
    }, 1000)
  }, [stopDurationTimer])

  const refreshPendingGpsPointCount = usePendingGpsPointCountPolling({
    isVisible: phase === 'tracking' && mission !== null,
    readCount: readPendingGpsPointCount,
    getOwnerId: () => identityRef.current,
    onCount: (count, ownerId) => {
      if (ownerId && identityRef.current === ownerId) setPendingGpsPointCount(owned(ownerId, count))
    },
  })

  useRestoreActiveMission({
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    setMission,
    setPhase,
    startDurationTimer,
    stopDurationTimer,
    refreshPendingGpsPointCount,
    setErrorMsg,
    restoreAttempt,
    userId: userId ?? null,
    beginOperation,
    isCurrentOperation,
  })

  useEffect(() => {
    setCompletionSummary(null)
    setFinalizationStage(null)
    setPhase(null)
    setMission(null)
    setErrorMsg(null)
    setDuration(null)
    setPendingGpsPointCount(null)
  }, [isLoaded, isSignedIn, userId])

  const handleStartMobileMission = useCallback(async (actionId?: string, label = 'Action bénévole mobile') => {
    const ownerId = userId

    if (!ownerId) {
      const error = 'Connexion Clerk requise pour démarrer une mission.'
      setErrorMsg(owned(null, error))
      Alert.alert('Connexion requise', error)
      return
    }

    if (!isCurrentIdentity(ownerId, callbackIdentityVersion)) return
    const operationId = beginOperation(ownerId)
    if (operationId < 0) return
    setErrorMsg(null)
    setCompletionSummary(null)

    setPhase(owned(ownerId, 'requesting'))
    const trackingResult = await startMobileMission(ownerId, label, actionId)
    if (!isCurrentOperation(ownerId, operationId)) return
    if (!trackingResult.ok) {
      setErrorMsg(owned(ownerId, trackingResult.error))
      setPhase(null)
      Alert.alert('Suivi GPS impossible', trackingResult.error)
      return
    }

    setMission(owned(ownerId, trackingResult.data))
    setPhase(owned(ownerId, 'tracking'))
    startDurationTimer(ownerId, trackingResult.data.started_at ?? new Date().toISOString())
  }, [beginOperation, callbackIdentityVersion, isCurrentIdentity, isCurrentOperation, startDurationTimer, userId])

  const handleSessionExpired = useCallback(async () => {
    const ownerId = userId ?? null
    if (ownerId && !isCurrentIdentity(ownerId, callbackIdentityVersion)) return
    operationRef.current += 1
    setErrorMsg(owned(ownerId, 'Votre session Clerk a expiré. Connectez-vous à nouveau pour continuer.'))
    await signOut().catch(() => null)
  }, [callbackIdentityVersion, isCurrentIdentity, signOut, userId])

  const handleRetryMission = useCallback(() => {
    if (!userId) return
    if (!isCurrentIdentity(userId, callbackIdentityVersion)) return
    const operationId = beginOperation(userId)
    if (operationId < 0) return
    setErrorMsg(null)
    setPhase(owned(userId, 'requesting'))
    setRestoreAttempt((attempt) => attempt + 1)
  }, [beginOperation, callbackIdentityVersion, isCurrentIdentity, userId])

  const finalizeMission = useCallback(async (activeMission: Mission) => {
    const ownerId = userId
    if (!ownerId) return
    if (!isCurrentIdentity(ownerId, callbackIdentityVersion)) return
    const operationId = beginOperation(ownerId)
    if (operationId < 0) return
    setErrorMsg(null)
    setFinalizationStage(owned(ownerId, 'synchronizing'))
    setPhase(owned(ownerId, 'stopping'))
    stopDurationTimer()

    const result = await stopTracking(activeMission.id, (stage) => {
      if (isCurrentOperation(ownerId, operationId)) setFinalizationStage(owned(ownerId, stage))
    }, ownerId)
    if (!isCurrentOperation(ownerId, operationId)) return
    await refreshPendingGpsPointCount()
    if (!isCurrentOperation(ownerId, operationId)) return
    if (!result.ok) {
      setErrorMsg(owned(ownerId, result.error))
      setFinalizationStage(null)
      setPhase(owned(ownerId, 'tracking'))
      Alert.alert('Mission conservée', result.error)
      return
    }

    await clearStoredForegroundTrack(ownerId, activeMission.id)
    if (!isCurrentOperation(ownerId, operationId)) return
    setMission(null)
    setCompletionSummary(owned(ownerId, result.data))
    setFinalizationStage(null)
    setPhase(null)
  }, [beginOperation, callbackIdentityVersion, isCurrentIdentity, isCurrentOperation, refreshPendingGpsPointCount, stopDurationTimer, userId])

  const handleStop = useCallback(() => {
    if (!mission) return
    if (!userId || !isCurrentIdentity(userId, callbackIdentityVersion)) return
    Alert.alert(
      'Terminer la mission ?',
      'Les points GPS seront synchronisés avant la finalisation serveur.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Terminer', style: 'destructive', onPress: () => void finalizeMission(mission).catch(() => undefined) },
      ],
    )
  }, [callbackIdentityVersion, finalizeMission, isCurrentIdentity, mission, userId])

  const handleReturnHome = useCallback(() => {
    if (!userId || !isCurrentIdentity(userId, callbackIdentityVersion)) return
    operationRef.current += 1
    setCompletionSummary(null)
    setErrorMsg(null)
    setMission(null)
    setPhase(null)
  }, [callbackIdentityVersion, isCurrentIdentity, userId])

  return {
    isLoaded,
    isSignedIn,
    userId,
    phase,
    mission,
    errorMsg,
    duration,
    pendingGpsPointCount,
    finalizationStage,
    completionSummary,
    handleStartMobileMission,
    handleSessionExpired,
    handleStop,
    handleReturnHome,
    handleRetryMission,
    signOut,
  }
}
