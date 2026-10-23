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
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useCompanionMissionController } from './hooks/use-companion-mission-controller'
import { MobileShell } from './screens/mobile-shell'
import { MissionActiveMap } from './screens/mission-active-map'
import { MissionCompletionScreen, MissionFinalizationScreen } from './screens/mission-finalization'
import { getMobilePublicEnv } from './lib/mobile-environment'
import type { Mission } from './types/mission'

const clerkPublishableKey = getMobilePublicEnv('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY') ?? ''

function CompanionApp() {
  const {
    isLoaded, isSignedIn, userId, phase, mission, errorMsg, duration,
    pendingGpsPointCount, finalizationStage, completionSummary,
    handleStartMobileMission, handleSessionExpired, handleStop, handleReturnHome, signOut,
  } = useCompanionMissionController()

  if (!isLoaded) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.darkCenter}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.hudLabel}>CHARGEMENT...</Text>
      </SafeAreaView>
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
      <SafeAreaView edges={['top', 'bottom']} style={styles.darkCenter}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.hudLabel}>PRÉPARATION DU SUIVI...</Text>
      </SafeAreaView>
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
      onSignOut={() => void signOut().catch(() => undefined)}
      onSessionExpired={() => void handleSessionExpired().catch(() => undefined)}
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
    <SafeAreaView edges={['top', 'bottom']} style={styles.darkCenter}>
      <StatusBar style="light" />
      <Text style={styles.hudTitle}>CLEANMYMAP</Text>
      <Text style={styles.hudSubtitle}>SATELLITE COMPANION</Text>
      <Text style={styles.authDescription}>
        Connectez-vous avec votre compte Clerk pour accéder à vos missions.
      </Text>
      {error ? (
        <View style={styles.errorBanner}>
          <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <TouchableOpacity accessibilityLabel={loading ? 'Connexion en cours' : 'Se connecter'} accessibilityRole="button" accessibilityState={{ disabled: loading }} style={styles.hudBtnPrimary} onPress={() => void handleSignIn().catch(() => undefined)} disabled={loading}>
        {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.hudBtnText}>SE CONNECTER</Text>}
      </TouchableOpacity>
      <TouchableOpacity accessibilityLabel="Créer un compte" accessibilityRole="button" accessibilityState={{ disabled: loading }} style={styles.hudBtnSecondary} onPress={() => void handleSignUp().catch(() => undefined)} disabled={loading}>
        <Text style={styles.hudBtnSecondaryText}>CRÉER UN COMPTE</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

function MissingClerkConfiguration() {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.darkCenter}>
      <StatusBar style="light" />
      <Text style={styles.hudTitle}>CLEANMYMAP</Text>
      <Text style={styles.hudSubtitle}>CONFIGURATION REQUISE</Text>
      <Text style={styles.authDescription}>
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY est nécessaire pour ouvrir le compagnon.
      </Text>
    </SafeAreaView>
  )
}

export default function App() {
  return <SafeAreaProvider>
    {!clerkPublishableKey ? (
      <MissingClerkConfiguration />
    ) : (
      <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
        <CompanionApp />
      </ClerkProvider>
    )}
  </SafeAreaProvider>
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
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    lineHeight: 18,
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
    minHeight: 48,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  hudBtnPrimaryDisabled: {
    backgroundColor: '#475569',
  },
  hudBtnSecondary: {
    minHeight: 44,
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  hudBtnSecondaryText: {
    color: '#94a3b8',
    fontSize: 14,
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
    color: '#022c22',
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
    fontSize: 13,
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
