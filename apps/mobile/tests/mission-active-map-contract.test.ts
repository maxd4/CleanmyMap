import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(fileURLToPath(new URL('../App.tsx', import.meta.url)), 'utf8')
const mapSource = readFileSync(fileURLToPath(new URL('../screens/mission-active-map.tsx', import.meta.url)), 'utf8')

describe('active mobile mission live map contract', () => {
  it('renders a native map with the current marker and a live foreground polyline', () => {
    expect(mapSource).toMatch(/watchPositionAsync/)
    expect(mapSource).toMatch(/getCurrentPositionAsync/)
    expect(mapSource).toMatch(/<Marker\s+coordinate=\{currentPosition\}/)
    expect(mapSource).toMatch(/<Polyline\s+coordinates=\{track\}/)
    expect(mapSource).toMatch(/\.remove\(\)/)
  })

  it('keeps foreground tracking UX-only and out of the persistence paths', () => {
    expect(mapSource).not.toMatch(/saveLocationPoint|saveMissionAction|gps_points|distance_m|duration_s/)
  })

  it('removes the unvalidated mission action and photo shortcuts from V1 UI', () => {
    expect(appSource).not.toMatch(/ImagePicker|uploadMissionPhoto|saveMissionAction|ActionButton|actionGrid/)
    expect(appSource).not.toMatch(/DÉCHET TROUVÉ|RAMASSÉ|PHOTO|DANGER/)
    expect(appSource).toMatch(/MissionActiveMap/)
  })
})
