import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from './lib/supabase'
import {
  getBackgroundTrackingWarning,
  getMission,
  restoreActiveTracking,
  saveMissionAction,
  startTracking,
  stopTracking,
} from './lib/tracking-service'
import { getBufferCount } from './lib/storage'
import { uploadMissionPhoto } from './lib/storage-upload'
import type { Mission, MissionActionType, TrackingPhase } from './types/mission'

const { width } = Dimensions.get('window')

function formatDuration(startedAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
  return `${remainingSeconds}s`
}

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [phase, setPhase] = useState<TrackingPhase>('idle')
  const [mission, setMission] = useState<Mission | null>(null)
  const [missionIdInput, setMissionIdInput] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [duration, setDuration] = useState('')
  const [bufferCount, setBufferCount] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const trackingWarning = getBackgroundTrackingWarning()

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bufferTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => setSession(currentSession))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))

    restoreActiveTracking().then(async (id) => {
      if (!id) return

      const result = await getMission(id)
      if (result.ok && result.data.status === 'tracking') {
        setMission(result.data)
        setPhase('tracking')
        startDurationTimer(result.data.started_at ?? new Date().toISOString())
      }
    })

    const handleDeepLink = (event: { url: string }) => {
      const { queryParams } = Linking.parse(event.url)
      if (queryParams?.id) {
        setMissionIdInput(queryParams.id as string)
      }
    }

    const subscription = Linking.addEventListener('url', handleDeepLink)

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url })
      }
    })

    bufferTimerRef.current = setInterval(async () => {
      const count = await getBufferCount()
      setBufferCount(count)
    }, 5000)

    return () => {
      listener.subscription.unsubscribe()
      subscription.remove()
      stopDurationTimer()
      if (bufferTimerRef.current) clearInterval(bufferTimerRef.current)
    }
  }, [])

  function startDurationTimer(startedAt: string) {
    setDuration(formatDuration(startedAt))
    timerRef.current = setInterval(() => setDuration(formatDuration(startedAt)), 1000)
  }

  function stopDurationTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
  }

  async function handleStart() {
    setErrorMsg(null)
    const id = missionIdInput.trim()

    if (!id) {
      setErrorMsg('ID manquant')
      return
    }

    if (!session) {
      setErrorMsg('Non connecté')
      return
    }

    if (trackingWarning) {
      setErrorMsg(trackingWarning)
      Alert.alert('Build requis', trackingWarning)
      return
    }

    setPhase('requesting')
    const result = await startTracking(id)

    if (!result.ok) {
      setErrorMsg(result.error)
      setPhase('idle')
      return
    }

    setMission(result.data)
    setPhase('tracking')
    startDurationTimer(result.data.started_at ?? new Date().toISOString())
  }

  async function handleStop() {
    if (!mission) return

    setPhase('stopping')
    stopDurationTimer()

    const result = await stopTracking(mission.id)
    if (!result.ok) {
      setErrorMsg(result.error)
      setPhase('tracking')
      return
    }

    setMission(null)
    setPhase('idle')
  }

  async function handleTakePhoto() {
    if (!mission) return

    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission refusée', "L'accès à la caméra est requis pour cette action.")
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    })

    if (!result.canceled && result.assets && result.assets[0]) {
      setActionLoading('photo')
      const photoUri = result.assets[0].uri

      const { publicUrl, error } = await uploadMissionPhoto(mission.id, photoUri)

      if (error) {
        Alert.alert('Erreur Upload', error)
        setActionLoading(null)
        return
      }

      const recordResult = await saveMissionAction(
        mission.id,
        'photo',
        undefined,
        'Photo du terrain',
        publicUrl,
      )
      setActionLoading(null)

      if (recordResult.ok) {
        Alert.alert('Succès', 'Photo enregistrée et liée à la mission.')
      }
    }
  }

  async function handleRecordAction(type: MissionActionType, label: string) {
    if (!mission) return

    if (type === 'photo') {
      handleTakePhoto()
      return
    }

    setActionLoading(type)
    const result = await saveMissionAction(mission.id, type)
    setActionLoading(null)

    if (result.ok) {
      Alert.alert('Enregistré', `${label} enregistré avec succès.`)
    } else {
      Alert.alert('Action mise en tampon', "Hors ligne ? L'action sera synchronisée plus tard.")
    }
  }

  if (phase === 'requesting' || phase === 'stopping') {
    return (
      <View style={styles.darkCenter}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.hudLabel}>{phase === 'stopping' ? 'TRANSMISSION...' : 'INITIALISATION...'}</Text>
      </View>
    )
  }

  if (!session) {
    return (
      <View style={styles.darkCenter}>
        <Text style={styles.hudTitle}>CLEANMYMAP</Text>
        <Text style={styles.hudSubtitle}>SATELLITE COMPANION</Text>
        <TouchableOpacity style={styles.hudBtnPrimary} onPress={() => supabase.auth.signInAnonymously()}>
          <Text style={styles.hudBtnText}>AUTH ANONYME</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (phase === 'tracking' && mission) {
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

        <View style={styles.hudStatsRow}>
          <View style={styles.hudStatBox}>
            <Text style={styles.hudStatLabel}>DURÉE</Text>
            <Text style={styles.hudStatValue}>{duration}</Text>
          </View>
          <View style={styles.hudStatBox}>
            <Text style={styles.hudStatLabel}>SYNC BUFFER</Text>
            <Text style={[styles.hudStatValue, bufferCount > 0 && { color: '#fbbf24' }]}>{bufferCount}</Text>
          </View>
        </View>

        <View style={styles.actionGridContainer}>
          <Text style={styles.hudLabelSection}>ENREGISTREMENT RAPIDE</Text>
          <View style={styles.actionGrid}>
            <ActionButton
              icon="trash-outline"
              label="DÉCHET TROUVÉ"
              color="#fbbf24"
              loading={actionLoading === 'trash_found'}
              onPress={() => handleRecordAction('trash_found', 'Déchet trouvé')}
            />
            <ActionButton
              icon="checkmark-done-outline"
              label="RAMASSÉ"
              color="#10b981"
              loading={actionLoading === 'trash_collected'}
              onPress={() => handleRecordAction('trash_collected', 'Déchet ramassé')}
            />
            <ActionButton
              icon="camera-outline"
              label="PHOTO"
              color="#a78bfa"
              loading={actionLoading === 'photo'}
              onPress={() => handleRecordAction('photo', 'Photo')}
            />
            <ActionButton
              icon="warning-outline"
              label="DANGER"
              color="#f87171"
              loading={actionLoading === 'hazard'}
              onPress={() => handleRecordAction('hazard', 'Danger signalé')}
            />
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.hudBtnDanger} onPress={handleStop}>
          <Text style={styles.hudBtnText}>TERMINER LA MISSION</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.darkContainer}>
      <StatusBar style="light" />
      <Text style={styles.hudTitle}>CLEANMYMAP</Text>
      <Text style={styles.hudSubtitle}>PRET POUR MISSION</Text>
      {trackingWarning ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningTitle}>EXPO GO INCOMPATIBLE</Text>
          <Text style={styles.warningText}>{trackingWarning}</Text>
        </View>
      ) : null}

      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <View style={styles.hudInputWrapper}>
        <Text style={styles.hudLabel}>IDENTIFIANT MISSION</Text>
        <TextInput
          style={styles.hudInput}
          value={missionIdInput}
          onChangeText={setMissionIdInput}
          placeholder="XXXX-XXXX-XXXX"
          placeholderTextColor="#475569"
        />
      </View>

      <TouchableOpacity
        style={[styles.hudBtnPrimary, trackingWarning && styles.hudBtnPrimaryDisabled]}
        onPress={handleStart}
        disabled={Boolean(trackingWarning)}
      >
        <Text style={styles.hudBtnText}>DÉMARRER</Text>
      </TouchableOpacity>
    </View>
  )
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  color: string
  onPress: () => void
  loading?: boolean
}) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { borderColor: `${color}40` }]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator size="small" color={color} /> : <Ionicons name={icon} size={28} color={color} />}
      <Text style={[styles.actionBtnLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
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
  hudLabelSection: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: 'center',
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
  actionGridContainer: {
    marginTop: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionBtn: {
    width: (width - 48 - 12) / 2,
    aspectRatio: 1,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  actionBtnLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
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
})
