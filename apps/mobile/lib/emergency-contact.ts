import type { EmergencyContact } from '../types/emergency-contact'

export type EmergencyContactField = keyof EmergencyContact

const PHONE_FORMAT = /^\+?[0-9\s().-]+$/

function normalizeDialablePhone(phone: string): string | null {
  const trimmed = phone.trim()
  if (!trimmed || !PHONE_FORMAT.test(trimmed)) return null

  const hasInternationalPrefix = trimmed.startsWith('+')
  if (hasInternationalPrefix && !/^\+[0-9]/.test(trimmed)) return null
  const digits = trimmed.replace(/\D/g, '')

  if (digits === '112') return '112'
  if (digits.length < 8 || digits.length > 15) return null

  if (hasInternationalPrefix && digits.startsWith('33')) {
    const frenchNationalDigits = digits.slice(2)
    const withoutOptionalNationalPrefix = frenchNationalDigits.startsWith('0')
      ? frenchNationalDigits.slice(1)
      : frenchNationalDigits

    // +33 6... and +33 (0)6... are the same international number. Require
    // the nine subscriber digits so malformed/corrupted contacts fail closed.
    if (withoutOptionalNationalPrefix.length !== 9) return null
    return `+33${withoutOptionalNationalPrefix}`
  }

  return `${hasInternationalPrefix ? '+' : ''}${digits}`
}

export function validateEmergencyContact(contact: EmergencyContact): Partial<Record<EmergencyContactField, string>> {
  const errors: Partial<Record<EmergencyContactField, string>> = {}

  if (!contact.name.trim()) errors.name = 'Nom requis.'
  else if (contact.name.trim().length > 80) errors.name = 'Nom trop long.'

  if (!contact.relation.trim()) errors.relation = 'Relation requise.'
  else if (contact.relation.trim().length > 50) errors.relation = 'Relation trop longue.'

  const phone = contact.phone.trim()
  const dialablePhone = normalizeDialablePhone(phone)
  if (!phone) errors.phone = 'Numéro requis.'
  else if (!dialablePhone || dialablePhone === '112') {
    errors.phone = 'Numéro de téléphone invalide.'
  }

  return errors
}

export function getDialablePhone(phone: string): string | null {
  return normalizeDialablePhone(phone)
}

export function hasEmergencyContact(contact: EmergencyContact | null): contact is EmergencyContact {
  return contact !== null && Object.keys(validateEmergencyContact(contact)).length === 0
}
