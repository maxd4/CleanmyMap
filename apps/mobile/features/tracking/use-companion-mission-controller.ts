import { useAuth, useClerk } from '@clerk/expo'
import { useCallback, useEffect, useRef, useState } from 'react'
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
}: {
  isLoaded: boolean
  isSignedIn: boolean
  setMission: React.Dispatch<React.SetStateAction<Mission | null>>
  setPhase: React.Dispatch<React.SetStateAction<TrackingPhase>>
  startDurationTimer: (startedAt: string) => void
  stopDurationTimer: () => void
  refreshPendingGpsPointCount: () => Promise<void>
  setErrorMsg: React.Dispatch<React.SetStateAction<string | null>>
  restoreAttempt: number
  userId: string | null
}) {
  const restoreGenerationRef = useRef(0)

  useEffect(() => {
    const restoreGeneration = ++restoreGenerationRef.current
    stopDurationTimer()
    setMission(null)
    setPhase('idle')
    setErrorMsg(null)
    if (!isLoaded || !isSignedIn) return

    let cancelled = false
    const isCurrentRestore = () => !cancelled && restoreGenerationRef.current === restoreGeneration
    const handleRestoreError = (error: unknown) => {
      if (!isCurrentRestore()) return
      setErrorMsg(`Impossible de restaurer le suivi GPS : ${error instanceof Error ? error.message : 'erreur inconnue.'}`)
      setPhase('error')
    }
    async function restoreMission() {
      if (!userId) return
      void reconcilePendingLinkedMissions(userId).catch(() => undefined)
      const flushPromise = flushBuffer(userId).catch(() => null)
      const id = await restoreActiveTracking(userId)
      if (!id || !isCurrentRestore()) return

      const result = await getMission(id)
      if (!isCurrentRestore()) return
      if (!result.ok) {
        setErrorMsg(result.error)
        setPhase('error')
        return
      }
      if (result.data.status !== 'tracking') return

      const nativeResult = await ensureNativeTracking(id, userId, result.data)
      if (!isCurrentRestore()) return
      if (!nativeResult.ok) {
        setErrorMsg(nativeResult.error)
        setPhase('error')
        return
      }

      setMission(nativeResult.data)
      setPhase('tracking')
      startDurationTimer(nativeResult.data.started_at ?? new Date().toISOString())
      await flushPromise
      if (isCurrentRestore()) await refreshPendingGpsPointCount()
    }

    void restoreMission().catch(handleRestoreError)
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void restoreMission().catch(handleRestoreError)
    })

    return () => {
      cancelled = true
      appStateSubscription.remove()
      stopDurationTimer()
    }
  }, [isLoaded, isSignedIn, refreshPendingGpsPointCount, restoreAttempt, setErrorMsg, setMission, setPhase, startDurationTimer, stopDurationTimer, userId])
}

export function useCompanionMissionController() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { signOut } = useClerk()
  const [phase, setPhase] = useState<TrackingPhase>('idle')
  const [mission, setMission] = useState<Mission | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [duration, setDuration] = useState('')
  const [pendingGpsPointCount, setPendingGpsPointCount] = useState(0)
  const [finalizationStage, setFinalizationStage] = useState<MissionFinalizationStage | null>(null)
  const [completionSummary, setCompletionSummary] = useState<Mission | null>(null)
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopDurationTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  const startDurationTimer = useCallback((startedAt: string) => {
    stopDurationTimer()
    setDuration(formatDuration(startedAt))
    timerRef.current = setInterval(() => setDuration(formatDuration(startedAt)), 1000)
  }, [stopDurationTimer])

  const refreshPendingGpsPointCount = usePendingGpsPointCountPolling({
    isVisible: phase === 'tracking' && mission !== null,
    readCount: () => userId ? getPendingGpsPointCount(userId) : Promise.resolve(0),
    onCount: setPendingGpsPointCount,
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
  })

  useEffect(() => {
    setCompletionSummary(null)
    setFinalizationStage(null)
    setPhase('idle')
  }, [isLoaded, isSignedIn])

  const handleStartMobileMission = useCallback(async (actionId?: string, label = 'Action bénévole mobile') => {
    setErrorMsg(null)
    setCompletionSummary(null)

    if (!userId) {
      const error = 'Connexion Clerk requise pour démarrer une mission.'
      setErrorMsg(error)
      Alert.alert('Connexion requise', error)
      return
    }

    setPhase('requesting')
    const trackingResult = await startMobileMission(userId, label, actionId)
    if (!trackingResult.ok) {
      setErrorMsg(trackingResult.error)
      setPhase('idle')
      Alert.alert('Suivi GPS impossible', trackingResult.error)
      return
    }

    setMission(trackingResult.data)
    setPhase('tracking')
    startDurationTimer(trackingResult.data.started_at ?? new Date().toISOString())
  }, [startDurationTimer, userId])

  const handleSessionExpired = useCallback(async () => {
    setErrorMsg('Votre session Clerk a expiré. Connectez-vous à nouveau pour continuer.')
    await signOut().catch(() => null)
  }, [signOut])

  const handleRetryMission = useCallback(() => {
    setErrorMsg(null)
    setPhase('requesting')
    setRestoreAttempt((attempt) => attempt + 1)
  }, [])

  const finalizeMission = useCallback(async (activeMission: Mission) => {
    setErrorMsg(null)
    setFinalizationStage('synchronizing')
    setPhase('stopping')
    stopDurationTimer()

    const result = await stopTracking(activeMission.id, setFinalizationStage, userId ?? undefined)
    await refreshPendingGpsPointCount()
    if (!result.ok) {
      setErrorMsg(result.error)
      setFinalizationStage(null)
      setPhase('tracking')
      Alert.alert('Mission conservée', result.error)
      return
    }

    if (userId) await clearStoredForegroundTrack(userId, activeMission.id)
    setMission(null)
    setCompletionSummary(result.data)
    setFinalizationStage(null)
    setPhase('idle')
  }, [refreshPendingGpsPointCount, stopDurationTimer, userId])

  const handleStop = useCallback(() => {
    if (!mission) return
    Alert.alert(
      'Terminer la mission ?',
      'Les points GPS seront synchronisés avant la finalisation serveur.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Terminer', style: 'destructive', onPress: () => void finalizeMission(mission).catch(() => undefined) },
      ],
    )
  }, [finalizeMission, mission])

  const handleReturnHome = useCallback(() => {
    setCompletionSummary(null)
    setErrorMsg(null)
    setMission(null)
    setPhase('idle')
  }, [])

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
