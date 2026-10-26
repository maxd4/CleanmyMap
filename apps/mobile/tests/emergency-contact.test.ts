import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAsyncStorageMock, createSecureStoreMock } from './support/persistence-mocks'

const state = vi.hoisted(() => ({ values: new Map<string, string>() }))

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }))

vi.mock('@react-native-async-storage/async-storage', () => ({
  ...createAsyncStorageMock(state),
}))

vi.mock('expo-secure-store', () => createSecureStoreMock(state))

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
    expect(getDialablePhone('06 12 34 56 78')).toBe('0612345678')
    expect(getDialablePhone('+33 6 12 34 56 78')).toBe('+33612345678')
    expect(getDialablePhone('+33 (0)6 12 34 56 78')).toBe('+33612345678')
    expect(validateEmergencyContact({ ...contact, phone: '+33 (0)6 12 34 56 78' })).toEqual({})
  })

  it.each([
    ['01.23.45.67.89', '0123456789'],
    ['+33-1-23-45-67-89', '+33123456789'],
    ['+44 (20) 1234 5678', '+442012345678'],
    ['112', '112'],
  ])('normalizes a supported phone format %s', (input, expected) => {
    expect(getDialablePhone(input)).toBe(expected)
  })

  it.each([
    '',
    'abc',
    '+33 (0)6 12 34',
    '+33 06 12 34 56',
    '+33 +6 12 34 56 78',
    '+ 33 6 12 34 56 78',
    '06 12 34 56 7x',
    '1234567',
  ])('rejects an invalid or ambiguous phone format %s', (input) => {
    expect(getDialablePhone(input)).toBeNull()
  })

  it('does not accept 112 as a private emergency contact number', () => {
    expect(validateEmergencyContact({ name: 'Secours', relation: 'service', phone: '112' })).toEqual({
      phone: 'Numéro de téléphone invalide.',
    })
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

  it('keeps an empty SecureStore distinct from a failed read', async () => {
    await expect(getStoredEmergencyContact()).resolves.toBeNull()

    vi.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('SecureStore unavailable'))

    await expect(getStoredEmergencyContact()).rejects.toThrow('SecureStore unavailable')
  })

  it('treats malformed private contact payloads as absent without rewriting SecureStore', async () => {
    state.values.set('cmm_emergency_contact', JSON.stringify({ name: 'Ada', relation: 'amie', phone: 612345678 }))

    await expect(getStoredEmergencyContact()).resolves.toBeNull()
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled()
  })
})
