import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(fileURLToPath(new URL('../App.tsx', import.meta.url)), 'utf8')
const mapSource = readFileSync(fileURLToPath(new URL('../screens/mission-active-map.tsx', import.meta.url)), 'utf8')

describe('active mobile mission live map contract', () => {
  it('renders a native map with the current marker and a live foreground polyline', () => {
    expect(mapSource).toMatch(/getMissionTrack/)
    expect(mapSource).toMatch(/getStoredForegroundTrack/)
    expect(mapSource).toMatch(/AppState\.addEventListener\('change'/)
    expect(mapSource).toMatch(/watchPositionAsync/)
    expect(mapSource).toMatch(/getCurrentPositionAsync/)
    expect(mapSource).toMatch(/<Marker\s+coordinate=\{currentPosition\}/)
    expect(mapSource).toMatch(/<Polyline\s+coordinates=\{polylineCoordinates\}/)
    expect(mapSource).toMatch(/\.remove\(\)/)
  })

  it('keeps foreground tracking UX-only and out of the persistence paths', () => {
    expect(mapSource).not.toMatch(/saveLocationPoint|saveMissionAction|\.from\(['"]gps_points/)
    expect(mapSource).not.toMatch(/distance_m|duration_s|update\(/)
    expect(mapSource).toMatch(/saveStoredForegroundTrack/)
  })

  it('removes the unvalidated mission action and photo shortcuts from V1 UI', () => {
    expect(appSource).not.toMatch(/ImagePicker|uploadMissionPhoto|saveMissionAction|ActionButton|actionGrid/)
    expect(appSource).not.toMatch(/DÉCHET TROUVÉ|RAMASSÉ|PHOTO|DANGER/)
    expect(appSource).toMatch(/MissionActiveMap/)
  })

  it('exposes the GPS state, pending synchronization count and display-only distance', () => {
    expect(mapSource).toMatch(/GPS_STATUS_LABEL/)
    expect(mapSource).toMatch(/pendingGpsPointCount/)
    expect(mapSource).toMatch(/Distance live indicative/)
    expect(mapSource).not.toMatch(/distance_m|duration_s/)
  })

  it('keeps the field surface map-first with compact status and primary stop action', () => {
    expect(mapSource).toContain('style={styles.map}')
    expect(mapSource).toContain('duration')
    expect(mapSource).toContain('EmergencyCallActions compact')
    expect(mapSource).toContain('accessibilityLabel="Terminer la mission"')
    expect(mapSource).toContain('style={styles.stopButton}')
    expect(appSource).toContain('style={styles.activityRoot}')
    expect(appSource).not.toContain('styles.hudStatsRow')
  })
})
