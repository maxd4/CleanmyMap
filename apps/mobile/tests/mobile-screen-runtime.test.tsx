import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { useCompanionMissionController } from '../hooks/use-companion-mission-controller'
import type { Mission } from '../types/mission'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  alert: vi.fn(),
  openedUrls: [] as string[],
  accountDeletion: vi.fn(async () => ({ status: 'queued', requestId: 'request-1', notificationStatus: 'sent' as const, deletionProcessed: false, message: 'Demande enregistrée.' })),
}))

const appState = vi.hoisted(() => ({
  controller: null as ReturnType<typeof useCompanionMissionController> | null,
  startHostedAuth: vi.fn(),
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
vi.mock('@clerk/expo', () => ({
  ClerkProvider: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement('ClerkProvider', props, children),
}))
vi.mock('@clerk/expo/hosted-auth', () => ({
  useHostedAuth: () => ({ startHostedAuth: appState.startHostedAuth }),
}))
vi.mock('@clerk/expo/token-cache', () => ({ tokenCache: { getToken: vi.fn(), saveToken: vi.fn(), clearToken: vi.fn() } }))
vi.mock('../hooks/use-companion-mission-controller', () => ({
  useCompanionMissionController: () => appState.controller,
}))
vi.mock('../screens/mission-active-map', () => ({
  MissionActiveMap: (props: Record<string, unknown>) => React.createElement('MissionActiveMap', props),
}))
vi.mock('../screens/mission-finalization', () => ({
  MissionFinalizationScreen: (props: Record<string, unknown>) => React.createElement('MissionFinalizationScreen', props),
  MissionCompletionScreen: (props: Record<string, unknown>) => React.createElement('MissionCompletionScreen', props),
}))
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

function mission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: 'mission-1',
    volunteer_id: 'mission-owner',
    action_id: null,
    label: 'Action terrain',
    status: 'tracking',
    started_at: '2026-10-20T10:00:00.000Z',
    ended_at: null,
    distance_m: null,
    duration_s: null,
    created_at: '2026-10-20T09:59:00.000Z',
    ...overrides,
  }
}

function controller(overrides: Partial<ReturnType<typeof useCompanionMissionController>> = {}): ReturnType<typeof useCompanionMissionController> {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: 'user-current',
    phase: 'idle',
    mission: null,
    errorMsg: null,
    duration: '12s',
    pendingGpsPointCount: 0,
    finalizationStage: null,
    completionSummary: null,
    handleStartMobileMission: vi.fn(async () => undefined),
    handleSessionExpired: vi.fn(async () => undefined),
    handleStop: vi.fn(),
    handleReturnHome: vi.fn(),
    signOut: vi.fn(async () => undefined),
    ...overrides,
  }
}

function findTouchable(renderer: TestRenderer.ReactTestRenderer, label: string): TestRenderer.ReactTestInstance {
  const button = renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity' && textContent(node).includes(label))[0]
  expect(button, `TouchableOpacity containing ${label}`).toBeDefined()
  return button!
}

function findAppShell(renderer: TestRenderer.ReactTestRenderer): TestRenderer.ReactTestInstance {
  const shell = renderer.root.findAll((node) => (
    typeof node.props?.onStartActivity === 'function' &&
    typeof node.props?.onSignOut === 'function'
  ))[0]
  expect(shell).toBeDefined()
  return shell!
}

async function renderApp(key: string | undefined) {
  vi.stubEnv('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY', key ?? '')
  vi.resetModules()
  const { default: App } = await import('../App')
  let renderer!: TestRenderer.ReactTestRenderer
  await act(async () => {
    renderer = TestRenderer.create(<App />)
    await Promise.resolve()
  })
  return renderer
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
    appState.controller = controller()
    appState.startHostedAuth.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
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

  it('renders one Lucide icon for each primary destination', async () => {
    const renderer = await renderShell()
    const expectedIcons = {
      Agir: 'HandHelping',
      Carte: 'Map',
      Compte: 'CircleUserRound',
    } as const

    for (const [label, iconName] of Object.entries(expectedIcons)) {
      const tab = renderer.root.findAllByProps({ accessibilityLabel: label })[0]
      expect(tab).toBeDefined()
      expect(tab.findAll((node) => String(node.type) === iconName)).not.toHaveLength(0)
    }
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

  it('renders the required configuration state when the Clerk key is absent', async () => {
    const renderer = await renderApp(undefined)

    expect(textContent(renderer.root)).toContain('CONFIGURATION REQUISE')
    expect(textContent(renderer.root)).toContain('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY est nécessaire')
    expect(renderer.root.findAllByType('ClerkProvider' as unknown as React.ElementType)).toHaveLength(0)
  })

  it('mounts ClerkProvider and shows the initial session loading state', async () => {
    appState.controller = controller({ isLoaded: false, isSignedIn: false })
    const renderer = await renderApp('pk_test_mobile')

    expect(renderer.root.findAllByType('ClerkProvider' as unknown as React.ElementType)).toHaveLength(1)
    expect(textContent(renderer.root)).toContain('CHARGEMENT...')
    expect(renderer.root.findAll((node) => typeof node.props?.onStartActivity === 'function')).toHaveLength(0)
  })

  it('renders the signed-out screen and forwards sign-in/sign-up success', async () => {
    appState.controller = controller({ isSignedIn: false })
    const renderer = await renderApp('pk_test_mobile')

    const signIn = findTouchable(renderer, 'SE CONNECTER')
    await act(async () => { await signIn.props.onPress() })
    expect(appState.startHostedAuth).toHaveBeenCalledWith({ mode: 'sign-in' })

    const signUp = findTouchable(renderer, 'CRÉER UN COMPTE')
    await act(async () => { await signUp.props.onPress() })
    expect(appState.startHostedAuth).toHaveBeenCalledWith({ mode: 'sign-up' })
    expect(appState.startHostedAuth).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['sign-in', 'SE CONNECTER', new Error('Clerk indisponible'), 'Clerk indisponible'],
    ['sign-up', 'CRÉER UN COMPTE', { code: 'network-failure' }, 'Connexion Clerk impossible.'],
  ] as const)('renders %s failure for Error and non-Error auth failures', async (mode, label, failure, expected) => {
    appState.controller = controller({ isSignedIn: false })
    appState.startHostedAuth.mockRejectedValueOnce(failure)
    const renderer = await renderApp('pk_test_mobile')

    await act(async () => { await findTouchable(renderer, label).props.onPress() })

    expect(appState.startHostedAuth).toHaveBeenCalledWith({ mode })
    expect(textContent(renderer.root)).toContain(expected)
  })

  it('disables both authentication buttons while hosted authentication is pending', async () => {
    let resolveAuth!: () => void
    appState.controller = controller({ isSignedIn: false })
    appState.startHostedAuth.mockImplementation(() => new Promise<void>((resolve) => { resolveAuth = resolve }))
    const renderer = await renderApp('pk_test_mobile')
    const signIn = findTouchable(renderer, 'SE CONNECTER')
    const signUp = findTouchable(renderer, 'CRÉER UN COMPTE')

    await act(async () => {
      void signIn.props.onPress()
      await Promise.resolve()
    })

    expect(signIn.props.disabled).toBe(true)
    expect(signUp.props.disabled).toBe(true)
    await act(async () => { resolveAuth(); await Promise.resolve() })
    expect(findTouchable(renderer, 'SE CONNECTER').props.disabled).toBe(false)
  })

  it('renders requesting and forwards the real start callback without double authentication', async () => {
    const start = vi.fn(async () => undefined)
    appState.controller = controller({ phase: 'requesting', handleStartMobileMission: start })
    const renderer = await renderApp('pk_test_mobile')

    expect(textContent(renderer.root)).toContain('PRÉPARATION DU SUIVI...')
    expect(renderer.root.findAll((node) => typeof node.props?.onStartActivity === 'function')).toHaveLength(0)
    expect(appState.startHostedAuth).not.toHaveBeenCalled()
  })

  it('passes the current owner to a valid tracking mission and uses the mission owner fallback', async () => {
    const current = mission()
    appState.controller = controller({ phase: 'tracking', mission: current, userId: 'user-current' })
    const renderer = await renderApp('pk_test_mobile')
    const active = renderer.root.findByType('MissionActiveMap' as unknown as React.ElementType)

    expect(active.props).toMatchObject({ missionId: 'mission-1', ownerId: 'user-current', missionLabel: 'Action terrain', duration: '12s', pendingGpsPointCount: 0 })
    expect(active.props.onStop).toBe(appState.controller.handleStop)
    act(() => renderer.unmount())

    appState.controller = controller({ phase: 'tracking', mission: mission({ volunteer_id: 'mission-owner-fallback' }), userId: null })
    const fallbackRenderer = await renderApp('pk_test_mobile')
    expect(fallbackRenderer.root.findByType('MissionActiveMap' as unknown as React.ElementType).props.ownerId).toBe('mission-owner-fallback')
  })

  it('never displays a mission when tracking has no valid mission contract', async () => {
    appState.controller = controller({ phase: 'tracking', mission: null })
    const renderer = await renderApp('pk_test_mobile')

    expect(renderer.root.findAllByType('MissionActiveMap' as unknown as React.ElementType)).toHaveLength(0)
    expect(renderer.root.findAll((node) => typeof node.props?.onStartActivity === 'function')).toHaveLength(1)
    const shell = findAppShell(renderer)
    expect(shell.props.onStartActivity).toBe(appState.controller.handleStartMobileMission)
  })

  it('renders finalization, completion summary and return to MobileShell', async () => {
    appState.controller = controller({ phase: 'stopping', finalizationStage: 'finalizing' })
    const finalizing = await renderApp('pk_test_mobile')
    expect(finalizing.root.findByType('MissionFinalizationScreen' as unknown as React.ElementType).props).toEqual({ stage: 'finalizing' })
    act(() => finalizing.unmount())

    const handleReturnHome = vi.fn()
    appState.controller = controller({ completionSummary: mission({ status: 'completed', ended_at: '2026-10-20T10:30:00.000Z', distance_m: 120, duration_s: 1800 }), handleReturnHome })
    const completed = await renderApp('pk_test_mobile')
    const summary = completed.root.findByType('MissionCompletionScreen' as unknown as React.ElementType)
    expect(summary.props.mission).toMatchObject({ id: 'mission-1', status: 'completed', distance_m: 120, duration_s: 1800 })
    await act(async () => summary.props.onReturnHome())
    expect(handleReturnHome).toHaveBeenCalledOnce()
    act(() => completed.unmount())

    appState.controller = controller()
    const home = await renderApp('pk_test_mobile')
    expect(home.root.findAll((node) => typeof node.props?.onStartActivity === 'function')).toHaveLength(1)
    expect(findAppShell(home).props.onSignOut).toBeTypeOf('function')
  })

  it('passes explicit session expiration and sign-out callbacks back to MobileShell', async () => {
    const handleSessionExpired = vi.fn(async () => undefined)
    const signOut = vi.fn(async () => undefined)
    appState.controller = controller({ handleSessionExpired, signOut })
    const renderer = await renderApp('pk_test_mobile')
    const shell = findAppShell(renderer)

    await act(async () => { await shell.props.onSessionExpired() })
    await act(async () => { await shell.props.onSignOut() })

    expect(handleSessionExpired).toHaveBeenCalledOnce()
    expect(signOut).toHaveBeenCalledOnce()
  })
})
