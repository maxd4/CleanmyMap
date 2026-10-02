import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import * as Location from 'expo-location'
import MapView, { Marker, Polyline, type Region } from 'react-native-maps'

type Coordinate = {
  latitude: number
  longitude: number
}

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

function toCoordinate(location: Location.LocationObject): Coordinate {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  }
}

export function MissionActiveMap() {
  const mapRef = useRef<MapView | null>(null)
  const foregroundSubscriptionRef = useRef<Location.LocationSubscription | null>(null)
  const [currentPosition, setCurrentPosition] = useState<Coordinate | null>(null)
  const [track, setTrack] = useState<Coordinate[]>([])
  const [foregroundError, setForegroundError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    function handleLocation(location: Location.LocationObject) {
      if (!active) return

      const coordinate = toCoordinate(location)
      setCurrentPosition(coordinate)
      setTrack((previousTrack) => {
        const lastPoint = previousTrack[previousTrack.length - 1]
        if (lastPoint?.latitude === coordinate.latitude && lastPoint.longitude === coordinate.longitude) {
          return previousTrack
        }
        return [...previousTrack, coordinate]
      })
      mapRef.current?.animateToRegion(
        {
          ...coordinate,
          ...FOLLOW_REGION_DELTAS,
        },
        500,
      )
    }

    async function startForegroundTracking() {
      try {
        const permission = await Location.getForegroundPermissionsAsync()
        if (!active) return
        if (permission.status !== 'granted') {
          setForegroundError('Position live indisponible : permission GPS premier plan manquante.')
          return
        }

        const initialPosition = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
        handleLocation(initialPosition)

        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 5,
          },
          handleLocation,
        )

        if (!active) {
          subscription.remove()
          return
        }
        foregroundSubscriptionRef.current = subscription
      } catch (error) {
        if (active) {
          setForegroundError(
            `Position live indisponible : ${error instanceof Error ? error.message : 'erreur GPS inconnue.'}`,
          )
        }
      }
    }

    void startForegroundTracking()

    return () => {
      active = false
      foregroundSubscriptionRef.current?.remove()
      foregroundSubscriptionRef.current = null
    }
  }, [])

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
        {track.length > 1 ? <Polyline coordinates={track} strokeColor="#10b981" strokeWidth={5} /> : null}
      </MapView>

      <View pointerEvents="none" style={styles.statusOverlay}>
        <Text style={styles.statusTitle}>TRACÉ LIVE</Text>
        <Text style={styles.statusText}>{track.length} position(s) UX</Text>
      </View>

      {!currentPosition && !foregroundError ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color="#10b981" />
          <Text style={styles.loadingText}>LOCALISATION...</Text>
        </View>
      ) : null}

      {foregroundError ? (
        <View style={styles.errorOverlay} pointerEvents="none">
          <Text style={styles.errorText}>{foregroundError}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 240,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    marginBottom: 20,
  },
  map: {
    flex: 1,
  },
  statusOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#020617dd',
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
  errorOverlay: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    left: 16,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#450a0add',
  },
  errorText: {
    color: '#fecaca',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
})
