import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestMock = vi.hoisted(() => vi.fn())
vi.mock('../lib/mobile-api-client', () => ({ mobileRequest: requestMock }))

import {
  cancelFutureAction,
  claimPastAction,
  createMobileAction,
  createMobileSignalement,
  loadActionReview,
  loadMobileActionDay,
  loadMobileActionDetail,
  loadMobileActionEditor,
  loadMobileActionFieldRoles,
  loadMobileActions,
  loadMyMobileSignalements,
  publishMobileAction,
  proposeMobileActionFieldRoleTransfer,
  requestFutureAction,
  respondMobileActionFieldRoleTransfer,
  respondToInvitation,
  reviewActionRequest,
  updateMobileAction,
  updateMobileActionFieldRoles,
} from '../lib/mobile-actions-service'

describe('mobile actions transport', () => {
  beforeEach(() => {
    requestMock.mockReset()
    requestMock.mockResolvedValue({ status: 'ok' })
  })

  it('loads filtered action lists and trims the search query', async () => {
    await loadMobileActions({ view: 'future', query: '  Paris  ' })
    expect(requestMock).toHaveBeenCalledWith('/api/mobile/actions?view=future&limit=24&historyLimit=200&q=Paris')
  })

  it('defaults to the complete action list when no filters are provided', async () => {
    await loadMobileActions()

    expect(requestMock).toHaveBeenCalledWith('/api/mobile/actions?view=all&limit=24&historyLimit=200')
  })

  it('keeps action identifiers encoded for reads and mutations', async () => {
    await loadMobileActionDetail('action/1')
    await claimPastAction('action/1')
    await cancelFutureAction('action/1')
    await loadActionReview('action/1')
    await reviewActionRequest('action/1', 'participant/1', 'accept')
    await loadMobileActionEditor('action/1')
    await updateMobileAction('action/1', { locationLabel: 'Paris' })
    await publishMobileAction('action/1')
    await loadMobileActionDay('action/1')

    expect(requestMock).toHaveBeenNthCalledWith(1, '/api/mobile/actions/action%2F1')
    expect(requestMock).toHaveBeenNthCalledWith(2, '/api/mobile/actions/action%2F1', { method: 'POST', body: JSON.stringify({ intent: 'claim' }) })
    expect(requestMock).toHaveBeenNthCalledWith(3, '/api/mobile/actions/action%2F1', { method: 'DELETE' })
    expect(requestMock).toHaveBeenNthCalledWith(4, '/api/mobile/actions/action%2F1/review')
    expect(requestMock).toHaveBeenNthCalledWith(5, '/api/mobile/actions/action%2F1/review', { method: 'POST', body: JSON.stringify({ participantId: 'participant/1', decision: 'accept' }) })
    expect(requestMock).toHaveBeenNthCalledWith(6, '/api/actions/action%2F1')
    expect(requestMock).toHaveBeenNthCalledWith(7, '/api/actions/action%2F1', { method: 'PATCH', body: JSON.stringify({ locationLabel: 'Paris' }) })
    expect(requestMock).toHaveBeenNthCalledWith(8, '/api/actions/action%2F1/publish', { method: 'POST', body: JSON.stringify({}) })
    expect(requestMock).toHaveBeenNthCalledWith(9, '/api/actions/action%2F1/day')
  })

  it('uses the canonical participation, invitation and review mutations', async () => {
    await requestFutureAction('action-1')
    await respondToInvitation('registration-1', 'reject')

    expect(requestMock).toHaveBeenNthCalledWith(1, '/api/mobile/actions', { method: 'POST', body: JSON.stringify({ actionId: 'action-1', intent: 'join' }) })
    expect(requestMock).toHaveBeenNthCalledWith(2, '/api/mobile/actions/invitations', { method: 'PATCH', body: JSON.stringify({ registrationId: 'registration-1', decision: 'reject' }) })
  })

  it('keeps field-role transfer transport action-scoped for Clerk bearer routes', async () => {
    await loadMobileActionFieldRoles('action/1')
    await updateMobileActionFieldRoles('action/1', 'user/1', ['group_lead'])
    await proposeMobileActionFieldRoleTransfer('action/1', 'successor/1')
    await respondMobileActionFieldRoleTransfer('action/1', 'proposal-1', 'reject', 'Indisponible')

    expect(requestMock).toHaveBeenNthCalledWith(1, '/api/actions/action%2F1/field-roles')
    expect(requestMock).toHaveBeenNthCalledWith(2, '/api/actions/action%2F1/field-roles', { method: 'PUT', body: JSON.stringify({ userId: 'user/1', roleCodes: ['group_lead'] }) })
    expect(requestMock).toHaveBeenNthCalledWith(3, '/api/actions/action%2F1/field-roles/transfer', { method: 'POST', body: JSON.stringify({ successorUserId: 'successor/1' }) })
    expect(requestMock).toHaveBeenNthCalledWith(4, '/api/actions/action%2F1/field-roles/transfer', { method: 'PATCH', body: JSON.stringify({ proposalId: 'proposal-1', decision: 'reject', reason: 'Indisponible' }) })
  })

  it('posts action creation and signalement payloads without local result calculations', async () => {
    const actionPayload = { actionDate: '2026-10-10', locationLabel: 'Paris', associationName: 'CleanMyMap', organizerType: 'association' as const, groupJoinEnabled: true, actionPhase: 'pre_action' as const, submissionMode: 'complete' as const, routeTopology: 'loop' as const, routeStyle: 'direct' as const, wasteKg: 0, cigaretteButts: 0, volunteersCount: 4, durationMinutes: 60, wasteMeasurementMethod: null, preparationData: {} }
    await createMobileAction(actionPayload)
    await createMobileSignalement({ type: 'spot', label: 'Parc', latitude: 48.8, longitude: 2.3, wasteCategories: ['plastic'] })
    await loadMyMobileSignalements()

    expect(requestMock).toHaveBeenNthCalledWith(1, '/api/actions', { method: 'POST', body: JSON.stringify(actionPayload) })
    expect(requestMock).toHaveBeenNthCalledWith(2, '/api/spots', { method: 'POST', body: JSON.stringify({ type: 'spot', label: 'Parc', latitude: 48.8, longitude: 2.3, wasteCategories: ['plastic'] }) })
    expect(requestMock).toHaveBeenNthCalledWith(3, '/api/signalements/me?limit=100')
  })

  it('sends the stable creation key as transport metadata for retries', async () => {
    const actionPayload = {
      actionDate: '2026-10-10',
      locationLabel: 'Paris',
      associationName: 'CleanMyMap',
      organizerType: 'association' as const,
      groupJoinEnabled: true,
      actionPhase: 'pre_action' as const,
      submissionMode: 'complete' as const,
      routeTopology: 'loop' as const,
      routeStyle: 'direct' as const,
      wasteKg: 0,
      cigaretteButts: 0,
      volunteersCount: 4,
      durationMinutes: 60,
      wasteMeasurementMethod: null,
      preparationData: {},
      clientRequestId: 'action-create-2026-10-10-0001',
    }

    await createMobileAction(actionPayload)

    expect(requestMock).toHaveBeenCalledWith('/api/actions', {
      method: 'POST',
      headers: { 'Idempotency-Key': actionPayload.clientRequestId },
      body: JSON.stringify({
        ...actionPayload,
        clientRequestId: undefined,
      }),
    })
  })
})
