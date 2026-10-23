import type { AccountData } from '../../hooks/use-account-controller'

export const mobileAccount: AccountData = {
  identity: { userId: 'user-a', displayName: 'Ada Lovelace', displayNameMode: 'full_name', handle: 'ada', firstName: 'Ada', lastName: 'Lovelace', username: 'ada', email: null, grantedRole: 'benevole', activeRole: 'benevole', availableActiveRoles: ['benevole', 'scientifique'], currentLevel: 2 },
  onboarding: { completed: false, version: null, currentVersion: 1 },
  locationPreferences: { residence: null, work: null },
  activityStatus: 'active',
  notifications: { informationalEnabled: true, actionRemindersEnabled: true, mutedInformationActionIds: [] },
  history: [], invitations: [], missions: [], createdActions: [], progression: null,
  counts: { registrations: 0, confirmedParticipations: 0, missions: 0, createdActions: 0 },
}
