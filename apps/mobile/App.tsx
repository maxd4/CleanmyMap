import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
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
import { clearStoredForegroundTrack, getPendingGpsPointCount } from './lib/storage'
import { MobileShell } from './screens/mobile-shell'
import { MissionActiveMap } from './screens/mission-active-map'
import { MissionCompletionScreen, MissionFinalizationScreen } from './screens/mission-finalization'
import { EmergencyCallActions } from './screens/emergency-call-actions'
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

  useEffect(() => {
    stopDurationTimer()
    setMission(null)
    setCompletionSummary(null)
    setFinalizationStage(null)
    setPhase('idle')

    if (!isLoaded || !isSignedIn) return

    let cancelled = false
    restoreActiveTracking().then(async (id) => {
      if (!id || cancelled) return

      const result = await getMission(id)
      if (!cancelled && result.ok && result.data.status === 'tracking') {
        setMission(result.data)
        setPhase('tracking')
        startDurationTimer(result.data.started_at ?? new Date().toISOString())
      }
    })

    return () => {
      cancelled = true
      stopDurationTimer()
    }
  }, [isLoaded, isSignedIn])

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

  function startDurationTimer(startedAt: string) {
    setDuration(formatDuration(startedAt))
    timerRef.current = setInterval(() => setDuration(formatDuration(startedAt)), 1000)
  }

  function stopDurationTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

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
        <Text style={styles.hudLabel}>CHARGEMENT CLERK...</Text>
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
        <Text style={styles.hudLabel}>INITIALISATION...</Text>
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
    <View style={styles.darkContainer}>
      <StatusBar style="light" />

      <View style={styles.hudHeader}>
        <View>
          <Text style={styles.hudLabel}>MISSION ACTIVE</Text>
          <Text style={styles.hudTitleSmall}>{mission.label}</Text>
        </View>
        <View style={styles.hudStatus}>
          <View style={styles.hudStatusDot} />
          <Text style={styles.hudStatusText}>LIVE</Text>
        </View>
      </View>

      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <View style={styles.hudStatsRow}>
        <View style={styles.hudStatBox}>
          <Text style={styles.hudStatLabel}>DURÉE</Text>
          <Text style={styles.hudStatValue}>{duration}</Text>
        </View>
        <View style={styles.hudStatBox}>
          <Text style={styles.hudStatLabel}>GPS EN ATTENTE</Text>
          <Text style={[styles.hudStatValue, pendingGpsPointCount > 0 && { color: '#fbbf24' }]}>
            {pendingGpsPointCount}
          </Text>
        </View>
      </View>

      <MissionActiveMap missionId={mission.id} pendingGpsPointCount={pendingGpsPointCount} />

      <EmergencyCallActions />

      <TouchableOpacity style={styles.hudBtnDanger} onPress={onStop}>
        <Text style={styles.hudBtnText}>TERMINER LA MISSION</Text>
      </TouchableOpacity>
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
  darkContainer: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 24,
    paddingTop: 64,
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
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
  hudTitleSmall: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  hudSubtitle: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 40,
  },
  hudStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b98120',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b98140',
  },
  hudStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  hudStatusText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '900',
  },
  hudStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  hudStatBox: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  hudStatLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  hudStatValue: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
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
