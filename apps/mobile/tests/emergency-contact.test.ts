import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ values: new Map<string, string>() }))

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }))

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}))

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => state.values.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    state.values.set(key, value)
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    state.values.delete(key)
  }),
}))

vi.mock('../lib/supabase', () => ({
  getAuthenticatedSupabaseClient: vi.fn(async () => null),
}))

import * as SecureStore from 'expo-secure-store'
import {
  clearStoredEmergencyContact,
  getStoredEmergencyContact,
  saveStoredEmergencyContact,
} from '../lib/storage'
import { getDialablePhone, validateEmergencyContact } from '../lib/emergency-contact'

describe('mobile emergency contact', () => {
  beforeEach(() => {
    state.values.clear()
    vi.clearAllMocks()
  })

  it('accepts a normal phone and creates a native dial string', () => {
    const contact = { name: 'Marie Dupont', relation: 'Sœur', phone: '06 12 34 56 78' }

    expect(validateEmergencyContact(contact)).toEqual({})
    expect(getDialablePhone('+33 (0)6 12 34 56 78')).toBe('+330612345678')
  })

  it('rejects missing identity fields and malformed phone numbers', () => {
    expect(validateEmergencyContact({ name: '', relation: '', phone: 'abc' })).toEqual({
      name: 'Nom requis.',
      relation: 'Relation requise.',
      phone: 'Numéro de téléphone invalide.',
    })
  })

  it('persists one contact with SecureStore and supports deletion', async () => {
    const contact = { name: 'Marie Dupont', relation: 'Sœur', phone: '06 12 34 56 78' }

    await saveStoredEmergencyContact(contact)

    await expect(getStoredEmergencyContact()).resolves.toEqual(contact)
    expect(SecureStore.setItemAsync).toHaveBeenCalledOnce()
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('cmm_emergency_contact', JSON.stringify(contact))

    await clearStoredEmergencyContact()

    await expect(getStoredEmergencyContact()).resolves.toBeNull()
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('cmm_emergency_contact')
  })
})
