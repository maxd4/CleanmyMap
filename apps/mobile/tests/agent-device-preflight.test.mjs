import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluatePreflight } from '../scripts/agent-device-preflight.mjs'

const readyBase = {
  nodeVersion: [22, 12, 0],
  hasAgentDevice: true,
  hasAdb: true,
}

test('returns READY for a connected physical Android device without emulator or AVD', () => {
  const result = evaluatePreflight({
    ...readyBase,
    hasEmulator: false,
    avds: [],
    devices: ['R58M123456A'],
  })

  assert.equal(result.status, 'READY')
  assert.deepEqual(result.missing, [])
  assert.equal(result.next, null)
})

test('returns READY_TO_BOOT when an emulator and an AVD are available', () => {
  const result = evaluatePreflight({
    ...readyBase,
    hasEmulator: true,
    avds: ['cleanmymap-api-36'],
    devices: [],
  })

  assert.equal(result.status, 'READY_TO_BOOT')
  assert.deepEqual(result.missing, [])
  assert.equal(result.next, 'agent-device boot --platform android --device cleanmymap-api-36')
})

test('returns BLOCKED when no Android target can be used', () => {
  const result = evaluatePreflight({
    ...readyBase,
    hasEmulator: true,
    avds: [],
    devices: [],
  })

  assert.equal(result.status, 'BLOCKED')
  assert.match(result.missing.join('\n'), /aucun AVD Android et aucun appareil Android connecté/)
})

test('keeps indispensable dependency failures BLOCKED even with a connected device', () => {
  const result = evaluatePreflight({
    ...readyBase,
    hasAgentDevice: false,
    hasEmulator: false,
    avds: [],
    devices: ['R58M123456A'],
  })

  assert.equal(result.status, 'BLOCKED')
  assert.match(result.missing.join('\n'), /agent-device absent/)
})
