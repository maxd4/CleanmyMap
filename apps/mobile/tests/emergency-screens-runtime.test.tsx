import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  readContact: vi.fn(),
  saveContact: vi.fn(),
  clearContact: vi.fn(),
  alert: vi.fn(),
}))

function nativeComponent(name: string) {
  return function NativeComponent({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) {
    return React.createElement(name, props, children)
  }
}

vi.mock('react-native', () => ({
  ActivityIndicator: nativeComponent('ActivityIndicator'),
  Alert: { alert: state.alert },
  StyleSheet: { create: (styles: unknown) => styles },
  Text: nativeComponent('Text'),
  TextInput: nativeComponent('TextInput'),
  TouchableOpacity: nativeComponent('TouchableOpacity'),
  View: nativeComponent('View'),
}))

vi.mock('@expo/vector-icons', () => ({ Ionicons: nativeComponent('Ionicons') }))
vi.mock('../lib/storage', () => ({
  clearStoredEmergencyContact: state.clearContact,
  getStoredEmergencyContact: state.readContact,
  saveStoredEmergencyContact: state.saveContact,
}))
vi.mock('../lib/emergency-contact', () => ({
  getDialablePhone: (phone: string) => phone,
  hasEmergencyContact: (contact: { phone?: string } | null) => Boolean(contact?.phone),
  validateEmergencyContact: () => ({}),
}))

import { EmergencyCallActions } from '../screens/emergency-call-actions'
import { EmergencyContactPanel } from '../screens/emergency-contact'

function textContent(node: TestRenderer.ReactTestInstance): string {
  return node.children.map((child) => typeof child === 'string' ? child : textContent(child)).join('')
}

async function settleEffect() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('mobile emergency screens', () => {
  beforeEach(() => {
    state.readContact.mockReset()
    state.readContact.mockResolvedValue(null)
    state.saveContact.mockReset()
    state.clearContact.mockReset()
    state.alert.mockReset()
  })

  it('renders a stored emergency contact after a successful read', async () => {
    state.readContact.mockResolvedValue({ name: 'Ada', relation: 'amie', phone: '0612345678' })
    let renderer!: TestRenderer.ReactTestRenderer

    await act(async () => {
      renderer = TestRenderer.create(<EmergencyCallActions />)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(renderer.root.findAll((node) => textContent(node).includes('APPELER MON CONTACT D’URGENCE'))).not.toHaveLength(0)
  })

  it('keeps the 112 action visible and explains a contact read failure', async () => {
    state.readContact.mockRejectedValue(new Error('SecureStore unavailable'))
    let renderer!: TestRenderer.ReactTestRenderer

    await act(async () => {
      renderer = TestRenderer.create(<EmergencyCallActions />)
      await settleEffect()
    })

    expect(textContent(renderer.root)).toContain('Contact d’urgence indisponible sur cet appareil.')
    expect(textContent(renderer.root)).toContain('APPELER LE 112')
  })

  it('stops loading and exposes a retry path when the contact cannot be read', async () => {
    state.readContact.mockRejectedValue(new Error('SecureStore unavailable'))
    let renderer!: TestRenderer.ReactTestRenderer

    await act(async () => {
      renderer = TestRenderer.create(<EmergencyContactPanel />)
      await settleEffect()
    })

    expect(textContent(renderer.root)).toContain('Impossible de lire le contact sur cet appareil.')
    expect(textContent(renderer.root)).toContain('AJOUTER UN CONTACT')
    expect(renderer.root.findAll((node) => String(node.type) === 'ActivityIndicator')).toHaveLength(0)
  })
})
