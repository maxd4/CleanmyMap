import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  loadMobileActions: vi.fn(),
  loadMobileActionDetail: vi.fn(),
  requestFutureAction: vi.fn(),
  cancelFutureAction: vi.fn(),
  claimPastAction: vi.fn(),
  respondToInvitation: vi.fn(),
  loadActionReview: vi.fn(),
  reviewActionRequest: vi.fn(),
  loadMobileActionFieldRoles: vi.fn(),
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
vi.mock('@expo/vector-icons', () => ({ Ionicons: nativeComponent('Ionicons') }))
vi.mock('../lib/mobile-actions-service', () => ({
  cancelFutureAction: state.cancelFutureAction,
  claimPastAction: state.claimPastAction,
  loadActionReview: state.loadActionReview,
  loadMobileActionDetail: state.loadMobileActionDetail,
  loadMobileActionFieldRoles: state.loadMobileActionFieldRoles,
  loadMobileActions: state.loadMobileActions,
  proposeMobileActionFieldRoleTransfer: vi.fn(),
  requestFutureAction: state.requestFutureAction,
  respondToInvitation: state.respondToInvitation,
  respondMobileActionFieldRoleTransfer: vi.fn(),
  reviewActionRequest: state.reviewActionRequest,
  updateMobileActionFieldRoles: vi.fn(),
}))

import { ActionJoinScreen } from '../screens/action-join'

const futureAction = {
  id: 'future-1', created_at: '2026-10-01T10:00:00.000Z', action_date: '2026-10-25', location_label: 'Parc Nord', actionTitle: 'Nettoyage du parc', volunteers_count: 3, duration_minutes: 90, status: 'published', actionPhase: 'pre_action', joined: false, awaitingApproval: false,
}
const joinedFutureAction = { ...futureAction, joined: true, awaitingApproval: false }
const pastAction = { ...futureAction, id: 'past-1', action_date: '2026-09-20', actionTitle: 'Plage propre', actionPhase: 'post_action_complete' }

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

async function renderScreen(onSessionExpired = vi.fn()) {
  let renderer!: TestRenderer.ReactTestRenderer
  await act(async () => {
    renderer = TestRenderer.create(<ActionJoinScreen onSessionExpired={onSessionExpired} />)
    await settle()
  })
  return { renderer, onSessionExpired }
}

describe('mobile action join runtime', () => {
  beforeEach(() => {
    state.loadMobileActions.mockReset()
    state.loadMobileActionDetail.mockReset()
    state.requestFutureAction.mockReset().mockResolvedValue({ participationStatus: 'pending', joinedAt: '2026-10-20T10:00:00.000Z', participantsCount: 4 })
    state.cancelFutureAction.mockReset().mockResolvedValue({ participationStatus: 'cancelled' })
    state.claimPastAction.mockReset().mockResolvedValue({ participationStatus: 'pending', joinedAt: '2026-10-20T10:00:00.000Z' })
    state.respondToInvitation.mockReset().mockResolvedValue({ status: 'accepted' })
    state.loadActionReview.mockReset().mockResolvedValue({ pendingRequests: [], confirmedParticipants: [] })
    state.reviewActionRequest.mockReset().mockResolvedValue({ participationStatus: 'confirmed' })
    state.loadMobileActionFieldRoles.mockReset().mockResolvedValue({ status: 'ok', actionId: 'future-1', canManage: false, roleOptions: [], assignments: [], confirmedParticipants: [], organizers: [], pendingTransfer: null, transferProposals: [] })
    state.alert.mockReset()
    state.loadMobileActions.mockResolvedValue({ future: [futureAction], past: [pastAction], history: [], invitations: [] })
  })

  it('loads, searches, switches future/past, opens details and keeps empty states explicit', async () => {
    state.loadMobileActionDetail.mockResolvedValue({ action: futureAction, participation: null, canJoin: true, canClaim: false })
    const { renderer } = await renderScreen()
    expect(state.loadMobileActions).toHaveBeenCalledWith({ view: 'all', query: '' })
    expect(renderer.root.findAll((node) => textContent(node).includes('Nettoyage du parc'))).not.toHaveLength(0)

    const search = renderer.root.findByProps({ accessibilityLabel: 'Rechercher une action' })
    await act(async () => { search.props.onChangeText('parc'); await settle() })
    expect(state.loadMobileActions).toHaveBeenLastCalledWith({ view: 'all', query: 'parc' })

    const pastTab = renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity' && textContent(node) === 'Passées')[0]
    await act(async () => { pastTab.props.onPress(); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('Plage propre'))).not.toHaveLength(0)

    const details = renderer.root.findByProps({ accessibilityLabel: 'Voir le détail de Plage propre' })
    await act(async () => { await details?.props.onPress(); await settle() })
    expect(state.loadMobileActionDetail).toHaveBeenCalledWith('past-1')
    expect(renderer.root.findAll((node) => textContent(node).includes('Détail'))).not.toHaveLength(0)
  })

  it('runs join and cancel with a pending mutation that cannot be submitted twice', async () => {
    let refreshCount = 0
    state.loadMobileActions.mockImplementation(async () => ({ future: [refreshCount++ === 0 ? futureAction : joinedFutureAction], past: [], history: [], invitations: [] }))
    let resolveJoin!: (value: unknown) => void
    state.requestFutureAction.mockReturnValue(new Promise((resolve) => { resolveJoin = resolve }))
    const { renderer } = await renderScreen()
    const join = findButton(renderer, 'Demander')
    await act(async () => { void join?.props.onPress(); await settle() })
    expect(state.requestFutureAction).toHaveBeenCalledTimes(1)
    expect(findButton(renderer, '...')?.props.disabled).toBe(true)
    resolveJoin({ participationStatus: 'pending', joinedAt: '2026-10-20T10:00:00.000Z', participantsCount: 4 })
    await act(async () => { await settle() })
    expect(state.alert).toHaveBeenCalledWith('Action mise à jour', 'Votre demande d’inscription a été envoyée.')

    const cancel = findButton(renderer, 'Annuler')
    await act(async () => { await cancel?.props.onPress(); await settle() })
    expect(state.cancelFutureAction).toHaveBeenCalledWith('future-1')
    expect(state.alert).toHaveBeenCalledWith('Action mise à jour', 'Votre inscription a été annulée.')
  })

  it('supports past-action claim, invitations and organizer review callbacks', async () => {
    state.loadMobileActions.mockResolvedValue({ future: [futureAction], past: [pastAction], history: [], invitations: [{ registration_id: 'invite-1', action_id: 'future-1', action_title: 'Invitation Nord' }], })
    state.loadActionReview.mockResolvedValue({ pendingRequests: [{ id: 'request-1', actionId: 'future-1', displayName: 'Sam', handle: null, joinedAt: '2026-10-20T09:00:00.000Z', participationStatus: 'pending', participationSource: 'actions' }], confirmedParticipants: [] })
    const { renderer } = await renderScreen()

    const invitation = findButton(renderer, 'Accepter')
    await act(async () => { await invitation?.props.onPress(); await settle() })
    expect(state.respondToInvitation).toHaveBeenCalledWith('invite-1', 'accept')

    const review = findButton(renderer, 'Demandes organisateur')
    await act(async () => { await review?.props.onPress(); await settle() })
    expect(state.loadActionReview).toHaveBeenCalledWith('future-1')
    expect(renderer.root.findAll((node) => textContent(node).includes('Sam'))).not.toHaveLength(0)
    const approve = renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity').filter((node) => textContent(node).includes('Accepter')).at(-1)
    await act(async () => { await approve?.props.onPress(); await settle() })
    expect(state.reviewActionRequest).toHaveBeenCalledWith('future-1', 'request-1', 'accept')

    const pastTab = renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity' && textContent(node) === 'Passées')[0]
    await act(async () => { pastTab.props.onPress() })
    const claim = findButton(renderer, 'Demander le rattachement')
    await act(async () => { await claim?.props.onPress(); await settle() })
    expect(state.claimPastAction).toHaveBeenCalledWith('past-1')
  })

  it('surfaces service errors and expires the session on unauthorized loads', async () => {
    state.loadMobileActions.mockRejectedValueOnce(new Error('réseau indisponible'))
    const first = await renderScreen()
    expect(first.renderer.root.findAll((node) => textContent(node).includes('réseau indisponible'))).not.toHaveLength(0)

    const onSessionExpired = vi.fn()
    state.loadMobileActions.mockRejectedValueOnce({ status: 401 })
    const second = await renderScreen(onSessionExpired)
    expect(onSessionExpired).toHaveBeenCalledOnce()
    expect(second.renderer.root.findAll((node) => textContent(node).includes('Aucune action'))).not.toHaveLength(0)
  })
})
