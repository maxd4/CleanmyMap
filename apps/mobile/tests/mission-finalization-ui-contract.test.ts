import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const appSource = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8')
const screenSource = readFileSync(resolve(__dirname, '../screens/mission-finalization.tsx'), 'utf8')
const serviceSource = readFileSync(resolve(__dirname, '../lib/tracking-service.ts'), 'utf8')

describe('mobile mission finalization UI contract', () => {
  it('confirms before stopping and exposes the ordered finalization states', () => {
    expect(appSource).toContain("Alert.alert(")
    expect(appSource).toContain("'Terminer la mission ?'")
    expect(appSource).toContain("setFinalizationStage('synchronizing')")
    expect(appSource).toContain('MissionFinalizationScreen')
    expect(screenSource).toContain('SYNCHRONISATION...')
    expect(screenSource).toContain('FINALISATION SERVEUR...')
  })

  it('shows server metrics and a home CTA without client metric writes', () => {
    expect(screenSource).toContain('mission.duration_s')
    expect(screenSource).toContain('mission.distance_m')
    expect(screenSource).toContain('Synchronisée avec le serveur')
    expect(screenSource).toContain('REVENIR À L’ACCUEIL')
    expect(serviceSource).toContain("{\n        status: 'completed',\n        ended_at: new Date().toISOString(),\n      }")
    expect(serviceSource).not.toContain('distance_m:')
    expect(serviceSource).not.toContain('duration_s:')
  })
})
