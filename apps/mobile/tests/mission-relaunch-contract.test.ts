import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const appSource = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8')
const controllerSource = readFileSync(resolve(__dirname, '../hooks/use-companion-mission-controller.ts'), 'utf8')
const sessionSource = readFileSync(resolve(__dirname, '../lib/supabase.ts'), 'utf8')
const taskSource = readFileSync(resolve(__dirname, '../tasks/gps-task.ts'), 'utf8')
const mapSource = readFileSync(resolve(__dirname, '../screens/mission-active-map.tsx'), 'utf8')

describe('mobile GPS relaunch contract', () => {
  it('restores the persisted mission again when the app returns active', () => {
    expect(controllerSource).toContain('AppState.addEventListener')
    expect(controllerSource).toContain('if (nextState === \'active\') void restoreMission()')
    expect(controllerSource).toContain('restoreActiveTracking(userId)')
    expect(controllerSource).toContain('getMission(id)')
    expect(controllerSource).toContain('const flushPromise = flushBuffer(userId)')
    expect(controllerSource).toContain('await refreshPendingGpsPointCount()')
    expect(mapSource).toContain('getStoredForegroundTrack(ownerId, missionId)')
    expect(mapSource).toContain('getMissionTrack(missionId)')
  })

  it('keeps headless identity on Clerk and buffers without a fallback', () => {
    expect(sessionSource).toContain('getClerkInstance({ publishableKey: clerkPublishableKey, tokenCache })')
    expect(sessionSource).toContain('await clerkLoadPromise')
    expect(sessionSource).not.toContain('supabase.auth.signIn')
    expect(taskSource).toContain('if (!client)')
    expect(taskSource).toContain('await bufferPoint')
    expect(taskSource).not.toContain('signInAnonymously')
  })
})
