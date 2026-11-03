import { execFileSync } from 'node:child_process'

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

const nodeVersion = process.versions.node.split('.').map(Number)
const hasAgentDevice = commandAvailable('agent-device')
const hasAdb = commandAvailable('adb')
const hasEmulator = commandAvailable('emulator')
const avds = hasEmulator ? commandOutput('emulator', ['-list-avds']).split(/\r?\n/).map((value) => value.trim()).filter(Boolean) : []
const devices = hasAdb ? commandOutput('adb', ['devices']).split(/\r?\n/).filter((line) => /\tdevice$/.test(line)).map((line) => line.split('\t')[0]) : []
const missing = []

if (!versionAtLeast(nodeVersion, minimumNode)) missing.push('Node.js >= 22.12 requis par agent-device')
if (!hasAgentDevice) missing.push('agent-device absent du PATH (installation utilisateur requise)')
if (!hasAdb) missing.push('adb absent du PATH (Android SDK Platform Tools requis)')
if (!hasEmulator) missing.push('emulator absent du PATH (Android SDK Emulator requis)')
if (hasAdb && hasEmulator && avds.length === 0 && devices.length === 0) missing.push('aucun AVD Android et aucun appareil Android connecté')

console.log(`NODE_VERSION: ${process.versions.node}`)
console.log(`AGENT_DEVICE: ${hasAgentDevice ? 'FOUND' : 'MISSING'}`)
console.log(`ADB: ${hasAdb ? 'FOUND' : 'MISSING'}`)
console.log(`ANDROID_EMULATOR: ${hasEmulator ? 'FOUND' : 'MISSING'}`)
console.log(`AVDS: ${avds.length > 0 ? avds.join(', ') : 'NONE'}`)
console.log(`ONLINE_ANDROID_DEVICES: ${devices.length > 0 ? devices.join(', ') : 'NONE'}`)

if (missing.length > 0) {
  console.log('UI_PREFLIGHT: BLOCKED')
  for (const reason of missing) console.log(`BLOCKER: ${reason}`)
  process.exitCode = 1
} else if (devices.length > 0) {
  console.log('UI_PREFLIGHT: READY')
} else {
  console.log('UI_PREFLIGHT: READY_TO_BOOT')
  console.log(`NEXT: agent-device boot --platform android --device ${avds[0]}`)
}
