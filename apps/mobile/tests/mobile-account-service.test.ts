import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestMock = vi.hoisted(() => vi.fn())

vi.mock('../lib/mobile-api-client', () => ({ mobileRequest: requestMock }))

import {
  loadMobileAccount,
  requestMobileAccountDeletion,
  updateMobileAccountProfile,
  updateMobileActiveRole,
  updateMobileActivityStatus,
  updateMobileDisplayNameMode,
  updateMobileNotificationPreferences,
} from '../lib/mobile-account-service'

describe('mobile account service', () => {
  beforeEach(() => {
    requestMock.mockReset()
    requestMock.mockResolvedValue({ status: 'ok' })
  })

  it('loads the server-owned account projection', async () => {
    await loadMobileAccount()
    expect(requestMock).toHaveBeenCalledWith('/api/mobile/account')
  })

  it('updates profile fields through the canonical account route', async () => {
    const payload = { firstName: 'Ada', lastName: 'Lovelace', residenceLabel: 'Paris', workLabel: null, completeOnboarding: true }
    await updateMobileAccountProfile(payload)
    expect(requestMock).toHaveBeenCalledWith('/api/mobile/account', { method: 'PATCH', body: JSON.stringify(payload) })
  })

  it('changes only the active role through its dedicated contract', async () => {
    await updateMobileActiveRole('scientifique')
    expect(requestMock).toHaveBeenCalledWith('/api/account/active-profile', {
      method: 'POST',
      body: JSON.stringify({ activeRole: 'scientifique' }),
    })
  })

  it('synchronizes display and activity preferences', async () => {
    await updateMobileDisplayNameMode('pseudo')
    await updateMobileActivityStatus('inactive')
    await updateMobileNotificationPreferences({ informationalEnabled: false })

    expect(requestMock).toHaveBeenNthCalledWith(1, '/api/users/profile/display-name-mode', { method: 'PATCH', body: JSON.stringify({ displayNameMode: 'pseudo' }) })
    expect(requestMock).toHaveBeenNthCalledWith(2, '/api/account/activity-status', { method: 'PATCH', body: JSON.stringify({ activityStatus: 'inactive' }) })
    expect(requestMock).toHaveBeenNthCalledWith(3, '/api/notifications/preferences', { method: 'PATCH', body: JSON.stringify({ informationalEnabled: false }) })
  })

  it('submits deletion as a queued non-destructive request and preserves its identifier', async () => {
    const result = { status: 'queued', requestId: 'request-1', notificationStatus: 'failed', deletionProcessed: false, message: 'Demande enregistrée.' }
    requestMock.mockResolvedValue(result)

    await expect(requestMobileAccountDeletion('SUPPRIMER MON COMPTE')).resolves.toEqual(result)
    expect(requestMock).toHaveBeenCalledWith('/api/mobile/account/deletion-request', {
      method: 'POST',
      body: JSON.stringify({ confirmation: 'SUPPRIMER MON COMPTE' }),
    })
  })
})
