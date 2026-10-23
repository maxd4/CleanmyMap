import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMobileApiBaseUrl, getMobilePublicEnv, getMobileWebBaseUrl } from '../lib/mobile-environment'

const mobileEnvironmentSource = readFileSync(
  fileURLToPath(new URL('../lib/mobile-environment.ts', import.meta.url)),
  'utf8',
)

const publicEnvironmentNames = [
  'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_WEB_APP_URL',
  'EXPO_PUBLIC_WEB_URL',
] as const

describe('mobile Expo environment boundary', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(publicEnvironmentNames)('keeps %s as a static Expo-compatible reference', (name) => {
    expect(mobileEnvironmentSource).toContain(`process.env.${name}`)
  })

  it('does not use a dynamic process.env lookup', () => {
    expect(mobileEnvironmentSource).not.toMatch(/process\.env\s*\[/)
    expect(mobileEnvironmentSource).not.toContain('globalThis.process')
  })

  it('reads all public values at call time for runtime testability', () => {
    vi.stubEnv('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_test_mobile')
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://supabase.example')
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'anon_mobile')
    vi.stubEnv('EXPO_PUBLIC_WEB_APP_URL', 'https://api.example/')
    vi.stubEnv('EXPO_PUBLIC_WEB_URL', 'https://web.example/')

    expect(getMobilePublicEnv('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY')).toBe('pk_test_mobile')
    expect(getMobilePublicEnv('EXPO_PUBLIC_SUPABASE_URL')).toBe('https://supabase.example')
    expect(getMobilePublicEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY')).toBe('anon_mobile')
    expect(getMobileApiBaseUrl()).toBe('https://api.example')
    expect(getMobileWebBaseUrl()).toBe('https://web.example')
  })

  it('preserves missing configuration behavior and the canonical web fallback', () => {
    const originalValues = publicEnvironmentNames.map((name) => [name, process.env[name]] as const)

    try {
      for (const name of publicEnvironmentNames) delete process.env[name]

      expect(getMobileApiBaseUrl()).toBeUndefined()
      expect(getMobileWebBaseUrl()).toBe('https://cleanmymap.fr')
      expect(getMobilePublicEnv('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY')).toBeUndefined()
      expect(getMobilePublicEnv('EXPO_PUBLIC_SUPABASE_URL')).toBeUndefined()
      expect(getMobilePublicEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY')).toBeUndefined()
    } finally {
      for (const [name, value] of originalValues) {
        if (value === undefined) delete process.env[name]
        else process.env[name] = value
      }
    }
  })
})
