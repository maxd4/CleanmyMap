import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const minimumNode = [22, 12, 0]

function commandAvailable(command) {
  const lookup = process.platform === 'win32' ? 'where.exe' : 'which'
  try {
    execFileSync(lookup, [command], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function commandOutput(command, args) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

function versionAtLeast(actual, expected) {
  for (let index = 0; index < expected.length; index += 1) {
    if ((actual[index] ?? 0) > expected[index]) return true
    if ((actual[index] ?? 0) < expected[index]) return false
  }
  return true
}

export function evaluatePreflight({
  nodeVersion,
  hasAgentDevice,
  hasAdb,
  hasEmulator,
  avds = [],
  devices = [],
}) {
  const missing = []
  const hasConnectedDevice = devices.length > 0
  const canBootEmulator = hasEmulator && avds.length > 0

  if (!versionAtLeast(nodeVersion, minimumNode)) missing.push('Node.js >= 22.12 requis par agent-device')
  if (!hasAgentDevice) missing.push('agent-device absent du PATH (installation utilisateur requise)')
  if (!hasAdb) missing.push('adb absent du PATH (Android SDK Platform Tools requis)')

  // A connected ADB device is a complete Android target. The emulator and an
  // AVD are only required when the workflow needs to boot a target itself.
  if (!hasConnectedDevice && !canBootEmulator) {
    if (!hasEmulator) missing.push('emulator absent du PATH et aucun appareil Android connecté')
    else if (avds.length === 0) missing.push('aucun AVD Android et aucun appareil Android connecté')
  }

  let status = 'BLOCKED'
  if (missing.length === 0) status = hasConnectedDevice ? 'READY' : 'READY_TO_BOOT'

  return {
    status,
    missing,
    next: status === 'READY_TO_BOOT' ? `agent-device boot --platform android --device ${avds[0]}` : null,
  }
}

function collectEnvironment() {
  const nodeVersion = process.versions.node.split('.').map(Number)
  const hasAgentDevice = commandAvailable('agent-device')
  const hasAdb = commandAvailable('adb')
  const hasEmulator = commandAvailable('emulator')
  const avds = hasEmulator ? commandOutput('emulator', ['-list-avds']).split(/\r?\n/).map((value) => value.trim()).filter(Boolean) : []
  const devices = hasAdb ? commandOutput('adb', ['devices']).split(/\r?\n/).filter((line) => /\tdevice$/.test(line)).map((line) => line.split('\t')[0]) : []
  return { nodeVersion, hasAgentDevice, hasAdb, hasEmulator, avds, devices }
}

export function runPreflight(environment = collectEnvironment()) {
  const result = evaluatePreflight(environment)

  console.log(`NODE_VERSION: ${process.versions.node}`)
  console.log(`AGENT_DEVICE: ${environment.hasAgentDevice ? 'FOUND' : 'MISSING'}`)
  console.log(`ADB: ${environment.hasAdb ? 'FOUND' : 'MISSING'}`)
  console.log(`ANDROID_EMULATOR: ${environment.hasEmulator ? 'FOUND' : 'MISSING'}`)
  console.log(`AVDS: ${environment.avds.length > 0 ? environment.avds.join(', ') : 'NONE'}`)
  console.log(`ONLINE_ANDROID_DEVICES: ${environment.devices.length > 0 ? environment.devices.join(', ') : 'NONE'}`)
  console.log(`UI_PREFLIGHT: ${result.status}`)
  for (const reason of result.missing) console.log(`BLOCKER: ${reason}`)
  if (result.next) console.log(`NEXT: ${result.next}`)

  if (result.status === 'BLOCKED') process.exitCode = 1
  return result
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) runPreflight()
