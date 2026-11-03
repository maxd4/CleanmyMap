import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const ownerFiles = {
  actions: [
    'features/actions/action-create.tsx',
    'features/actions/action-join.tsx',
    'features/actions/mobile-actions-service.ts',
    'features/actions/use-action-create-controller.ts',
  ],
  tracking: [
    'features/tracking/mission-active-map.tsx',
    'features/tracking/mission-finalization.tsx',
    'features/tracking/tracking-service.ts',
    'features/tracking/use-companion-mission-controller.ts',
    'features/tracking/mission.ts',
  ],
  signalements: [
    'features/signalements/signalement.tsx',
    'features/signalements/signalement-media-service.ts',
  ],
  account: [
    'features/account/account.tsx',
    'features/account/emergency-contact-service.ts',
    'features/account/emergency-contact.tsx',
    'features/account/mobile-account-service.ts',
    'features/account/use-account-controller.ts',
  ],
  navigation: [
    'navigation/mobile-shell.tsx',
    'navigation/mobile-shell-contract.ts',
    'navigation/planned-capabilities.tsx',
    'navigation/planned-capabilities-contract.ts',
  ],
  shared: [
    'shared/lib/mobile-api-client.ts',
    'shared/lib/mobile-environment.ts',
    'shared/lib/storage.ts',
    'shared/lib/supabase.ts',
    'shared/ui/mobile-form-field.tsx',
  ],
} as const

const movedFrom = [
  'screens/account.tsx',
  'screens/action-create.tsx',
  'screens/action-join.tsx',
  'screens/emergency-call-actions.tsx',
  'screens/emergency-contact.tsx',
  'screens/mission-active-map.tsx',
  'screens/mission-finalization.tsx',
  'screens/mobile-shell.tsx',
  'screens/signalement.tsx',
  'hooks/use-account-controller.ts',
  'hooks/use-action-create-controller.ts',
  'hooks/use-companion-mission-controller.ts',
  'lib/emergency-contact.ts',
  'lib/gps-point-identity.ts',
  'lib/linked-mission-service.ts',
  'lib/mobile-actions-service.ts',
  'lib/mobile-account-service.ts',
  'lib/mobile-api-client.ts',
  'lib/mobile-environment.ts',
  'lib/mobile-form-field.tsx',
  'lib/mission-summary.ts',
  'lib/pending-gps-point-polling.ts',
  'lib/signalement-media-service.ts',
  'lib/storage.ts',
  'lib/supabase.ts',
  'lib/track-geometry.ts',
  'lib/tracking-service.ts',
  'types/emergency-contact.ts',
  'types/mission.ts',
] as const

function codeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (['vendor', 'node_modules', 'design-reference', 'security'].includes(entry.name)) return []
      return codeFiles(absolutePath)
    }
    return /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name) ? [absolutePath] : []
  })
}

function resolvesRelativeModule(sourceFile: string, specifier: string): boolean {
  const candidate = resolve(dirname(sourceFile), specifier)
  if (existsSync(candidate) && statSync(candidate).isFile()) return true
  const sourceExtension = extname(candidate)
  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'].includes(sourceExtension)) return false
  return ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'].some((extension) =>
    existsSync(`${candidate}${extension}`),
  )
}

describe('mobile architecture boundaries', () => {
  it('keeps each moved responsibility under one concrete owner', () => {
    for (const files of Object.values(ownerFiles)) {
      for (const file of files) {
        expect(existsSync(join(mobileRoot, file)), file).toBe(true)
      }
    }

    for (const oldPath of movedFrom) {
      expect(existsSync(join(mobileRoot, oldPath)), oldPath).toBe(false)
    }
  })

  it('keeps the Expo entrypoint and documentation on the new boundaries', () => {
    const appSource = readFileSync(join(mobileRoot, 'App.tsx'), 'utf8')
    const readme = readFileSync(join(mobileRoot, 'README.md'), 'utf8')

    expect(appSource).toContain('./navigation/mobile-shell')
    expect(appSource).toContain('./features/tracking/mission-active-map')
    expect(appSource).toContain('./shared/lib/mobile-environment')
    expect(readme).toContain('./features/tracking/tracking-service.ts')
    expect(readme).toContain('./shared/lib/storage.ts')
    expect(readme).toContain('./navigation/mobile-shell.tsx')
  })

  it('rejects imports and static paths that still target moved legacy folders', () => {
    const legacyRelativePath = /["'`](?:\.\.\/|\.\/)(?:screens|hooks|lib|types)\//

    for (const sourceFile of codeFiles(mobileRoot)) {
      if (['vitest.config.ts', 'eslint.config.mjs', 'app.config.js'].some((name) => sourceFile.endsWith(name))) continue
      const source = readFileSync(sourceFile, 'utf8')
      expect(source, relative(mobileRoot, sourceFile)).not.toMatch(legacyRelativePath)
    }
  })

  it('resolves every relative module or source path in mobile code', () => {
    const relativeLiteral = /["'`](\.{1,2}\/[^"'`\\\r\n]+)["'`]/g

    for (const sourceFile of codeFiles(mobileRoot)) {
      if (['vitest.config.ts', 'eslint.config.mjs', 'app.config.js'].some((name) => sourceFile.endsWith(name))) continue
      const source = readFileSync(sourceFile, 'utf8')
      if (sourceFile.endsWith('mobile-architecture-contract.test.ts')) continue
      for (const match of source.matchAll(relativeLiteral)) {
        expect(
          resolvesRelativeModule(sourceFile, match[1]),
          `${relative(mobileRoot, sourceFile)} -> ${match[1]}`,
        ).toBe(true)
      }
    }
  })
})
