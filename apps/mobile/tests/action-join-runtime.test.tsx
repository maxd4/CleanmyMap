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
  proposeMobileActionFieldRoleTransfer: vi.fn(),
  respondMobileActionFieldRoleTransfer: vi.fn(),
  updateMobileActionFieldRoles: vi.fn(),
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
  proposeMobileActionFieldRoleTransfer: state.proposeMobileActionFieldRoleTransfer,
  requestFutureAction: state.requestFutureAction,
  respondToInvitation: state.respondToInvitation,
  respondMobileActionFieldRoleTransfer: state.respondMobileActionFieldRoleTransfer,
  reviewActionRequest: state.reviewActionRequest,
  updateMobileActionFieldRoles: state.updateMobileActionFieldRoles,
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
    state.proposeMobileActionFieldRoleTransfer.mockReset().mockResolvedValue({ status: 'pending' })
    state.respondMobileActionFieldRoleTransfer.mockReset().mockResolvedValue({ status: 'accepted' })
    state.updateMobileActionFieldRoles.mockReset().mockResolvedValue({ status: 'ok', actionId: 'future-1', canManage: false, roleOptions: [], assignments: [], confirmedParticipants: [], organizers: [], pendingTransfer: null, transferProposals: [] })
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

  it('renders field responsibilities, saves assignments and handles explicit transfer decisions', async () => {
    const roles = {
      status: 'ok', actionId: 'future-1', canManage: true, canProposeTransfer: true, canRejectTransfer: true, currentUserId: 'user-a',
      roleOptions: [{ code: 'safety', label: 'Sécurité', description: 'Accueil et sécurité du groupe.' }],
      assignments: [{ user_id: 'user-a', role_code: 'safety', assignment_status: 'active' }],
      confirmedParticipants: [{ userId: 'user-a', displayName: 'Ada' }, { userId: 'user-b', displayName: 'Bob' }],
      organizers: [{ userId: 'user-a', displayName: 'Ada', isPrimary: true }, { userId: 'user-b', displayName: 'Bob', isPrimary: false }],
      pendingTransfer: null,
      transferProposals: [{ id: 'transfer-1', successor_user_id: 'user-a', status: 'pending' }],
    }
    state.loadMobileActionDetail.mockResolvedValue({ action: futureAction, participation: null, canJoin: true, canClaim: false })
    state.loadMobileActionFieldRoles.mockResolvedValue(roles)
    state.updateMobileActionFieldRoles.mockResolvedValue(roles)
    const { renderer } = await renderScreen()

    await act(async () => { await renderer.root.findByProps({ accessibilityLabel: 'Voir le détail de Nettoyage du parc' }).props.onPress(); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('Responsabilités terrain'))).not.toHaveLength(0)
    expect(renderer.root.findAll((node) => textContent(node).includes('Bob'))).not.toHaveLength(0)

    const role = renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity').find((node) => textContent(node).includes('Sécurité'))
    await act(async () => { await role?.props.onPress(); await settle() })
    const save = findButton(renderer, 'Enregistrer mes responsabilités')
    await act(async () => { await save?.props.onPress(); await settle() })
    expect(state.updateMobileActionFieldRoles).toHaveBeenCalledWith('future-1', 'user-a', [])

    const bob = renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity' && textContent(node).includes('Bob')).at(-1)
    await act(async () => { await bob?.props.onPress(); await settle() })
    await act(async () => { await findButton(renderer, 'Proposer le transfert')?.props.onPress(); await settle() })
    expect(state.proposeMobileActionFieldRoleTransfer).toHaveBeenCalledWith('future-1', 'user-b')
    await act(async () => { await findButton(renderer, 'Accepter')?.props.onPress(); await settle() })
    expect(state.respondMobileActionFieldRoleTransfer).toHaveBeenCalledWith('future-1', 'transfer-1', 'accept')
    await act(async () => { await findButton(renderer, 'Refuser')?.props.onPress(); await settle() })
    expect(state.respondMobileActionFieldRoleTransfer).toHaveBeenCalledWith('future-1', 'transfer-1', 'reject')
  })

  it('keeps detail and organizer errors visible and expires the session on mutation or review rejection', async () => {
    const onSessionExpired = vi.fn()
    state.loadMobileActionDetail.mockRejectedValueOnce(new Error('détail indisponible'))
    state.loadActionReview.mockRejectedValueOnce({ status: 403 })
    state.requestFutureAction.mockRejectedValueOnce(new Error('demande refusée'))
    state.loadMobileActions.mockResolvedValue({ future: [futureAction], past: [], history: [], invitations: [] })
    const { renderer } = await renderScreen(onSessionExpired)

    await act(async () => { await renderer.root.findByProps({ accessibilityLabel: 'Voir le détail de Nettoyage du parc' }).props.onPress(); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('détail indisponible'))).not.toHaveLength(0)
    await act(async () => { await findButton(renderer, 'Demandes organisateur')?.props.onPress(); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('réservée aux organisateurs'))).not.toHaveLength(0)
    await act(async () => { await findButton(renderer, 'Demander')?.props.onPress(); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('demande refusée'))).not.toHaveLength(0)

    state.requestFutureAction.mockRejectedValueOnce('mutation inconnue')
    await act(async () => { await findButton(renderer, 'Demander')?.props.onPress(); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('La demande n’a pas abouti.'))).not.toHaveLength(0)
    state.requestFutureAction.mockRejectedValueOnce({ status: 401 })
    await act(async () => { await findButton(renderer, 'Demander')?.props.onPress(); await settle() })
    expect(onSessionExpired).toHaveBeenCalled()

    state.loadMobileActionDetail.mockRejectedValueOnce('detail inconnu')
    await act(async () => { await renderer.root.findByProps({ accessibilityLabel: 'Voir le détail de Nettoyage du parc' }).props.onPress(); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('Le détail est indisponible.'))).not.toHaveLength(0)
    state.loadActionReview.mockRejectedValueOnce('review inconnue')
    await act(async () => { await findButton(renderer, 'Demandes organisateur')?.props.onPress(); await settle() })
    expect(renderer.root.findAll((node) => textContent(node).includes('La file de demandes est indisponible.'))).not.toHaveLength(0)

    state.loadMobileActionDetail.mockRejectedValueOnce({ status: 401 })
    await act(async () => { await renderer.root.findByProps({ accessibilityLabel: 'Voir le détail de Nettoyage du parc' }).props.onPress(); await settle() })
    expect(onSessionExpired).toHaveBeenCalled()
  })

  it('covers non-Error role failures and the empty participant guard', async () => {
    const roles = {
      status: 'ok', actionId: 'future-1', canManage: false, canProposeTransfer: false, canRejectTransfer: false, currentUserId: 'user-a',
      roleOptions: [{ code: 'welcome', label: 'Accueil', description: 'Accueillir les bénévoles.' }], assignments: [], confirmedParticipants: [], organizers: [], pendingTransfer: null, transferProposals: [],
    }
    state.loadMobileActionDetail.mockResolvedValue({ action: futureAction, participation: null, canJoin: true, canClaim: false })
    state.loadMobileActionFieldRoles.mockResolvedValue(roles)
    state.updateMobileActionFieldRoles.mockRejectedValueOnce('save failed')
    const { renderer } = await renderScreen()
    await act(async () => { await renderer.root.findByProps({ accessibilityLabel: 'Voir le détail de Nettoyage du parc' }).props.onPress(); await settle() })
    const role = renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity' && textContent(node).includes('Accueil'))[0]
    await act(async () => { await role?.props.onPress(); await settle() })
    expect(renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity' && node.props.disabled === true && textContent(node).includes('...'))).not.toHaveLength(0)
    const errorRoles = { ...roles, confirmedParticipants: [{ userId: 'user-a', displayName: 'Ada' }], canManage: true, canProposeTransfer: false }
    state.loadMobileActionDetail.mockResolvedValue({ action: futureAction, participation: null, canJoin: true, canClaim: false })
    state.loadMobileActionFieldRoles.mockResolvedValue(errorRoles)
    state.updateMobileActionFieldRoles.mockRejectedValueOnce('save failed')
    const second = await renderScreen()
    await act(async () => { await second.renderer.root.findByProps({ accessibilityLabel: 'Voir le détail de Nettoyage du parc' }).props.onPress(); await settle() })
    const selectable = second.renderer.root.findAll((node) => String(node.type) === 'TouchableOpacity' && textContent(node).includes('Accueil'))[0]
    await act(async () => { await selectable?.props.onPress(); await settle() })
    await act(async () => { await findButton(second.renderer, 'Enregistrer mes responsabilités')?.props.onPress(); await settle() })
    expect(second.renderer.root.findAll((node) => textContent(node).includes('Les responsabilités n’ont pas été enregistrées.'))).not.toHaveLength(0)
  })
})
