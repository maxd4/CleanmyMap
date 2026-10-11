import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  alert: vi.fn(),
  openedUrls: [] as string[],
  accountDeletion: vi.fn(async () => ({ status: 'queued', requestId: 'request-1', notificationStatus: 'sent' as const, deletionProcessed: false, message: 'Demande enregistrée.' })),
}))

function nativeComponent(name: string) {
  return function NativeComponent({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) {
    return React.createElement(name, props, children)
  }
}

vi.mock('react-native', () => ({
  ActivityIndicator: nativeComponent('ActivityIndicator'),
  Alert: { alert: state.alert },
  AppState: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
  BackHandler: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
  Image: nativeComponent('Image'),
  Linking: { openURL: vi.fn(async (url: string) => { state.openedUrls.push(url) }) },
  SafeAreaView: nativeComponent('SafeAreaView'),
  ScrollView: nativeComponent('ScrollView'),
  StyleSheet: { create: (styles: unknown) => styles },
  Text: nativeComponent('Text'),
  TextInput: nativeComponent('TextInput'),
  TouchableOpacity: nativeComponent('TouchableOpacity'),
  View: nativeComponent('View'),
}))

vi.mock('expo-status-bar', () => ({ StatusBar: nativeComponent('StatusBar') }))
vi.mock('expo-linking', () => ({ openURL: vi.fn(async (url: string) => { state.openedUrls.push(url) }) }))
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined), removeItem: vi.fn(async () => undefined) },
}))
vi.mock('@expo/vector-icons', () => ({ Ionicons: nativeComponent('Ionicons') }))
vi.mock('lucide-react-native', () => ({
  ArrowLeft: nativeComponent('ArrowLeft'), Bell: nativeComponent('Bell'), CircleHelp: nativeComponent('CircleHelp'), CircleUserRound: nativeComponent('CircleUserRound'),
  ExternalLink: nativeComponent('ExternalLink'), GraduationCap: nativeComponent('GraduationCap'), HandHelping: nativeComponent('HandHelping'), House: nativeComponent('House'),
  Info: nativeComponent('Info'), Map: nativeComponent('Map'), Search: nativeComponent('Search'), Settings2: nativeComponent('Settings2'), UsersRound: nativeComponent('UsersRound'), UserRound: nativeComponent('UserRound'),
}))
vi.mock('expo-location', () => ({
  Accuracy: { Balanced: 'balanced' },
  requestForegroundPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: vi.fn(async () => ({ coords: { latitude: 48.8566, longitude: 2.3522 } })),
}))

const account = {
  identity: { userId: 'user-a', displayName: 'Ada Lovelace', displayNameMode: 'full_name' as const, handle: 'ada', firstName: 'Ada', lastName: 'Lovelace', username: 'ada', email: null, grantedRole: 'benevole', activeRole: 'benevole', availableActiveRoles: ['benevole', 'scientifique'], currentLevel: 2 },
  onboarding: { completed: false, version: null, currentVersion: 1 },
  locationPreferences: { residence: null, work: null },
  activityStatus: 'active' as const,
  notifications: { informationalEnabled: true, actionRemindersEnabled: true, mutedInformationActionIds: [] },
  history: [], invitations: [], missions: [], createdActions: [], progression: null,
  counts: { registrations: 0, confirmedParticipations: 0, missions: 0, createdActions: 0 },
}

vi.mock('../lib/mobile-account-service', () => ({
  loadMobileAccount: vi.fn(async () => account),
  updateMobileAccountProfile: vi.fn(async () => ({ status: 'ok', account })),
  updateMobileActiveRole: vi.fn(async (activeRole: string) => ({ role: 'benevole', activeRole, activeProfile: activeRole })),
  updateMobileActivityStatus: vi.fn(async (activityStatus: string) => ({ activityStatus })),
  updateMobileDisplayNameMode: vi.fn(async (displayNameMode: string) => ({ displayNameMode, displayName: 'Ada' })),
  updateMobileNotificationPreferences: vi.fn(async () => account.notifications),
  requestMobileAccountDeletion: state.accountDeletion,
}))

vi.mock('../lib/mobile-actions-service', () => ({
  loadMobileActions: vi.fn(async () => ({ future: [], past: [], history: [], invitations: [] })),
  loadMobileActionDetail: vi.fn(async () => ({ action: null, participation: null, canJoin: false, canClaim: false })),
  requestFutureAction: vi.fn(), claimPastAction: vi.fn(), cancelFutureAction: vi.fn(), respondToInvitation: vi.fn(),
  loadActionReview: vi.fn(async () => ({ pendingRequests: [], confirmedParticipants: [] })),
  reviewActionRequest: vi.fn(), createMobileAction: vi.fn(async () => ({ status: 'created', id: 'action-1', source: 'actions' })),
  loadMobileActionEditor: vi.fn(async () => ({ status: 'ok', action: {} })), updateMobileAction: vi.fn(), publishMobileAction: vi.fn(), loadMobileActionDay: vi.fn(),
  createMobileSignalement: vi.fn(async () => ({ status: 'created', source: 'trash_spotter_spots', item: { id: 'spot-1' } })),
  loadMyMobileSignalements: vi.fn(async () => ({ status: 'ok', items: [] })),
}))
vi.mock('../lib/signalement-media-service', () => ({
  pickSignalementPhotos: vi.fn(async () => []), uploadSignalementPhotos: vi.fn(async () => ({ uploadedCount: 0, failed: [] })), loadSignalementMedia: vi.fn(async () => []),
}))
vi.mock('../lib/linked-mission-service', () => ({ createLinkedMission: vi.fn(), reconcileLinkedMission: vi.fn() }))
vi.mock('../lib/storage', () => ({
  getStoredEmergencyContact: vi.fn(async () => null), saveStoredEmergencyContact: vi.fn(), clearStoredEmergencyContact: vi.fn(),
  getStoredForegroundTrack: vi.fn(async () => []), saveStoredForegroundTrack: vi.fn(async () => undefined),
}))
vi.mock('../lib/emergency-contact', () => ({ validateEmergencyContact: vi.fn(() => null), getDialablePhone: vi.fn(() => null), hasEmergencyContact: vi.fn(() => false) }))

import { MobileShell } from '../screens/mobile-shell'

function textContent(node: TestRenderer.ReactTestInstance): string {
  return node.children.map((child) => typeof child === 'string' ? child : textContent(child)).join('')
}

async function renderShell() {
  let renderer!: TestRenderer.ReactTestRenderer
  await act(async () => {
    renderer = TestRenderer.create(<MobileShell onSignOut={vi.fn()} onSessionExpired={vi.fn()} onStartActivity={vi.fn()} />)
    await Promise.resolve()
    await Promise.resolve()
  })
  return renderer
}

describe('mobile native shell runtime', () => {
  beforeEach(() => {
    state.alert.mockReset()
    state.openedUrls.length = 0
    state.accountDeletion.mockClear()
  })

  it('renders the three accessible primary destinations and account sections', async () => {
    const renderer = await renderShell()
    const tabs = renderer.root.findAllByProps({ accessibilityRole: 'tab' })
    const primaryTabs = tabs.filter((tab) => ['Agir', 'Carte', 'Compte'].includes(tab.props.accessibilityLabel as string))
    expect([...new Set(primaryTabs.map((tab) => tab.props.accessibilityLabel))]).toEqual(['Agir', 'Carte', 'Compte'])
    expect([...new Set(primaryTabs.filter((tab) => tab.props.accessibilityState?.selected).map((tab) => tab.props.accessibilityLabel))]).toHaveLength(1)
    expect(renderer.root.findAllByProps({ accessibilityRole: 'tablist' })).not.toHaveLength(0)
    expect(renderer.root.findAll((node) => textContent(node).includes('Votre compte'))).not.toHaveLength(0)
  })

  it('keeps account deletion explicit, confirmation-gated and server-owned', async () => {
    const renderer = await renderShell()
    const aboutTab = renderer.root.findAllByProps({ accessibilityRole: 'tab' }).find((tab) => textContent(tab).includes('À propos'))
    await act(async () => aboutTab?.props.onPress())
    const confirmation = renderer.root.findByProps({ accessibilityLabel: 'Confirmation de suppression du compte' })
    await act(async () => confirmation.props.onChangeText('SUPPRIMER MON COMPTE'))
    const button = renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity').find((item) => textContent(item).includes('Demander la suppression'))
    expect(button?.props.accessibilityState.disabled).toBe(false)

    await act(async () => button?.props.onPress())
    const send = state.alert.mock.calls[0]?.[2]?.[1]?.onPress as (() => Promise<void>) | undefined
    expect(send).toBeTypeOf('function')
    await act(async () => { await send?.() })
    expect(state.accountDeletion).toHaveBeenCalledWith('SUPPRIMER MON COMPTE')
    expect(renderer.root.findAll((node) => textContent(node).includes('Demande enregistrée : request-1'))).not.toHaveLength(0)
  })

  it('preserves the action subviews and exposes the web bridge only as a bridge', async () => {
    const renderer = await renderShell()
    const join = renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity').find((item) => textContent(item).includes('Rejoindre une action'))
    await act(async () => join?.props.onPress())
    expect(renderer.root.findAll((node) => textContent(node).includes('Retour à Agir'))).not.toHaveLength(0)
    const webLinks = renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity').filter((item) => textContent(item).includes('Ouvrir'))
    expect(webLinks.length).toBeGreaterThan(0)
  })
})
