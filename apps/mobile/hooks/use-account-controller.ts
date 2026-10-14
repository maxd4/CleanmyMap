import { useCallback, useEffect, useState } from 'react'
import {
  loadMobileAccount,
  updateMobileAccountProfile,
  updateMobileActiveRole,
  updateMobileActivityStatus,
  updateMobileDisplayNameMode,
  updateMobileNotificationPreferences,
  requestMobileAccountDeletion,
  type MobileAccountPayload,
} from '../lib/mobile-account-service'

export type AccountData = MobileAccountPayload
export type AccountSection = 'profile' | 'activity' | 'preferences' | 'search' | 'help' | 'about'

type AccountControllerProps = { onSessionExpired: () => void }

function isUnauthorized(value: unknown): boolean {
  return (value as { status?: number }).status === 401
}

function errorMessage(value: unknown, fallback: string): string {
  return value instanceof Error ? value.message : fallback
}

export function useAccountController({ onSessionExpired }: AccountControllerProps) {
  const [account, setAccount] = useState<AccountData | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [residence, setResidence] = useState('')
  const [work, setWork] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [section, setSection] = useState<AccountSection>('profile')
  const [deletionConfirmation, setDeletionConfirmation] = useState('')
  const [deletionRequestId, setDeletionRequestId] = useState<string | null>(null)
  const [deletionNotificationStatus, setDeletionNotificationStatus] = useState<'sent' | 'failed' | null>(null)

  const hydrate = useCallback((next: AccountData) => {
    setAccount(next)
    setFirstName(next.identity.firstName ?? '')
    setLastName(next.identity.lastName ?? '')
    setResidence(next.locationPreferences.residence?.label ?? '')
    setWork(next.locationPreferences.work?.label ?? '')
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      hydrate(await loadMobileAccount())
    } catch (value) {
      if (isUnauthorized(value)) onSessionExpired()
      else setError(errorMessage(value, 'Votre compte est indisponible.'))
    } finally {
      setLoading(false)
    }
  }, [hydrate, onSessionExpired])

  useEffect(() => { void refresh() }, [refresh])

  async function runMutation<T>(operation: () => Promise<T>, onSuccess: (result: T) => void, fallback: string) {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      onSuccess(await operation())
    } catch (value) {
      if (isUnauthorized(value)) onSessionExpired()
      else setError(errorMessage(value, fallback))
    } finally {
      setSaving(false)
    }
  }

  async function saveProfile(completeOnboarding = false) {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Renseignez votre prénom et votre nom avant d’enregistrer.')
      return
    }
    await runMutation(
      () => updateMobileAccountProfile({ firstName: firstName.trim(), lastName: lastName.trim(), residenceLabel: residence.trim() || null, workLabel: work.trim() || null, completeOnboarding }),
      (result) => { hydrate(result.account); setMessage(completeOnboarding ? 'Profil configuré et synchronisé avec CleanMyMap.' : 'Profil synchronisé avec CleanMyMap.') },
      'Le profil n’a pas pu être enregistré.',
    )
  }

  async function changeActiveRole(activeRole: string) {
    if (!account || activeRole === account.identity.activeRole) return
    await runMutation(
      () => updateMobileActiveRole(activeRole),
      (result) => { setAccount((current) => current ? { ...current, identity: { ...current.identity, activeRole: result.activeRole } } : current); setMessage('Parcours actif mis à jour. Vos droits attribués restent inchangés.') },
      'Ce parcours ne peut pas être activé.',
    )
  }

  async function changeDisplayNameMode(displayNameMode: 'full_name' | 'pseudo') {
    if (!account || displayNameMode === account.identity.displayNameMode) return
    await runMutation(
      () => updateMobileDisplayNameMode(displayNameMode),
      (result) => { setAccount((current) => current ? { ...current, identity: { ...current.identity, displayNameMode: result.displayNameMode, displayName: result.displayName } } : current); setMessage('Préférence de nom synchronisée.') },
      'La préférence de nom est indisponible.',
    )
  }

  async function changeActivityStatus(activityStatus: 'active' | 'inactive') {
    if (!account || activityStatus === account.activityStatus) return
    await runMutation(
      () => updateMobileActivityStatus(activityStatus),
      (result) => { setAccount((current) => current ? { ...current, activityStatus: result.activityStatus } : current); setMessage('Statut d’activité synchronisé.') },
      'Le statut d’activité est indisponible.',
    )
  }

  async function changeNotification(field: 'informationalEnabled' | 'actionRemindersEnabled', value: boolean) {
    if (!account) return
    await runMutation(
      () => updateMobileNotificationPreferences({ [field]: value }),
      (notifications) => { setAccount((current) => current ? { ...current, notifications } : current); setMessage('Préférence de notification synchronisée.') },
      'Les notifications sont indisponibles.',
    )
  }

  async function sendDeletionRequest() {
    await runMutation(
      () => requestMobileAccountDeletion(deletionConfirmation),
      (result) => { setDeletionRequestId(result.requestId); setDeletionNotificationStatus(result.notificationStatus); setMessage(result.message); setDeletionConfirmation('') },
      'La demande de suppression n’a pas pu être enregistrée.',
    )
  }

  return {
    account, firstName, lastName, residence, work, loading, saving, error, message,
    section, deletionConfirmation, deletionRequestId, deletionNotificationStatus,
    setFirstName, setLastName, setResidence, setWork, setSection, setDeletionConfirmation,
    refresh, saveProfile, changeActiveRole, changeDisplayNameMode, changeActivityStatus,
    changeNotification, sendDeletionRequest,
  }
}
