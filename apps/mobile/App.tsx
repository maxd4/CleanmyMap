import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  AppState,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { ClerkProvider, useAuth, useClerk } from '@clerk/expo'
import { useHostedAuth } from '@clerk/expo/hosted-auth'
import { tokenCache } from '@clerk/expo/token-cache'
import {
  getMission,
  restoreActiveTracking,
  startMobileMission,
  stopTracking,
} from './lib/tracking-service'
import { clearStoredForegroundTrack, flushBuffer, getPendingGpsPointCount } from './lib/storage'
import { reconcilePendingLinkedMissions } from './lib/linked-mission-service'
import { MobileShell } from './screens/mobile-shell'
import { MissionActiveMap } from './screens/mission-active-map'
import { MissionCompletionScreen, MissionFinalizationScreen } from './screens/mission-finalization'
import type { Mission, MissionFinalizationStage, TrackingPhase } from './types/mission'

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''

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
}: {
  isLoaded: boolean
  isSignedIn: boolean
  setMission: React.Dispatch<React.SetStateAction<Mission | null>>
  setPhase: React.Dispatch<React.SetStateAction<TrackingPhase>>
  startDurationTimer: (startedAt: string) => void
  stopDurationTimer: () => void
}) {
  useEffect(() => {
    stopDurationTimer()
    setMission(null)
    if (!isLoaded || !isSignedIn) return

    let cancelled = false
    async function restoreMission() {
      void reconcilePendingLinkedMissions()
      // Un retour au premier plan est aussi un point de reprise réseau. Le
      // buffer reste Clerk-only et le storage sérialise les flush concurrents.
      void flushBuffer()
      const id = await restoreActiveTracking()
      if (!id || cancelled) return

      const result = await getMission(id)
      if (!cancelled && result.ok && result.data.status === 'tracking') {
        setMission(result.data)
        setPhase('tracking')
        startDurationTimer(result.data.started_at ?? new Date().toISOString())
      }
    }

    void restoreMission()
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void restoreMission()
    })

    return () => {
      cancelled = true
      appStateSubscription.remove()
      stopDurationTimer()
    }
  }, [isLoaded, isSignedIn, setMission, setPhase, startDurationTimer, stopDurationTimer])
}

function CompanionApp() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { signOut } = useClerk()
  const [phase, setPhase] = useState<TrackingPhase>('idle')
  const [mission, setMission] = useState<Mission | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [duration, setDuration] = useState('')
  const [pendingGpsPointCount, setPendingGpsPointCount] = useState(0)
  const [finalizationStage, setFinalizationStage] = useState<MissionFinalizationStage | null>(null)
  const [completionSummary, setCompletionSummary] = useState<Mission | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bufferTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopDurationTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  const startDurationTimer = useCallback((startedAt: string) => {
    stopDurationTimer()
    setDuration(formatDuration(startedAt))
    timerRef.current = setInterval(() => setDuration(formatDuration(startedAt)), 1000)
  }, [stopDurationTimer])

  useRestoreActiveMission({
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    setMission,
    setPhase,
    startDurationTimer,
    stopDurationTimer,
  })

  useEffect(() => {
    setCompletionSummary(null)
    setFinalizationStage(null)
    setPhase('idle')
  }, [isLoaded, isSignedIn, setPhase])

  useEffect(() => {
    async function refreshPendingGpsPointCount() {
      setPendingGpsPointCount(await getPendingGpsPointCount())
    }

    void refreshPendingGpsPointCount()
    bufferTimerRef.current = setInterval(() => void refreshPendingGpsPointCount(), 5000)

    return () => {
      if (bufferTimerRef.current) clearInterval(bufferTimerRef.current)
    }
  }, [])

  async function handleStartMobileMission() {
    setErrorMsg(null)
    setCompletionSummary(null)

    if (!userId) {
      const error = 'Connexion Clerk requise pour démarrer une mission.'
      setErrorMsg(error)
      Alert.alert('Connexion requise', error)
      return
    }

    setPhase('requesting')

    const trackingResult = await startMobileMission(userId)
    if (!trackingResult.ok) {
      setErrorMsg(trackingResult.error)
      setPhase('idle')
      Alert.alert('Suivi GPS impossible', trackingResult.error)
      return
    }

    setMission(trackingResult.data)
    setPhase('tracking')
    startDurationTimer(trackingResult.data.started_at ?? new Date().toISOString())
  }

  function handleStop() {
    if (!mission) return

    Alert.alert(
      'Terminer la mission ?',
      'Les points GPS seront synchronisés avant la finalisation serveur.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Terminer', style: 'destructive', onPress: () => void finalizeMission(mission) },
      ],
    )
  }

  async function finalizeMission(activeMission: Mission) {
    setErrorMsg(null)
    setFinalizationStage('synchronizing')
    setPhase('stopping')
    stopDurationTimer()

    const result = await stopTracking(activeMission.id, setFinalizationStage)
    if (!result.ok) {
      setErrorMsg(result.error)
      setFinalizationStage(null)
      setPhase('tracking')
      Alert.alert('Mission conservée', result.error)
      return
    }

    await clearStoredForegroundTrack(activeMission.id)
    setMission(null)
    setCompletionSummary(result.data)
    setFinalizationStage(null)
    setPhase('idle')
  }

  function handleReturnHome() {
    setCompletionSummary(null)
    setErrorMsg(null)
    setMission(null)
    setPhase('idle')
  }

  if (!isLoaded) {
    return (
      <View style={styles.darkCenter}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.hudLabel}>CHARGEMENT...</Text>
      </View>
    )
  }

  if (!isSignedIn) {
    return <SignedOutScreen />
  }

  if (phase === 'stopping' && finalizationStage) {
    return <MissionFinalizationScreen stage={finalizationStage} />
  }

  if (completionSummary) {
    return <MissionCompletionScreen mission={completionSummary} onReturnHome={handleReturnHome} />
  }

  if (phase === 'requesting') {
    return (
      <View style={styles.darkCenter}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.hudLabel}>PRÉPARATION DU SUIVI...</Text>
      </View>
    )
  }

  if (phase === 'tracking' && mission) {
    return <MissionActiveScreen
      mission={mission}
      duration={duration}
      pendingGpsPointCount={pendingGpsPointCount}
      errorMsg={errorMsg}
      onStop={handleStop}
    />
  }

  return <MobileShell onSignOut={() => void signOut()} onStartActivity={handleStartMobileMission} />
}

function MissionActiveScreen({
  mission,
  duration,
  pendingGpsPointCount,
  errorMsg,
  onStop,
}: {
  mission: Mission
  duration: string
  pendingGpsPointCount: number
  errorMsg: string | null
  onStop: () => void
}) {
  return (
    <View style={styles.activityRoot}>
      <StatusBar style="light" />
      <MissionActiveMap
        missionId={mission.id}
        missionLabel={mission.label}
        duration={duration}
        pendingGpsPointCount={pendingGpsPointCount}
        errorMsg={errorMsg}
        onStop={onStop}
      />
    </View>
  )
}
function SignedOutScreen() {
  const { startHostedAuth } = useHostedAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    setLoading(true)
    setError(null)

    try {
      await startHostedAuth({ mode: 'sign-in' })
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Connexion Clerk impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.darkCenter}>
      <Text style={styles.hudTitle}>CLEANMYMAP</Text>
      <Text style={styles.hudSubtitle}>SATELLITE COMPANION</Text>
      <Text style={styles.authDescription}>
        Connectez-vous avec votre compte Clerk pour accéder à vos missions.
      </Text>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <TouchableOpacity style={styles.hudBtnPrimary} onPress={handleSignIn} disabled={loading}>
        {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.hudBtnText}>SE CONNECTER</Text>}
      </TouchableOpacity>
    </View>
  )
}

function MissingClerkConfiguration() {
  return (
    <View style={styles.darkCenter}>
      <Text style={styles.hudTitle}>CLEANMYMAP</Text>
      <Text style={styles.hudSubtitle}>CONFIGURATION REQUISE</Text>
      <Text style={styles.authDescription}>
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY est nécessaire pour ouvrir le compagnon.
      </Text>
    </View>
  )
}

export default function App() {
  if (!clerkPublishableKey) {
    return <MissingClerkConfiguration />
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <CompanionApp />
    </ClerkProvider>
  )
}

const styles = StyleSheet.create({
  darkCenter: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  activityRoot: {
    flex: 1,
    backgroundColor: '#020617',
  },
  hudLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  hudTitle: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  hudSubtitle: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 40,
  },
  hudInputWrapper: {
    marginBottom: 24,
  },
  hudInput: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#334155',
  },
  hudBtnPrimary: {
    backgroundColor: '#10b981',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  hudBtnPrimaryDisabled: {
    backgroundColor: '#475569',
  },
  hudBtnSecondary: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  hudBtnSecondaryText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  hudBtnDanger: {
    backgroundColor: '#ef4444',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  hudBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  warningBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f59e0b55',
    backgroundColor: '#f59e0b14',
    padding: 16,
    marginBottom: 24,
  },
  warningTitle: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  warningText: {
    color: '#fde68a',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  errorBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ef444455',
    backgroundColor: '#ef444414',
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  authDescription: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
    maxWidth: 320,
    textAlign: 'center',
  },
})
