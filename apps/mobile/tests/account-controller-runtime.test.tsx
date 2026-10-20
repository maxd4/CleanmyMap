import React, { useEffect } from 'react'
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
}))

vi.mock('../lib/mobile-account-service', () => ({
  loadMobileAccount: state.loadMobileAccount,
  updateMobileAccountProfile: state.updateMobileAccountProfile,
  updateMobileActiveRole: state.updateMobileActiveRole,
  updateMobileActivityStatus: state.updateMobileActivityStatus,
  updateMobileDisplayNameMode: state.updateMobileDisplayNameMode,
  updateMobileNotificationPreferences: state.updateMobileNotificationPreferences,
  requestMobileAccountDeletion: state.requestMobileAccountDeletion,
}))

import { useAccountController } from '../hooks/use-account-controller'

const account: AccountData = {
  identity: { userId: 'user-a', displayName: 'Ada Lovelace', displayNameMode: 'full_name', handle: 'ada', firstName: 'Ada', lastName: 'Lovelace', username: 'ada', email: null, grantedRole: 'benevole', activeRole: 'benevole', availableActiveRoles: ['benevole', 'scientifique'], currentLevel: 2 },
  onboarding: { completed: false, version: null, currentVersion: 1 },
  locationPreferences: { residence: null, work: null },
  activityStatus: 'active',
  notifications: { informationalEnabled: true, actionRemindersEnabled: true, mutedInformationActionIds: [] },
  history: [], invitations: [], missions: [], createdActions: [], progression: null,
  counts: { registrations: 0, confirmedParticipations: 0, missions: 0, createdActions: 0 },
}

function Probe({ onChange, onSessionExpired }: { onChange: (value: ReturnType<typeof useAccountController>) => void; onSessionExpired: () => void }) {
  const controller = useAccountController({ onSessionExpired })
  useEffect(() => { onChange(controller) }, [controller, onChange])
  return null
}

async function renderController(onSessionExpired = vi.fn()) {
  let latest!: ReturnType<typeof useAccountController>
  const onChange = (value: ReturnType<typeof useAccountController>) => { latest = value }
  let renderer!: TestRenderer.ReactTestRenderer
  await act(async () => {
    renderer = TestRenderer.create(<Probe onChange={onChange} onSessionExpired={onSessionExpired} />)
    await Promise.resolve()
    await Promise.resolve()
  })
  return { renderer, getController: () => latest, onSessionExpired }
}

describe('mobile account controller runtime', () => {
  beforeEach(() => {
    state.loadMobileAccount.mockReset().mockResolvedValue(account)
    state.updateMobileAccountProfile.mockReset().mockResolvedValue({ status: 'ok', account })
    state.updateMobileActiveRole.mockReset().mockResolvedValue({ role: 'benevole', activeRole: 'scientifique', activeProfile: 'scientifique' })
    state.updateMobileActivityStatus.mockReset().mockResolvedValue({ activityStatus: 'inactive' })
    state.updateMobileDisplayNameMode.mockReset().mockResolvedValue({ displayNameMode: 'pseudo', displayName: 'ada' })
    state.updateMobileNotificationPreferences.mockReset().mockResolvedValue({ informationalEnabled: false, actionRemindersEnabled: true, mutedInformationActionIds: [] })
    state.requestMobileAccountDeletion.mockReset().mockResolvedValue({ status: 'queued', requestId: 'deletion-1', notificationStatus: 'sent', deletionProcessed: false, message: 'Demande enregistrée.' })
  })

  it('hydrates initial account data and rejects an incomplete profile without a mutation', async () => {
    const { getController } = await renderController()
    const controller = getController()
    expect(controller.loading).toBe(false)
    expect(controller.account?.identity.userId).toBe('user-a')
    expect(controller.firstName).toBe('Ada')

    await act(async () => {
      controller.setFirstName(' ')
      controller.setLastName('Lovelace')
      await Promise.resolve()
    })
    await act(async () => { await getController().saveProfile() })
    expect(state.updateMobileAccountProfile).not.toHaveBeenCalled()
    expect(getController().error).toBe('Renseignez votre prénom et votre nom avant d’enregistrer.')
  })

  it('executes profile, role, display, activity and notification mutations with server results', async () => {
    const { getController } = await renderController()
    await act(async () => { await getController().saveProfile(true) })
    expect(state.updateMobileAccountProfile).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Ada', lastName: 'Lovelace', completeOnboarding: true }))
    await act(async () => { await getController().changeActiveRole('scientifique') })
    await act(async () => { await getController().changeDisplayNameMode('pseudo') })
    await act(async () => { await getController().changeActivityStatus('inactive') })
    await act(async () => { await getController().changeNotification('informationalEnabled', false) })
    expect(state.updateMobileActiveRole).toHaveBeenCalledWith('scientifique')
    expect(state.updateMobileDisplayNameMode).toHaveBeenCalledWith('pseudo')
    expect(state.updateMobileActivityStatus).toHaveBeenCalledWith('inactive')
    expect(state.updateMobileNotificationPreferences).toHaveBeenCalledWith({ informationalEnabled: false })
    expect(getController().message).toContain('synchronisée')
  })

  it('preserves explicit errors, expires the session on 401 and cleans up pending responses', async () => {
    const { getController, onSessionExpired } = await renderController()
    state.updateMobileActiveRole.mockRejectedValueOnce(new Error('réseau indisponible'))
    await act(async () => { await getController().changeActiveRole('scientifique') })
    expect(getController().error).toBe('réseau indisponible')

    state.updateMobileActivityStatus.mockRejectedValueOnce({ status: 401 })
    await act(async () => { await getController().changeActivityStatus('inactive') })
    expect(onSessionExpired).toHaveBeenCalledOnce()

    state.loadMobileAccount.mockReturnValueOnce(new Promise(() => undefined))
    const pending = await renderController()
    await act(async () => { pending.renderer.unmount() })
    expect(state.loadMobileAccount).toHaveBeenCalled()
  })

  it('submits the explicit deletion confirmation request and clears the local confirmation', async () => {
    const { getController } = await renderController()
    await act(async () => { getController().setDeletionConfirmation('SUPPRIMER MON COMPTE'); await Promise.resolve() })
    await act(async () => { await getController().sendDeletionRequest() })
    expect(state.requestMobileAccountDeletion).toHaveBeenCalledWith('SUPPRIMER MON COMPTE')
    expect(getController().deletionRequestId).toBe('deletion-1')
    expect(getController().deletionNotificationStatus).toBe('sent')
    expect(getController().deletionConfirmation).toBe('')
  })
})
