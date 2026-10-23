import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

type JsonObject = Record<string, unknown>

function asObject(value: unknown, label: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as JsonObject
}

function readJsonObject(path: string): JsonObject {
  return asObject(JSON.parse(readFileSync(path, 'utf8')) as unknown, path)
}

const appConfig = asObject(readJsonObject(resolve(mobileRoot, 'app.json')).expo, 'app.json.expo')
const easConfig = readJsonObject(resolve(mobileRoot, 'eas.json'))
const packageConfig = readJsonObject(resolve(mobileRoot, 'package.json'))
const appAndroid = asObject(appConfig.android, 'app.json.expo.android')
const appIos = asObject(appConfig.ios, 'app.json.expo.ios')
const appExtra = asObject(appConfig.extra, 'app.json.expo.extra')
const easCli = asObject(easConfig.cli, 'eas.json.cli')
const easBuild = asObject(easConfig.build, 'eas.json.build')
const easDevelopment = asObject(easBuild.development, 'eas.json.build.development')
const easPreview = asObject(easBuild.preview, 'eas.json.build.preview')
const packageDependencies = asObject(packageConfig.dependencies, 'package.json.dependencies')
const appPlugins = Array.isArray(appConfig.plugins) ? (appConfig.plugins as unknown[]) : []
const dynamicConfig = readFileSync(resolve(mobileRoot, 'app.config.js'), 'utf8')

function pluginOptions(plugin: unknown): unknown {
  return Array.isArray(plugin) ? (plugin as unknown[])[1] : undefined
}

describe('mobile distributable configuration', () => {
  it('keeps the product name and durable native identifiers stable', () => {
    expect(appConfig.owner).toBe('maxdie')
    expect(appConfig.name).toBe('CleanMyMap')
    expect(appConfig.slug).toBe('clean-my-map')
    expect(appConfig.scheme).toBe('companion')
    expect(appAndroid.package).toBe('fr.cleanmymap.app')
    expect(appIos.bundleIdentifier).toBe('fr.cleanmymap.app')
    expect(appConfig.version).toBe('1.0.0')
    expect(appAndroid.versionCode).toBe(1)
    expect(appIos.buildNumber).toBe('1')
    expect(appConfig.userInterfaceStyle).toBe('dark')
  })

  it('does not advertise an unimplemented HTTPS incoming-link surface', () => {
    expect(appAndroid.intentFilters).toBeUndefined()
    expect(appIos.associatedDomains).toBeUndefined()
    expect(appConfig.scheme).toBe('companion')
  })

  it('keeps the minimum location and media permission contract', () => {
    const locationPlugin = appPlugins.find((plugin: unknown) => {
      const tuple = Array.isArray(plugin) ? (plugin as unknown[]) : []
      return tuple[0] === 'expo-location'
    })
    const imagePickerPlugin = appPlugins.find((plugin: unknown) => {
      const tuple = Array.isArray(plugin) ? (plugin as unknown[]) : []
      return tuple[0] === 'expo-image-picker'
    })

    expect(pluginOptions(locationPlugin)).toMatchObject({
      isIosBackgroundLocationEnabled: true,
      isAndroidBackgroundLocationEnabled: true,
      isAndroidForegroundServiceEnabled: true,
    })
    expect(pluginOptions(imagePickerPlugin)).toMatchObject({ microphonePermission: false })
    expect(JSON.stringify(appConfig)).not.toContain('RECORD_AUDIO')
    expect(dynamicConfig).toContain('targetSdkVersion: 36')
    expect(dynamicConfig).toContain('compileSdkVersion: 36')
  })

  it('keeps EAS profiles explicit and local-versioned', () => {
    expect(easCli.appVersionSource).toBe('local')
    expect(easDevelopment).toMatchObject({ developmentClient: true, distribution: 'internal' })
    expect(easPreview).toMatchObject({ distribution: 'internal', android: { buildType: 'apk' } })
    expect(easBuild.production).toBeDefined()
    expect(asObject(appExtra.eas, 'app.json.expo.extra.eas').projectId).toBe('580b0d1c-d5d3-4c42-9b58-4ee7724a6027')
  })

  it('keeps required runtime dependencies and release assets present', () => {
    expect(packageDependencies.expo).toMatch(/^~57\./)
    expect(packageDependencies['@clerk/expo']).toBeTruthy()
    expect(packageDependencies['react-native-maps']).toBeTruthy()
    expect(packageDependencies['react-native-safe-area-context']).toMatch(/^~5\./)
    expect(packageDependencies['react-native-svg']).toBeTruthy()

    for (const asset of ['icon.png', 'adaptive-icon.png', 'splash-icon.png']) {
      expect(existsSync(resolve(mobileRoot, 'assets', asset))).toBe(true)
    }
  })
})
