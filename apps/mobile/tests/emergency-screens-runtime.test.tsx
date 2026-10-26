import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callTestHandler } from './test-renderer-helpers'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  saveContact: vi.fn(),
  clearContact: vi.fn(),
  alert: vi.fn(),
  openURL: vi.fn(),
  secureValues: new Map<string, string>(),
  secureReadError: null as Error | null,
  secureWriteError: null as Error | null,
  secureDeleteError: null as Error | null,
}))

function nativeComponent(name: string) {
  return function NativeComponent({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) {
    return React.createElement(name, props, children)
  }
}

vi.mock('react-native', () => ({
  ActivityIndicator: nativeComponent('ActivityIndicator'),
  Alert: { alert: state.alert },
  Linking: { openURL: state.openURL },
  Platform: { OS: 'android' },
  StyleSheet: { create: (styles: unknown) => styles },
  Text: nativeComponent('Text'),
  TextInput: nativeComponent('TextInput'),
  TouchableOpacity: nativeComponent('TouchableOpacity'),
  View: nativeComponent('View'),
}))

vi.mock('@expo/vector-icons', () => ({ Ionicons: nativeComponent('Ionicons') }))
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => {
    if (state.secureReadError) throw state.secureReadError
    return state.secureValues.get(key) ?? null
  }),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    if (state.secureWriteError) throw state.secureWriteError
    state.secureValues.set(key, value)
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    if (state.secureDeleteError) throw state.secureDeleteError
    state.secureValues.delete(key)
  }),
}))
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}))
vi.mock('../lib/supabase', () => ({
  getAuthenticatedSupabaseClient: vi.fn(async () => null),
  getClerkUserId: vi.fn(async () => null),
}))
vi.mock('../lib/emergency-contact', () => ({
  getDialablePhone: (phone: string) => {
    const trimmed = phone.trim()
    return `${trimmed.startsWith('+') ? '+' : ''}${trimmed.replace(/\D/g, '')}`
  },
  hasEmergencyContact: (contact: { name?: string; relation?: string; phone?: string } | null) => contact !== null && Object.keys({
    ...(!contact.name?.trim() ? { name: true } : {}),
    ...(!contact.relation?.trim() ? { relation: true } : {}),
    ...(!contact.phone?.trim() ? { phone: true } : {}),
  }).length === 0,
  validateEmergencyContact: (contact: { name: string; relation: string; phone: string }) => ({
    ...(!contact.name.trim() ? { name: 'Nom requis.' } : {}),
    ...(!contact.relation.trim() ? { relation: 'Relation requise.' } : {}),
    ...(!contact.phone.trim() ? { phone: 'Numéro requis.' } : {}),
  }),
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
    state.secureValues.clear()
    state.secureReadError = null
    state.saveContact.mockReset()
    state.clearContact.mockReset()
    state.alert.mockReset()
    state.openURL.mockReset().mockResolvedValue(undefined)
    state.secureWriteError = null
    state.secureDeleteError = null
  })

  function findButton(renderer: TestRenderer.ReactTestRenderer, label: string) {
    return renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity').find((node) => textContent(node).includes(label))
  }

  it('renders a stored emergency contact after a successful read', async () => {
    state.secureValues.set('cmm_emergency_contact', JSON.stringify({ name: 'Ada', relation: 'amie', phone: '0612345678' }))
    let renderer!: TestRenderer.ReactTestRenderer

    await act(async () => {
      renderer = TestRenderer.create(<EmergencyCallActions />)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(renderer.root.findAll((node) => textContent(node).includes('APPELER MON CONTACT D’URGENCE'))).not.toHaveLength(0)
  })

  it('keeps the 112 action visible and explains a contact read failure', async () => {
    state.secureReadError = new Error('SecureStore unavailable')
    let renderer!: TestRenderer.ReactTestRenderer

    await act(async () => {
      renderer = TestRenderer.create(<EmergencyCallActions />)
      await settleEffect()
    })

    expect(textContent(renderer.root)).toContain('Contact d’urgence indisponible sur cet appareil.')
    expect(textContent(renderer.root)).toContain('APPELER LE 112')
  })

  it('shows a contact read failure in compact mode while keeping 112 available', async () => {
    state.secureReadError = new Error('SecureStore unavailable')
    let renderer!: TestRenderer.ReactTestRenderer

    await act(async () => {
      renderer = TestRenderer.create(<EmergencyCallActions compact />)
      await settleEffect()
    })

    expect(textContent(renderer.root)).toContain('Contact d’urgence indisponible sur cet appareil.')
    expect(renderer.root.findByProps({ accessibilityLabel: 'Appeler le 112' })).toBeDefined()
  })

  it('stops loading and exposes a retry path when the contact cannot be read', async () => {
    state.secureReadError = new Error('SecureStore unavailable')
    let renderer!: TestRenderer.ReactTestRenderer

    await act(async () => {
      renderer = TestRenderer.create(<EmergencyContactPanel />)
      await settleEffect()
    })

    expect(textContent(renderer.root)).toContain('Impossible de lire le contact sur cet appareil.')
    expect(textContent(renderer.root)).toContain('AJOUTER UN CONTACT')
    expect(renderer.root.findAll((node) => String(node.type) === 'ActivityIndicator')).toHaveLength(0)
  })

  it('creates and persists a validated private contact from the real editor', async () => {
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<EmergencyContactPanel />)
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => { await callTestHandler(findButton(renderer, 'AJOUTER UN CONTACT'), 'onPress') })
    await act(async () => {
      callTestHandler(renderer.root.findByProps({ placeholder: 'Ex. Marie Dupont' }), 'onChangeText', '  Ada Lovelace  ')
      callTestHandler(renderer.root.findByProps({ placeholder: 'Ex. sœur, ami, parent' }), 'onChangeText', '  amie  ')
      callTestHandler(renderer.root.findByProps({ placeholder: 'Ex. 06 12 34 56 78' }), 'onChangeText', ' 06 12 34 56 78 ')
    })
    await act(async () => { await callTestHandler(findButton(renderer, 'ENREGISTRER'), 'onPress') })

    expect(state.secureValues.get('cmm_emergency_contact')).toBe(JSON.stringify({ name: 'Ada Lovelace', relation: 'amie', phone: '06 12 34 56 78' }))
    expect(textContent(renderer.root)).toContain('Ada Lovelace')
    expect(textContent(renderer.root)).toContain('06 12 34 56 78')
    expect(textContent(renderer.root)).not.toContain('Nom requis.')
  })

  it('rejects an incomplete contact before writing local secure storage', async () => {
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<EmergencyContactPanel />)
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => { await callTestHandler(findButton(renderer, 'AJOUTER UN CONTACT'), 'onPress') })
    await act(async () => { await callTestHandler(findButton(renderer, 'ENREGISTRER'), 'onPress') })

    expect(textContent(renderer.root)).toContain('Nom requis.')
    expect(state.secureValues.has('cmm_emergency_contact')).toBe(false)
  })

  it('keeps the editor visible and the draft intact when secure storage rejects a save', async () => {
    state.secureWriteError = new Error('quota')
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<EmergencyContactPanel />)
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => { await callTestHandler(findButton(renderer, 'AJOUTER UN CONTACT'), 'onPress') })
    await act(async () => {
      callTestHandler(renderer.root.findByProps({ placeholder: 'Ex. Marie Dupont' }), 'onChangeText', 'Ada')
      callTestHandler(renderer.root.findByProps({ placeholder: 'Ex. sœur, ami, parent' }), 'onChangeText', 'amie')
      callTestHandler(renderer.root.findByProps({ placeholder: 'Ex. 06 12 34 56 78' }), 'onChangeText', '0612345678')
    })
    await act(async () => { await callTestHandler(findButton(renderer, 'ENREGISTRER'), 'onPress') })

    expect(textContent(renderer.root)).toContain('Impossible d’enregistrer le contact sur cet appareil.')
    expect(renderer.root.findByProps({ placeholder: 'Ex. Marie Dupont' }).props.value).toBe('Ada')
    expect(textContent(renderer.root)).toContain('ENREGISTRER')
  })

  it('edits a saved contact and deletes it only after explicit confirmation', async () => {
    state.secureValues.set('cmm_emergency_contact', JSON.stringify({ name: 'Ada', relation: 'amie', phone: '0612345678' }))
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<EmergencyContactPanel />)
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => { await callTestHandler(findButton(renderer, 'MODIFIER'), 'onPress') })
    await act(async () => {
      callTestHandler(renderer.root.findByProps({ placeholder: 'Ex. 06 12 34 56 78' }), 'onChangeText', '+33 6 12 34 56 78')
    })
    await act(async () => { await callTestHandler(findButton(renderer, 'ENREGISTRER'), 'onPress') })
    expect(state.secureValues.get('cmm_emergency_contact')).toBe(JSON.stringify({ name: 'Ada', relation: 'amie', phone: '+33 6 12 34 56 78' }))

    await act(async () => { await callTestHandler(findButton(renderer, 'SUPPRIMER'), 'onPress') })
    const actions = state.alert.mock.calls.at(-1)?.[2] as Array<{ text: string; onPress?: () => void }>
    expect(actions.map((action) => action.text)).toEqual(['Annuler', 'Supprimer'])
    expect(state.secureValues.has('cmm_emergency_contact')).toBe(true)
    await act(async () => { await actions.find((action) => action.text === 'Supprimer')?.onPress?.(); await Promise.resolve() })
    expect(state.secureValues.has('cmm_emergency_contact')).toBe(false)
    expect(textContent(renderer.root)).toContain('AJOUTER UN CONTACT')
  })

  it('reports a local deletion failure without losing the displayed contact', async () => {
    state.secureValues.set('cmm_emergency_contact', JSON.stringify({ name: 'Ada', relation: 'amie', phone: '0612345678' }))
    state.secureDeleteError = new Error('secure store unavailable')
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<EmergencyContactPanel />)
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => { await callTestHandler(findButton(renderer, 'SUPPRIMER'), 'onPress') })
    const actions = state.alert.mock.calls.at(-1)?.[2] as Array<{ text: string; onPress?: () => void }>
    await act(async () => { await actions.find((action) => action.text === 'Supprimer')?.onPress?.(); await Promise.resolve() })

    expect(textContent(renderer.root)).toContain('Impossible de supprimer le contact sur cet appareil.')
    expect(textContent(renderer.root)).toContain('Ada')
  })

  it('opens the dialer only after confirmation and normalizes the stored phone', async () => {
    state.secureValues.set('cmm_emergency_contact', JSON.stringify({ name: 'Ada', relation: 'amie', phone: '+33 (0)6 12 34 56 78' }))
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<EmergencyCallActions />)
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => { await callTestHandler(renderer.root.findByProps({ accessibilityLabel: 'Appeler mon contact d’urgence' }), 'onPress') })
    const actions = state.alert.mock.calls.at(-1)?.[2] as Array<{ text: string; onPress?: () => void }>
    expect(state.openURL).not.toHaveBeenCalled()
    await act(async () => { await actions.find((action) => action.text === 'Appeler')?.onPress?.(); await Promise.resolve() })
    expect(state.openURL).toHaveBeenCalledWith('tel:+330612345678')
  })

  it('keeps the emergency number available when opening the dialer fails', async () => {
    state.openURL.mockRejectedValueOnce(new Error('dialer unavailable'))
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<EmergencyCallActions compact />)
      await Promise.resolve()
      await Promise.resolve()
    })
    await act(async () => { await callTestHandler(renderer.root.findByProps({ accessibilityLabel: 'Appeler le 112' }), 'onPress') })
    const actions = state.alert.mock.calls.at(-1)?.[2] as Array<{ text: string; onPress?: () => void }>
    await act(async () => { await actions.find((action) => action.text === 'Appeler')?.onPress?.(); await Promise.resolve() })
    expect(state.openURL).toHaveBeenCalledWith('tel:112')
    expect(state.alert).toHaveBeenCalledWith('Appel impossible', expect.any(String))
  })

  it('renders the compact contact action only when a valid stored contact exists', async () => {
    state.secureValues.set('cmm_emergency_contact', JSON.stringify({ name: '', relation: 'amie', phone: '0612345678' }))
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<EmergencyCallActions compact />)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(renderer.root.findAll((node) => node.props.accessibilityLabel === 'Appeler le contact d’urgence')).toHaveLength(0)
    expect(renderer.root.findByProps({ accessibilityLabel: 'Appeler le 112' })).toBeDefined()
  })
})
