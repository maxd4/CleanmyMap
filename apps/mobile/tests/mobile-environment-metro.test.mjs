import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const mobileRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const require = createRequire(import.meta.url)
const expoCli = require.resolve('expo/bin/cli', { paths: [mobileRoot] })
const outputDirectory = mkdtempSync(join(tmpdir(), 'cleanmymap-mobile-metro-'))
const fakePublicEnvironment = {
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_metro_static',
  EXPO_PUBLIC_SUPABASE_URL: 'https://supabase.metro.example',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon_metro_static',
  EXPO_PUBLIC_WEB_APP_URL: 'https://api.metro.example',
  EXPO_PUBLIC_WEB_URL: 'https://web.metro.example',
}

function collectJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) return collectJavaScriptFiles(entryPath)
    return /\.(?:js|map)$/.test(entry.name) ? [entryPath] : []
  })
}

try {
  execFileSync(
    process.execPath,
    [
      expoCli,
      'export',
      '--platform',
      'android',
      '--output-dir',
      outputDirectory,
      '--clear',
      '--no-minify',
      '--no-bytecode',
    ],
    {
      cwd: mobileRoot,
      env: { ...process.env, ...fakePublicEnvironment },
      stdio: 'inherit',
    },
  )

  const bundles = collectJavaScriptFiles(outputDirectory)
  assert.ok(bundles.length > 0, 'Expo export did not produce a JavaScript bundle')
  const bundle = bundles.map((filePath) => readFileSync(filePath, 'utf8')).join('\n')

  for (const value of Object.values(fakePublicEnvironment)) {
    assert.ok(bundle.includes(value), `Expo bundle is missing injected value: ${value}`)
  }
  assert.doesNotMatch(bundle, /globalThis\.process\?\.env\?\./)
  assert.doesNotMatch(bundle, /environment\?\.\[name\]/)
  console.log(`Metro Expo injection proof passed (${bundles.map((filePath) => relative(outputDirectory, filePath)).join(', ')})`)
} finally {
  rmSync(outputDirectory, { recursive: true, force: true })
}
