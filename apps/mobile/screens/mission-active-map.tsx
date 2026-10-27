import React, { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, ActivityIndicator, AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import * as Location from 'expo-location'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MapView, { Marker, Polyline, type Region } from 'react-native-maps'
import { getMissionTrack } from '../lib/tracking-service'
import { getStoredForegroundTrack, saveStoredForegroundTrack } from '../lib/storage'
import { calculateTrackDistanceMeters, mergeTrackPoints } from '../lib/track-geometry'
import { EmergencyCallActions } from './emergency-call-actions'
import type { ForegroundTrackPoint, MissionLocation } from '../types/mission'

type Coordinate = {
  latitude: number
  longitude: number
}

type GpsStatus = 'restoring' | 'live' | 'offline' | 'permission-denied' | 'background'

const FALLBACK_REGION: Region = {
  latitude: 46.603354,
  longitude: 1.888334,
  latitudeDelta: 8,
  longitudeDelta: 8,
}

const FOLLOW_REGION_DELTAS = {
  latitudeDelta: 0.005,
  longitudeDelta: 0.005,
}

const GPS_STATUS_LABEL: Record<GpsStatus, string> = {
  restoring: 'GPS — RESTAURATION',
  live: 'GPS — LIVE',
  offline: 'GPS — HORS LIGNE',
  'permission-denied': 'GPS — PERMISSION REQUISE',
  background: 'GPS — ARRIÈRE-PLAN',
}

function toCoordinate(location: Location.LocationObject): Coordinate {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  }
}

function toTrackPoint(location: Location.LocationObject): ForegroundTrackPoint {
  return {
    ...toCoordinate(location),
    recordedAt: new Date(location.timestamp).toISOString(),
  }
}

function toPersistedTrackPoint(point: MissionLocation): ForegroundTrackPoint {
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    recordedAt: point.recorded_at,
  }
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`
  return `${(distanceMeters / 1000).toFixed(2)} km`
}

function useMissionForegroundTrack(ownerId: string, missionId: string, mapRef: React.MutableRefObject<MapView | null>) {
  const foregroundSubscriptionRef = useRef<Location.LocationSubscription | null>(null)
  const localTrackRef = useRef<ForegroundTrackPoint[]>([])
  const runIdRef = useRef(0)
  const [currentPosition, setCurrentPosition] = useState<Coordinate | null>(null)
  const [track, setTrack] = useState<ForegroundTrackPoint[]>([])
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('restoring')
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const reduceMotionRef = useRef(false)

  useEffect(() => {
    let active = true

    function stopForegroundSubscription() {
      foregroundSubscriptionRef.current?.remove()
      foregroundSubscriptionRef.current = null
    }

    function setTrackFromSources(serverPoints: MissionLocation[], localPoints: ForegroundTrackPoint[]) {
      const restored = serverPoints.map(toPersistedTrackPoint)
      setTrack(mergeTrackPoints(restored, localPoints))
    }

    async function restoreTrack(runId: number): Promise<void> {
      const [localPoints, serverResult] = await Promise.all([
        getStoredForegroundTrack(ownerId, missionId),
        getMissionTrack(missionId),
      ])
      if (!active || runId !== runIdRef.current) return

      localTrackRef.current = localPoints
      if (serverResult.ok) {
        setTrackFromSources(serverResult.data, localPoints)
        setSyncMessage(null)
        return
      }

      setTrackFromSources([], localPoints)
      setSyncMessage(localPoints.length > 0 ? 'Réseau indisponible — tracé local conservé.' : serverResult.error)
    }

    function handleLocation(location: Location.LocationObject, runId: number) {
      if (!active || runId !== runIdRef.current) return

      if (
        !Number.isFinite(location.coords.latitude) ||
        !Number.isFinite(location.coords.longitude) ||
        !Number.isFinite(location.timestamp) ||
        Number.isNaN(new Date(location.timestamp).getTime())
      ) {
        setSyncMessage('Position GPS invalide.')
        return
      }

      const coordinate = toCoordinate(location)
      const point = toTrackPoint(location)
      localTrackRef.current = mergeTrackPoints(localTrackRef.current, [point])
      setCurrentPosition(coordinate)
      setTrack((previousTrack) => mergeTrackPoints(previousTrack, [point]))
      void saveStoredForegroundTrack(ownerId, missionId, localTrackRef.current).catch(() => undefined)
      mapRef.current?.animateToRegion(
        {
          ...coordinate,
          ...FOLLOW_REGION_DELTAS,
        },
        reduceMotionRef.current ? 0 : 500,
      )
    }

    async function startForegroundTracking(runId: number) {
      try {
        const permission = await Location.getForegroundPermissionsAsync()
        if (!active || runId !== runIdRef.current) return
        if (permission.status !== 'granted') {
          setGpsStatus('permission-denied')
          return
        }

        const initialPosition = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
        handleLocation(initialPosition, runId)

        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 5,
          },
          (location) => handleLocation(location, runId),
        )

        if (!active || runId !== runIdRef.current) {
          subscription.remove()
          return
        }
        foregroundSubscriptionRef.current = subscription
        setGpsStatus('live')
      } catch (error) {
        if (active && runId === runIdRef.current) {
          setGpsStatus('offline')
          setSyncMessage(error instanceof Error ? error.message : 'Position live indisponible.')
        }
      }
    }

    async function restoreAndResume() {
      const runId = ++runIdRef.current
      stopForegroundSubscription()
      setGpsStatus('restoring')
      await restoreTrack(runId)
      if (!active || runId !== runIdRef.current) return
      await startForegroundTracking(runId)
    }

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void restoreAndResume().catch(() => undefined)
      } else if (nextState === 'background' || nextState === 'inactive') {
        ++runIdRef.current
        stopForegroundSubscription()
        setGpsStatus('background')
      }
    })

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) {
        reduceMotionRef.current = enabled
      }
    }).catch(() => undefined)
    const reduceMotionSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      reduceMotionRef.current = enabled
    })

    void restoreAndResume().catch(() => undefined)

    return () => {
      active = false
      reduceMotionSubscription.remove()
      appStateSubscription.remove()
      stopForegroundSubscription()
    }
  }, [ownerId, missionId, mapRef])

  return { currentPosition, track, gpsStatus, syncMessage }
}

export function MissionActiveMap({
  ownerId,
  missionId,
  missionLabel,
  duration,
  pendingGpsPointCount,
  errorMsg,
  onStop,
}: {
  ownerId: string
  missionId: string
  missionLabel: string
  duration: string
  pendingGpsPointCount: number
  errorMsg: string | null
  onStop: () => void
}) {
  const mapRef = useRef<MapView | null>(null)
  const { currentPosition, track, gpsStatus, syncMessage } = useMissionForegroundTrack(ownerId, missionId, mapRef)
  const insets = useSafeAreaInsets()

  const polylineCoordinates = track.map(({ latitude, longitude }) => ({ latitude, longitude }))
  const liveDistance = calculateTrackDistanceMeters(track)
  const syncStatus = pendingGpsPointCount > 0
    ? `${pendingGpsPointCount} point(s) à synchroniser`
    : syncMessage || errorMsg
      ? 'Synchronisation indisponible'
      : 'Synchronisation à jour'

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={FALLBACK_REGION}
        showsUserLocation
        showsMyLocationButton
        loadingEnabled
        loadingBackgroundColor="#0f172a"
        loadingIndicatorColor="#10b981"
      >
        {currentPosition ? <Marker coordinate={currentPosition} pinColor="#10b981" title="Position actuelle" /> : null}
        {polylineCoordinates.length > 1 ? (
          <Polyline coordinates={polylineCoordinates} strokeColor="#10b981" strokeWidth={5} />
        ) : null}
      </MapView>

      <View pointerEvents="none" style={[styles.statusOverlay, { top: Math.max(insets.top + 12, 12) }]}>
        <View style={styles.statusHeader}>
          <View style={styles.statusTitleGroup}>
            <Text style={styles.statusTitle}>{GPS_STATUS_LABEL[gpsStatus]}</Text>
            <Text style={styles.missionLabel}>{missionLabel}</Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>EN COURS</Text>
          </View>
        </View>
        <View style={styles.metricsRow}>
          <Metric label="Durée" value={duration} />
          <Metric label="Distance live indicative" value={formatDistance(liveDistance)} />
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.statusText}>{syncStatus}</Text>
        {syncMessage ? <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.syncText}>{syncMessage}</Text> : null}
        {errorMsg ? <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.errorText}>{errorMsg}</Text> : null}
      </View>

      <View style={[styles.actionOverlay, { bottom: Math.max(insets.bottom + 12, 12) }]}>
        <EmergencyCallActions compact />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Terminer la mission"
          style={styles.stopButton}
          onPress={onStop}
        >
          <Text style={styles.stopButtonText}>TERMINER</Text>
        </TouchableOpacity>
      </View>

      {gpsStatus === 'restoring' && track.length === 0 ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color="#10b981" />
          <Text style={styles.loadingText}>RESTAURATION DU TRACÉ...</Text>
        </View>
      ) : null}
    </View>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  map: {
    flex: 1,
  },
  statusOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#020617e8',
  },
  statusHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusTitleGroup: { flex: 1, flexShrink: 1, marginRight: 8, minWidth: 0 },
  missionLabel: { color: '#f8fafc', flexShrink: 1, fontSize: 15, fontWeight: '800', lineHeight: 20, marginTop: 3 },
  livePill: {
    alignItems: 'center',
    backgroundColor: '#064e3b',
    borderRadius: 8,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  liveDot: { backgroundColor: '#34d399', borderRadius: 4, height: 8, marginRight: 5, width: 8 },
  liveText: { color: '#d1fae5', fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  metric: { flex: 1, minWidth: '48%' },
  metricLabel: { color: '#94a3b8', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  metricValue: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 2 },
  actionOverlay: {
    alignItems: 'stretch',
    bottom: 12,
    left: 12,
    position: 'absolute',
    right: 12,
  },
  statusTitle: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  statusText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  syncText: {
    color: '#fbbf24',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: '700',
  },
  errorText: { color: '#fecaca', fontSize: 13, lineHeight: 18, marginTop: 5 },
  stopButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderColor: '#fecaca',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 54,
    marginTop: 10,
  },
  stopButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '900', letterSpacing: 1.2 },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
})
