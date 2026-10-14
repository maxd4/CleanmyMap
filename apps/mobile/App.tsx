import React, { useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { ClerkProvider } from '@clerk/expo'
import { useHostedAuth } from '@clerk/expo/hosted-auth'
import { tokenCache } from '@clerk/expo/token-cache'
import { useCompanionMissionController } from './hooks/use-companion-mission-controller'
import { MobileShell } from './screens/mobile-shell'
import { MissionActiveMap } from './screens/mission-active-map'
import { MissionCompletionScreen, MissionFinalizationScreen } from './screens/mission-finalization'
import type { Mission } from './types/mission'

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''

function CompanionApp() {
  const {
    isLoaded, isSignedIn, userId, phase, mission, errorMsg, duration,
    pendingGpsPointCount, finalizationStage, completionSummary,
    handleStartMobileMission, handleSessionExpired, handleStop, handleReturnHome, signOut,
  } = useCompanionMissionController()

  if (!isLoaded) {
    return (
      <View style={styles.darkCenter}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.hudLabel}>CHARGEMENT...</Text>
      </View>
    )
  }

  if (!isSignedIn) {
    return <SignedOutScreen initialError={errorMsg} />
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
      ownerId={userId ?? null}
      duration={duration}
      pendingGpsPointCount={pendingGpsPointCount}
      errorMsg={errorMsg}
      onStop={handleStop}
    />
  }

  return (
    <MobileShell
      onSignOut={() => void signOut()}
      onSessionExpired={() => void handleSessionExpired()}
      onStartActivity={handleStartMobileMission}
    />
  )
}

function MissionActiveScreen({
  mission,
  ownerId,
  duration,
  pendingGpsPointCount,
  errorMsg,
  onStop,
}: {
  mission: Mission
  ownerId: string | null
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
        ownerId={ownerId ?? mission.volunteer_id ?? ''}
        missionLabel={mission.label}
        duration={duration}
        pendingGpsPointCount={pendingGpsPointCount}
        errorMsg={errorMsg}
        onStop={onStop}
      />
    </View>
  )
}
function SignedOutScreen({ initialError }: { initialError?: string | null }) {
  const { startHostedAuth } = useHostedAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError ?? null)

  async function handleSignIn() {
    await startAuth('sign-in')
  }

  async function handleSignUp() {
    await startAuth('sign-up')
  }

  async function startAuth(mode: 'sign-in' | 'sign-up') {
    setLoading(true)
    setError(null)

    try {
      await startHostedAuth({ mode })
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
      <TouchableOpacity style={styles.hudBtnSecondary} onPress={handleSignUp} disabled={loading}>
        <Text style={styles.hudBtnSecondaryText}>CRÉER UN COMPTE</Text>
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
