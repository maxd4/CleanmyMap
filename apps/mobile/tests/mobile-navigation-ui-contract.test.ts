import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const shellSource = readFileSync(resolve(__dirname, '../screens/mobile-shell.tsx'), 'utf8')
const accountSource = readFileSync(resolve(__dirname, '../screens/account.tsx'), 'utf8')
const appSource = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8')

describe('mobile native navigation UI contract', () => {
  it('uses one Lucide bottom bar and keeps GPS outside the shell', () => {
    expect(shellSource).toContain("from 'lucide-react-native'")
    expect(shellSource).toContain('accessibilityRole="tablist"')
    expect(shellSource).toContain('accessibilityState={{ selected }}')
    expect(shellSource).toContain('SafeAreaView')
    expect(shellSource).not.toContain('Ionicons')
    expect(appSource).toContain('MissionActiveScreen')
    expect(shellSource).toContain('surface === \'act\' ? styles.visibleSurface : styles.hiddenSubview')
    expect(shellSource).toContain('surface === \'account\' ? styles.visibleSurface : styles.hiddenSubview')
  })

  it('separates the three Agir workflows and the Account hub sections', () => {
    expect(shellSource).toContain("type ActSubview = 'home' | 'join' | 'create' | 'report'")
    expect(shellSource).toContain('Rejoindre une action')
    expect(shellSource).toContain('Créer une action')
    expect(shellSource).toContain('Signaler un déchet')
    for (const label of ['Mon profil', 'Activité et notifications', 'Préférences', 'Rechercher', 'Aide et feedback', 'À propos et informations légales']) {
      expect(accountSource).toContain(label)
    }
    expect(accountSource).toContain("section === 'profile'")
    expect(accountSource).toContain("section === 'activity'")
  })
})
