import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import * as Location from 'expo-location'
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

function useMissionForegroundTrack(missionId: string, mapRef: React.MutableRefObject<MapView | null>) {
  const foregroundSubscriptionRef = useRef<Location.LocationSubscription | null>(null)
  const localTrackRef = useRef<ForegroundTrackPoint[]>([])
  const runIdRef = useRef(0)
  const [currentPosition, setCurrentPosition] = useState<Coordinate | null>(null)
  const [track, setTrack] = useState<ForegroundTrackPoint[]>([])
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('restoring')
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

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
        getStoredForegroundTrack(missionId),
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

      const coordinate = toCoordinate(location)
      const point = toTrackPoint(location)
      localTrackRef.current = mergeTrackPoints(localTrackRef.current, [point])
      setCurrentPosition(coordinate)
      setTrack((previousTrack) => mergeTrackPoints(previousTrack, [point]))
      void saveStoredForegroundTrack(missionId, localTrackRef.current)
      mapRef.current?.animateToRegion(
        {
          ...coordinate,
          ...FOLLOW_REGION_DELTAS,
        },
        500,
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
        void restoreAndResume()
      } else if (nextState === 'background' || nextState === 'inactive') {
        ++runIdRef.current
        stopForegroundSubscription()
        setGpsStatus('background')
      }
    })

    void restoreAndResume()

    return () => {
      active = false
      appStateSubscription.remove()
      stopForegroundSubscription()
    }
  }, [missionId, mapRef])

  return { currentPosition, track, gpsStatus, syncMessage }
}

export function MissionActiveMap({
  missionId,
  missionLabel,
  duration,
  pendingGpsPointCount,
  errorMsg,
  onStop,
}: {
  missionId: string
  missionLabel: string
  duration: string
  pendingGpsPointCount: number
  errorMsg: string | null
  onStop: () => void
}) {
  const mapRef = useRef<MapView | null>(null)
  const { currentPosition, track, gpsStatus, syncMessage } = useMissionForegroundTrack(missionId, mapRef)

  const polylineCoordinates = track.map(({ latitude, longitude }) => ({ latitude, longitude }))
  const liveDistance = calculateTrackDistanceMeters(track)

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

      <View pointerEvents="none" style={styles.statusOverlay}>
        <View style={styles.statusHeader}>
          <View style={styles.statusTitleGroup}>
            <Text style={styles.statusTitle}>{GPS_STATUS_LABEL[gpsStatus]}</Text>
            <Text numberOfLines={1} style={styles.missionLabel}>{missionLabel}</Text>
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
        <Text style={styles.statusText}>
          {pendingGpsPointCount > 0
            ? `Hors ligne · ${pendingGpsPointCount} point(s) à envoyer`
            : 'Synchronisation à jour'}
        </Text>
        {syncMessage ? <Text style={styles.syncText}>{syncMessage}</Text> : null}
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      </View>

      <View style={styles.actionOverlay}>
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
    top: 56,
    left: 12,
    right: 12,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#020617e8',
  },
  statusHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusTitleGroup: { flex: 1, marginRight: 8 },
  missionLabel: { color: '#f8fafc', fontSize: 15, fontWeight: '800', marginTop: 3 },
  livePill: {
    alignItems: 'center',
    backgroundColor: '#064e3b',
    borderRadius: 8,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  liveDot: { backgroundColor: '#34d399', borderRadius: 4, height: 8, marginRight: 5, width: 8 },
  liveText: { color: '#d1fae5', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  metricsRow: { flexDirection: 'row', marginTop: 12 },
  metric: { flex: 1 },
  metricLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '700' },
  metricValue: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 2 },
  actionOverlay: {
    alignItems: 'stretch',
    bottom: 16,
    left: 12,
    position: 'absolute',
    right: 12,
  },
  statusTitle: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  statusText: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 2,
  },
  syncText: {
    color: '#fbbf24',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
    fontWeight: '700',
  },
  errorText: { color: '#fecaca', fontSize: 11, lineHeight: 15, marginTop: 5 },
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
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
})
