import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const appSource = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8')
const sessionSource = readFileSync(resolve(__dirname, '../lib/supabase.ts'), 'utf8')
const taskSource = readFileSync(resolve(__dirname, '../tasks/gps-task.ts'), 'utf8')

describe('mobile GPS relaunch contract', () => {
  it('restores the persisted mission again when the app returns active', () => {
    expect(appSource).toContain('AppState.addEventListener')
    expect(appSource).toContain('if (nextState === \'active\') void restoreMission()')
    expect(appSource).toContain('restoreActiveTracking()')
    expect(appSource).toContain('getMission(id)')
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
