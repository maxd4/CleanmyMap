import type { EmergencyContact } from '../types/emergency-contact'

export type EmergencyContactField = keyof EmergencyContact

export function validateEmergencyContact(contact: EmergencyContact): Partial<Record<EmergencyContactField, string>> {
  const errors: Partial<Record<EmergencyContactField, string>> = {}

  if (!contact.name.trim()) errors.name = 'Nom requis.'
  else if (contact.name.trim().length > 80) errors.name = 'Nom trop long.'

  if (!contact.relation.trim()) errors.relation = 'Relation requise.'
  else if (contact.relation.trim().length > 50) errors.relation = 'Relation trop longue.'

  const phone = contact.phone.trim()
  const digits = phone.replace(/\D/g, '')
  if (!phone) errors.phone = 'Numéro requis.'
  else if (!/^[+]?[0-9\s().-]+$/.test(phone) || digits.length < 8 || digits.length > 15) {
    errors.phone = 'Numéro de téléphone invalide.'
  }

  return errors
}

export function getDialablePhone(phone: string): string {
  const trimmed = phone.trim()
  const prefix = trimmed.startsWith('+') ? '+' : ''
  return `${prefix}${trimmed.replace(/\D/g, '')}`
}

export function hasEmergencyContact(contact: EmergencyContact | null): contact is EmergencyContact {
  return contact !== null && Object.keys(validateEmergencyContact(contact)).length === 0
}
