import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const shellSource = readFileSync(resolve(__dirname, '../screens/mobile-shell.tsx'), 'utf8')
const profileSource = readFileSync(resolve(__dirname, '../screens/emergency-contact.tsx'), 'utf8')
const callSource = readFileSync(resolve(__dirname, '../screens/emergency-call-actions.tsx'), 'utf8')
const appSource = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8')
const storageSource = readFileSync(resolve(__dirname, '../lib/storage.ts'), 'utf8')

describe('mobile emergency contact UI contract', () => {
  it('replaces the profile placeholder with a local editable surface', () => {
    expect(shellSource).toContain('<EmergencyContactPanel />')
    expect(shellSource).not.toContain("Emplacement réservé pour un futur lot")
    expect(profileSource).toContain('saveStoredEmergencyContact')
    expect(profileSource).toContain('clearStoredEmergencyContact')
    expect(profileSource).toContain('MODIFIER')
    expect(profileSource).toContain('SUPPRIMER')
    expect(storageSource).toContain('SecureStore.setItemAsync')
    expect(storageSource).toContain('EMERGENCY_CONTACT_KEY')
  })

  it('only opens emergency calls after confirmation through tel URLs', () => {
    expect(appSource).toContain('<EmergencyCallActions />')
    expect(callSource).toContain("'Confirmer l’appel'")
    expect(callSource).toContain('tel:')
    expect(callSource).toContain('APPELER MON CONTACT D’URGENCE')
    expect(callSource).toContain('APPELER LE 112')
    expect(callSource).not.toContain('getCurrentPosition')
    expect(callSource).not.toContain('saveLocationPoint')
  })
})
