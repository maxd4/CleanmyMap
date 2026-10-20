import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccountData } from '../hooks/use-account-controller'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  loadMobileAccount: vi.fn(),
  updateMobileAccountProfile: vi.fn(),
  updateMobileActiveRole: vi.fn(),
  updateMobileActivityStatus: vi.fn(),
  updateMobileDisplayNameMode: vi.fn(),
  updateMobileNotificationPreferences: vi.fn(),
  requestMobileAccountDeletion: vi.fn(),
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
vi.mock('lucide-react-native', () => ({
  Bell: nativeComponent('Icon'),
  CircleHelp: nativeComponent('Icon'),
  ExternalLink: nativeComponent('Icon'),
  Info: nativeComponent('Icon'),
  Search: nativeComponent('Icon'),
  Settings2: nativeComponent('Icon'),
  UserRound: nativeComponent('Icon'),
}))
vi.mock('../screens/emergency-contact', () => ({ EmergencyContactPanel: () => React.createElement('EmergencyContactPanel') }))
vi.mock('../lib/mobile-account-service', () => ({
  loadMobileAccount: state.loadMobileAccount,
  updateMobileAccountProfile: state.updateMobileAccountProfile,
  updateMobileActiveRole: state.updateMobileActiveRole,
  updateMobileActivityStatus: state.updateMobileActivityStatus,
  updateMobileDisplayNameMode: state.updateMobileDisplayNameMode,
  updateMobileNotificationPreferences: state.updateMobileNotificationPreferences,
  requestMobileAccountDeletion: state.requestMobileAccountDeletion,
}))

import { AccountScreen } from '../screens/account'

const account: AccountData = {
  identity: { userId: 'user-a', displayName: 'Ada Lovelace', displayNameMode: 'full_name', handle: 'ada', firstName: 'Ada', lastName: 'Lovelace', username: 'ada', email: null, grantedRole: 'benevole', activeRole: 'benevole', availableActiveRoles: ['benevole', 'scientifique'], currentLevel: 2 },
  onboarding: { completed: false, version: null, currentVersion: 1 },
  locationPreferences: { residence: null, work: null },
  activityStatus: 'active',
  notifications: { informationalEnabled: true, actionRemindersEnabled: true, mutedInformationActionIds: [] },
  history: [{ id: 'history-1', actionTitle: 'Parc Nord', action_date: '2026-10-01', location_label: 'Paris', actionPhase: 'post_action_complete', participationStatus: 'confirmed', joinedAt: '2026-09-30T10:00:00.000Z' }],
  invitations: [{ registration_id: 'invitation-1', action_title: 'Plage Sud', action_date: '2026-10-12' }],
  missions: [{ id: 'mission-1', label: 'Trace GPS', status: 'completed', action_id: null, created_at: '2026-10-01', started_at: '2026-10-01', ended_at: '2026-10-01', distance_m: null, duration_s: null }],
  createdActions: [{ id: 'created-1', title: 'Action locale', actionDate: '2026-10-20', locationLabel: 'Lyon', status: 'published', actionPhase: 'pre_action', publishedAt: '2026-10-01', createdAt: '2026-09-20' }],
  progression: { validatedActions: 2, verifiedContributions: null, totalKg: 4.5 },
  counts: { registrations: 1, confirmedParticipations: 1, missions: 1, createdActions: 1 },
}

function textContent(node: TestRenderer.ReactTestInstance): string {
  return node.children.map((child) => typeof child === 'string' ? child : textContent(child)).join('')
}

function findButton(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity').find((node) => textContent(node).includes(label))
}

async function settle() {
  await Promise.resolve()
  await Promise.resolve()
}

async function renderScreen(onSessionExpired = vi.fn(), onSignOut = vi.fn(), onOpenWeb = vi.fn()) {
  let renderer!: TestRenderer.ReactTestRenderer
  await act(async () => {
    renderer = TestRenderer.create(<AccountScreen onSignOut={onSignOut} onSessionExpired={onSessionExpired} onOpenWeb={onOpenWeb} />)
    await settle()
  })
  return { renderer, onSessionExpired, onSignOut, onOpenWeb }
}

describe('mobile account screen runtime', () => {
  beforeEach(() => {
    state.loadMobileAccount.mockReset().mockResolvedValue(account)
    state.updateMobileAccountProfile.mockReset().mockResolvedValue({ status: 'ok', account: { ...account, onboarding: { ...account.onboarding, completed: true } } })
    state.updateMobileActiveRole.mockReset().mockResolvedValue({ role: 'benevole', activeRole: 'scientifique', activeProfile: 'scientifique' })
    state.updateMobileActivityStatus.mockReset().mockResolvedValue({ activityStatus: 'inactive' })
    state.updateMobileDisplayNameMode.mockReset().mockResolvedValue({ displayNameMode: 'pseudo', displayName: 'ada' })
    state.updateMobileNotificationPreferences.mockReset().mockResolvedValue({ informationalEnabled: false, actionRemindersEnabled: true, mutedInformationActionIds: [] })
    state.requestMobileAccountDeletion.mockReset().mockResolvedValue({ status: 'queued', requestId: 'deletion-1', notificationStatus: 'sent', deletionProcessed: false, message: 'Demande enregistrée.' })
    state.alert.mockReset()
  })

  it('shows loading, recovers from an error and retries the real screen', async () => {
    let resolveLoad!: (value: AccountData) => void
    state.loadMobileAccount.mockReturnValueOnce(new Promise((resolve) => { resolveLoad = resolve }))
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<AccountScreen onSignOut={vi.fn()} onSessionExpired={vi.fn()} onOpenWeb={vi.fn()} />) })
    expect(renderer.root.findAll((node) => textContent(node).includes('Chargement de votre compte'))).not.toHaveLength(0)
    resolveLoad(account)
    await act(async () => { await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('Votre compte'))).not.toHaveLength(0)

    state.loadMobileAccount.mockRejectedValueOnce(new Error('compte indisponible'))
    await act(async () => { renderer = TestRenderer.create(<AccountScreen onSignOut={vi.fn()} onSessionExpired={vi.fn()} onOpenWeb={vi.fn()} />); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('compte indisponible'))).not.toHaveLength(0)
    state.loadMobileAccount.mockResolvedValueOnce(account)
    await act(async () => { await findButton(renderer, 'Réessayer')?.props.onPress(); await settle() })
    expect(state.loadMobileAccount).toHaveBeenCalledTimes(3)
  })

  it('renders sections, server-owned values and authorized mutations only', async () => {
    const { renderer, onOpenWeb } = await renderScreen()
    expect(renderer.root.findAll((node) => textContent(node).includes('Rôle attribué : Bénévole'))).not.toHaveLength(0)
    expect(renderer.root.findAll((node) => textContent(node).includes('Scientifique'))).not.toHaveLength(0)
    expect(renderer.root.findAll((node) => textContent(node).includes('SUPPRIMER MON COMPTE'))).toHaveLength(0)

    await act(async () => { await findButton(renderer, 'Scientifique')?.props.onPress(); await settle() })
    expect(state.updateMobileActiveRole).toHaveBeenCalledWith('scientifique')
    expect(state.updateMobileActiveRole).not.toHaveBeenCalledWith('admin')

    await act(async () => { await findButton(renderer, 'Activité et notifications')?.props.onPress(); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('Parc Nord'))).not.toHaveLength(0)
    expect(renderer.root.findAll((node) => textContent(node).includes('Trace GPS'))).not.toHaveLength(0)
    expect(renderer.root.findAll((node) => textContent(node).includes('Inconnu'))).not.toHaveLength(0)
    const informationalSwitch = renderer.root.findAll((node) => node.props.accessibilityRole === 'switch')[0]
    await act(async () => { await informationalSwitch?.props.onPress(); await settle() })
    expect(state.updateMobileNotificationPreferences).toHaveBeenCalledWith({ informationalEnabled: false })
    const activitySwitch = renderer.root.findAll((node) => node.props.accessibilityRole === 'switch').at(-1)
    await act(async () => { await activitySwitch?.props.onPress(); await settle() })
    expect(state.updateMobileActivityStatus).toHaveBeenCalledWith('inactive')

    await act(async () => { await findButton(renderer, 'Préférences')?.props.onPress(); await settle() })
    await act(async () => { await findButton(renderer, 'Pseudo')?.props.onPress(); await settle() })
    expect(state.updateMobileDisplayNameMode).toHaveBeenCalledWith('pseudo')
    await act(async () => { await findButton(renderer, 'Ouvrir les réglages web')?.props.onPress() })
    expect(onOpenWeb).toHaveBeenCalledWith('/reglages')

    await act(async () => { await findButton(renderer, 'Rechercher')?.props.onPress(); await settle() })
    await act(async () => { await findButton(renderer, 'Ouvrir la recherche CleanMyMap')?.props.onPress() })
    expect(onOpenWeb).toHaveBeenCalledWith('/explorer')
    await act(async () => { await findButton(renderer, 'Aide et feedback')?.props.onPress(); await settle() })
    await act(async () => { await findButton(renderer, 'Aide et contact')?.props.onPress() })
    expect(onOpenWeb).toHaveBeenCalledWith('/contact')
  })

  it('requires exact deletion confirmation, confirms natively and supports sign-out cancellation', async () => {
    const onSignOut = vi.fn()
    const { renderer } = await renderScreen(vi.fn(), onSignOut)
    await act(async () => { await findButton(renderer, 'À propos et informations légales')?.props.onPress(); await settle() })
    const deletion = renderer.root.findByProps({ accessibilityLabel: 'Confirmation de suppression du compte' })
    const request = findButton(renderer, 'Demander la suppression')
    expect(request?.props.disabled).toBe(true)
    await act(async () => { deletion.props.onChangeText('SUPPRIMER MON COMPTE'); await settle() })
    expect(findButton(renderer, 'Demander la suppression')?.props.disabled).toBe(false)
    await act(async () => { await findButton(renderer, 'Demander la suppression')?.props.onPress() })
    const deletionButtons = state.alert.mock.calls.at(-1)?.[2] as Array<{ text: string; onPress?: () => void }>
    expect(state.alert).toHaveBeenCalledWith('Confirmer la demande', expect.any(String), expect.any(Array))
    await act(async () => { await deletionButtons.find((button) => button.text === 'Envoyer la demande')?.onPress?.(); await settle() })
    expect(state.requestMobileAccountDeletion).toHaveBeenCalledWith('SUPPRIMER MON COMPTE')
    expect(renderer.root.findAll((node) => textContent(node).includes('Demande enregistrée : deletion-1'))).not.toHaveLength(0)

    await act(async () => { await findButton(renderer, 'SE DÉCONNECTER')?.props.onPress() })
    const signOutButtons = state.alert.mock.calls.at(-1)?.[2] as Array<{ text: string; onPress?: () => void }>
    await act(async () => { await signOutButtons.find((button) => button.text === 'Annuler')?.onPress?.() })
    expect(onSignOut).not.toHaveBeenCalled()
  })

  it('covers empty server collections, optional values and every legal web destination', async () => {
    state.loadMobileAccount.mockResolvedValueOnce({
      ...account,
      identity: { ...account.identity, grantedRole: 'role-personnalise', email: null },
      onboarding: { ...account.onboarding, completed: true },
      history: [], missions: [], createdActions: [], invitations: [], progression: null,
    })
    const { renderer, onOpenWeb } = await renderScreen()
    expect(renderer.root.findAll((node) => textContent(node).includes('Rôle attribué : role-personnalise'))).not.toHaveLength(0)
    await act(async () => { await findButton(renderer, 'Activité et notifications')?.props.onPress(); await settle() })
    for (const empty of ['Aucune inscription ou participation enregistrée.', 'Aucune mission GPS dans ce compte.', 'Aucune action organisée depuis ce compte.', 'Aucune invitation en attente.']) {
      expect(renderer.root.findAll((node) => textContent(node).includes(empty))).not.toHaveLength(0)
    }
    await act(async () => { await findButton(renderer, 'Aide et feedback')?.props.onPress(); await settle() })
    await act(async () => { await findButton(renderer, 'Envoyer un feedback')?.props.onPress() })
    expect(onOpenWeb).toHaveBeenCalledWith('/sections/feedback')
    await act(async () => { await findButton(renderer, 'À propos et informations légales')?.props.onPress(); await settle() })
    for (const [label, path] of [['Politique de confidentialité', '/politique-confidentialite'], ['Mentions légales', '/mentions-legales'], ['Réseau CleanMyMap', '/sections/annuaire'], ['Communauté CleanMyMap', '/sections/community'], ['Demander après désinstallation via le site', '/contact']] as const) {
      await act(async () => { await findButton(renderer, label)?.props.onPress() })
      expect(onOpenWeb).toHaveBeenCalledWith(path)
    }
  })

  it('keeps mutation controls disabled while a server update is pending and displays failed deletion notification', async () => {
    let resolveRole!: (value: unknown) => void
    state.updateMobileActiveRole.mockReturnValueOnce(new Promise((resolve) => { resolveRole = resolve }))
    const { renderer } = await renderScreen()
    await act(async () => { void findButton(renderer, 'Scientifique')?.props.onPress(); await settle() })
    expect(renderer.root.findAll((node) => node.props.accessibilityRole === 'radio').some((node) => node.props.disabled)).toBe(true)
    resolveRole({ role: 'benevole', activeRole: 'scientifique', activeProfile: 'scientifique' })
    await act(async () => { await settle() })

    await act(async () => { await findButton(renderer, 'À propos et informations légales')?.props.onPress(); await settle() })
    state.requestMobileAccountDeletion.mockResolvedValueOnce({ status: 'queued', requestId: 'deletion-2', notificationStatus: 'failed', deletionProcessed: false, message: 'Traitement manuel requis.' })
    const confirmation = renderer.root.findByProps({ accessibilityLabel: 'Confirmation de suppression du compte' })
    await act(async () => { confirmation.props.onChangeText('SUPPRIMER MON COMPTE'); await settle() })
    await act(async () => { await findButton(renderer, 'Demander la suppression')?.props.onPress() })
    const buttons = state.alert.mock.calls.at(-1)?.[2] as Array<{ text: string; onPress?: () => void }>
    await act(async () => { await buttons.find((button) => button.text === 'Envoyer la demande')?.onPress?.(); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('en échec, traitement manuel requis'))).not.toHaveLength(0)
  })

  it('expires the session on an unauthorized account load', async () => {
    const onSessionExpired = vi.fn()
    state.loadMobileAccount.mockRejectedValueOnce({ status: 401 })
    const { renderer } = await renderScreen(onSessionExpired)
    expect(onSessionExpired).toHaveBeenCalledOnce()
    expect(renderer.root.findAll((node) => textContent(node).includes('Compte indisponible'))).not.toHaveLength(0)
  })
})
