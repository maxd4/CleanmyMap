import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const appConfig = JSON.parse(readFileSync(resolve(mobileRoot, 'app.json'), 'utf8')).expo
const easConfig = JSON.parse(readFileSync(resolve(mobileRoot, 'eas.json'), 'utf8'))
const packageConfig = JSON.parse(readFileSync(resolve(mobileRoot, 'package.json'), 'utf8'))
const dynamicConfig = readFileSync(resolve(mobileRoot, 'app.config.js'), 'utf8')

describe('mobile distributable configuration', () => {
  it('keeps the product name and durable native identifiers stable', () => {
    expect(appConfig.owner).toBe('maxdie')
    expect(appConfig.name).toBe('CleanMyMap')
    expect(appConfig.slug).toBe('clean-my-map')
    expect(appConfig.scheme).toBe('companion')
    expect(appConfig.android.package).toBe('fr.cleanmymap.app')
    expect(appConfig.ios.bundleIdentifier).toBe('fr.cleanmymap.app')
    expect(appConfig.version).toBe('1.0.0')
    expect(appConfig.android.versionCode).toBe(1)
    expect(appConfig.ios.buildNumber).toBe('1')
  })

  it('does not advertise an unimplemented HTTPS incoming-link surface', () => {
    expect(appConfig.android.intentFilters).toBeUndefined()
    expect(appConfig.ios.associatedDomains).toBeUndefined()
    expect(appConfig.scheme).toBe('companion')
  })

  it('keeps the minimum location and media permission contract', () => {
    const locationPlugin = appConfig.plugins.find((plugin: unknown) =>
      Array.isArray(plugin) && plugin[0] === 'expo-location',
    )
    const imagePickerPlugin = appConfig.plugins.find((plugin: unknown) =>
      Array.isArray(plugin) && plugin[0] === 'expo-image-picker',
    )

    expect(locationPlugin?.[1]).toMatchObject({
      isIosBackgroundLocationEnabled: true,
      isAndroidBackgroundLocationEnabled: true,
      isAndroidForegroundServiceEnabled: true,
    })
    expect(imagePickerPlugin?.[1]).toMatchObject({ microphonePermission: false })
    expect(JSON.stringify(appConfig)).not.toContain('RECORD_AUDIO')
    expect(dynamicConfig).toContain('targetSdkVersion: 36')
    expect(dynamicConfig).toContain('compileSdkVersion: 36')
  })

  it('keeps EAS profiles explicit and local-versioned', () => {
    expect(easConfig.cli.appVersionSource).toBe('local')
    expect(easConfig.build.development).toMatchObject({ developmentClient: true, distribution: 'internal' })
    expect(easConfig.build.preview).toMatchObject({ distribution: 'internal', android: { buildType: 'apk' } })
    expect(easConfig.build.production).toBeDefined()
    expect(appConfig.extra.eas.projectId).toBe('580b0d1c-d5d3-4c42-9b58-4ee7724a6027')
  })

  it('keeps required runtime dependencies and release assets present', () => {
    expect(packageConfig.dependencies.expo).toMatch(/^~57\./)
    expect(packageConfig.dependencies['@clerk/expo']).toBeTruthy()
    expect(packageConfig.dependencies['react-native-maps']).toBeTruthy()
    expect(packageConfig.dependencies['react-native-svg']).toBeTruthy()

    for (const asset of ['icon.png', 'adaptive-icon.png', 'splash-icon.png']) {
      expect(existsSync(resolve(mobileRoot, 'assets', asset))).toBe(true)
    }
  })
})
