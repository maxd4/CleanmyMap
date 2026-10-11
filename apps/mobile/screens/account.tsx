import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Bell, CircleHelp, ExternalLink, Info, Search, Settings2, UserRound, type LucideIcon } from 'lucide-react-native'
import {
  loadMobileAccount,
  updateMobileAccountProfile,
  updateMobileActiveRole,
  updateMobileActivityStatus,
  updateMobileDisplayNameMode,
  updateMobileNotificationPreferences,
  type MobileAccountPayload,
} from '../lib/mobile-account-service'
import { EmergencyContactPanel } from './emergency-contact'

type AccountProps = { onSignOut: () => void; onSessionExpired: () => void; onOpenWeb: (path: string) => void }
type AccountData = MobileAccountPayload
type AccountSection = 'profile' | 'activity' | 'preferences' | 'search' | 'help' | 'about'

const ACCOUNT_SECTIONS: Array<{ id: AccountSection; label: string; description: string; icon: LucideIcon }> = [
  { id: 'profile', label: 'Mon profil', description: 'Identité, onboarding et parcours actif', icon: UserRound },
  { id: 'activity', label: 'Activité et notifications', description: 'Historique, invitations et alertes', icon: Bell },
  { id: 'preferences', label: 'Préférences', description: 'Affichage et choix synchronisés', icon: Settings2 },
  { id: 'search', label: 'Rechercher', description: 'Retrouver les surfaces de recherche', icon: Search },
  { id: 'help', label: 'Aide et feedback', description: 'Contact, aide et retour d’expérience', icon: CircleHelp },
  { id: 'about', label: 'À propos et informations légales', description: 'Confidentialité, mentions et réseaux', icon: Info },
]

const ROLE_LABELS: Record<string, string> = {
  benevole: 'Bénévole',
  coordinateur: 'Coordinateur',
  elu: 'Élu',
  scientifique: 'Scientifique',
  admin: 'Administrateur',
  max: 'Pilotage plateforme',
}

function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role
}

export function AccountScreen({ onSignOut, onSessionExpired, onOpenWeb }: AccountProps) {
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
      if ((value as { status?: number }).status === 401) onSessionExpired()
      else setError(value instanceof Error ? value.message : 'Votre compte est indisponible.')
    } finally {
      setLoading(false)
    }
  }, [hydrate, onSessionExpired])

  useEffect(() => { void refresh() }, [refresh])

  async function saveProfile(completeOnboarding = false) {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Renseignez votre prénom et votre nom avant d’enregistrer.')
      return
    }
    setSaving(true); setError(null); setMessage(null)
    try {
      const result = await updateMobileAccountProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        residenceLabel: residence.trim() || null,
        workLabel: work.trim() || null,
        completeOnboarding,
      })
      hydrate(result.account)
      setMessage(completeOnboarding ? 'Profil configuré et synchronisé avec CleanMyMap.' : 'Profil synchronisé avec CleanMyMap.')
    } catch (value) {
      if ((value as { status?: number }).status === 401) onSessionExpired()
      else setError(value instanceof Error ? value.message : 'Le profil n’a pas pu être enregistré.')
    } finally { setSaving(false) }
  }

  async function changeActiveRole(activeRole: string) {
    if (!account || activeRole === account.identity.activeRole) return
    setSaving(true); setError(null); setMessage(null)
    try {
      const result = await updateMobileActiveRole(activeRole)
      setAccount((current) => current ? { ...current, identity: { ...current.identity, activeRole: result.activeRole } } : current)
      setMessage('Parcours actif mis à jour. Vos droits attribués restent inchangés.')
    } catch (value) {
      if ((value as { status?: number }).status === 401) onSessionExpired()
      else setError(value instanceof Error ? value.message : 'Ce parcours ne peut pas être activé.')
    } finally { setSaving(false) }
  }

  async function changeDisplayNameMode(displayNameMode: 'full_name' | 'pseudo') {
    if (!account || displayNameMode === account.identity.displayNameMode) return
    setSaving(true); setError(null); setMessage(null)
    try {
      const result = await updateMobileDisplayNameMode(displayNameMode)
      setAccount((current) => current ? { ...current, identity: { ...current.identity, displayNameMode: result.displayNameMode, displayName: result.displayName } } : current)
      setMessage('Préférence de nom synchronisée.')
    } catch (value) {
      if ((value as { status?: number }).status === 401) onSessionExpired()
      else setError(value instanceof Error ? value.message : 'La préférence de nom est indisponible.')
    } finally { setSaving(false) }
  }

  async function changeActivityStatus(activityStatus: 'active' | 'inactive') {
    if (!account || activityStatus === account.activityStatus) return
    setSaving(true); setError(null); setMessage(null)
    try {
      const result = await updateMobileActivityStatus(activityStatus)
      setAccount((current) => current ? { ...current, activityStatus: result.activityStatus } : current)
      setMessage('Statut d’activité synchronisé.')
    } catch (value) {
      if ((value as { status?: number }).status === 401) onSessionExpired()
      else setError(value instanceof Error ? value.message : 'Le statut d’activité est indisponible.')
    } finally { setSaving(false) }
  }

  async function changeNotification(field: 'informationalEnabled' | 'actionRemindersEnabled', value: boolean) {
    if (!account) return
    setSaving(true); setError(null); setMessage(null)
    try {
      const notifications = await updateMobileNotificationPreferences({ [field]: value })
      setAccount((current) => current ? { ...current, notifications } : current)
      setMessage('Préférence de notification synchronisée.')
    } catch (value) {
      if ((value as { status?: number }).status === 401) onSessionExpired()
      else setError(value instanceof Error ? value.message : 'Les notifications sont indisponibles.')
    } finally { setSaving(false) }
  }

  if (loading) return <View style={styles.state}><ActivityIndicator color="#34d399" /><Text style={styles.helper}>Chargement de votre compte…</Text></View>
  if (!account) return <View style={styles.state}><Text style={styles.error}>{error ?? 'Compte indisponible.'}</Text><TouchableOpacity style={styles.primaryButton} onPress={() => void refresh()} accessibilityRole="button"><Text style={styles.primaryLabel}>Réessayer</Text></TouchableOpacity></View>

  const progression = account.progression ?? {}
  return <View style={styles.root}>
    <Text style={styles.eyebrow}>IDENTITÉ ET DONNÉES</Text>
    <Text style={styles.title}>Votre compte</Text>
    <Text style={styles.body}>Les informations affichées viennent des mêmes contrats Clerk et serveur que CleanMyMap Web.</Text>
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    {message ? <Text style={styles.success}>{message}</Text> : null}

    <SectionMenu section={section} onChange={setSection} />

    {section === 'profile' ? <>
    <Card title="Identité et localisation préférée">
      <Text style={styles.identityName}>{account.identity.displayName}</Text>
      <Text style={styles.meta}>{account.identity.email ?? 'Adresse email non disponible'}</Text>
      <Text style={styles.meta}>Identifiant : {account.identity.handle}</Text>
      <Text style={styles.roleLine}>Rôle attribué : {roleLabel(account.identity.grantedRole)}</Text>
      <Text style={styles.roleLine}>Parcours actif : {roleLabel(account.identity.activeRole)}</Text>
      <Text style={styles.helper}>Le rôle attribué est conservé. Seul le parcours actif autorisé peut changer.</Text>
      <Field label="Prénom" value={firstName} onChangeText={setFirstName} autoComplete="name" />
      <Field label="Nom" value={lastName} onChangeText={setLastName} autoComplete="family-name" />
      <Field label="Ville ou zone de résidence" value={residence} onChangeText={setResidence} placeholder="Facultatif" />
      <Field label="Ville ou zone de travail" value={work} onChangeText={setWork} placeholder="Facultatif" />
      <TouchableOpacity style={styles.primaryButton} disabled={saving} onPress={() => void saveProfile()} accessibilityRole="button"><Text style={styles.primaryLabel}>{saving ? 'Synchronisation…' : 'Enregistrer le profil'}</Text></TouchableOpacity>
      {!account.onboarding.completed ? <><Text style={styles.helper}>Votre configuration initiale n’est pas encore confirmée.</Text><TouchableOpacity style={styles.outlineButton} disabled={saving} onPress={() => void saveProfile(true)} accessibilityRole="button"><Text style={styles.secondaryLabel}>Terminer la configuration</Text></TouchableOpacity></> : null}
    </Card>

    <Card title="Parcours actif et confidentialité d’affichage">
      <Text style={styles.label}>Parcours autorisés</Text>
      <View style={styles.chips}>{account.identity.availableActiveRoles.map((role) => <TouchableOpacity key={role} style={[styles.chip, account.identity.activeRole === role && styles.chipSelected]} onPress={() => void changeActiveRole(role)} disabled={saving} accessibilityRole="radio" accessibilityState={{ checked: account.identity.activeRole === role }}><Text style={styles.chipLabel}>{roleLabel(role)}</Text></TouchableOpacity>)}</View>
      <Text style={styles.helper}>Le rôle attribué est conservé. Seul le parcours actif autorisé peut changer.</Text>
    </Card>
    </> : null}

    {section === 'activity' ? <>
    <Card title="Notifications et activité">
      <SwitchRow label="Informations CleanMyMap" value={account.notifications.informationalEnabled} onChange={(value) => void changeNotification('informationalEnabled', value)} disabled={saving} />
      <SwitchRow label="Rappels d’action" value={account.notifications.actionRemindersEnabled} onChange={(value) => void changeNotification('actionRemindersEnabled', value)} disabled={saving} />
      <SwitchRow label="Disponible pour l’activité" value={account.activityStatus === 'active'} onChange={(value) => void changeActivityStatus(value ? 'active' : 'inactive')} disabled={saving} />
    </Card>

    <Card title="Progression et indicateurs serveur">
      <View style={styles.stats}><Stat label="Niveau" value={String(account.identity.currentLevel)} /><Stat label="Inscriptions" value={String(account.counts.registrations)} /><Stat label="Participations confirmées" value={String(account.counts.confirmedParticipations)} /><Stat label="Missions GPS" value={String(account.counts.missions)} /></View>
      <Text style={styles.metric}>Actions validées : {valueOrUnknown(progression.validatedActions)}</Text>
      <Text style={styles.metric}>Contributions vérifiées : {valueOrUnknown(progression.verifiedContributions)}</Text>
      <Text style={styles.metric}>Déchets pesés disponibles : {valueOrUnknown(progression.totalKg, 'kg')}</Text>
      <Text style={styles.helper}>Ces valeurs sont calculées par le serveur. Le mobile ne les recalcule pas.</Text>
    </Card>

    <HistoryCard account={account} />
    <MissionCard account={account} />
    <CreatedActionCard account={account} />
    <InvitationCard account={account} />
    </> : null}

    {section === 'preferences' ? <Card title="Préférences d’affichage">
      <Text style={styles.helper}>Ces choix sont synchronisés avec votre compte CleanMyMap. La langue et les réglages web détaillés restent accessibles depuis leur surface canonique.</Text>
      <Text style={styles.label}>Nom affiché</Text>
      <View style={styles.row}><TouchableOpacity style={[styles.outlineButton, account.identity.displayNameMode === 'full_name' && styles.selectedButton]} onPress={() => void changeDisplayNameMode('full_name')} disabled={saving} accessibilityRole="radio" accessibilityState={{ checked: account.identity.displayNameMode === 'full_name' }}><Text style={styles.secondaryLabel}>Nom complet</Text></TouchableOpacity><TouchableOpacity style={[styles.outlineButton, account.identity.displayNameMode === 'pseudo' && styles.selectedButton]} onPress={() => void changeDisplayNameMode('pseudo')} disabled={saving} accessibilityRole="radio" accessibilityState={{ checked: account.identity.displayNameMode === 'pseudo' }}><Text style={styles.secondaryLabel}>Pseudo</Text></TouchableOpacity></View>
      <LinkButton label="Ouvrir les réglages web" onPress={() => onOpenWeb('/reglages')} />
    </Card> : null}

    {section === 'search' ? <Card title="Rechercher">
      <Text style={styles.helper}>La recherche complète utilise la surface canonique CleanMyMap. Son ouverture conserve votre session Clerk.</Text>
      <LinkButton label="Ouvrir la recherche CleanMyMap" onPress={() => onOpenWeb('/explorer')} />
    </Card> : null}

    {section === 'help' ? <>
      <Card title="Aide et feedback">
        <Text style={styles.helper}>Pour une question, un retour ou une demande d’assistance, utilisez le formulaire canonique du site.</Text>
        <LinkButton label="Aide et contact" onPress={() => onOpenWeb('/contact')} />
        <LinkButton label="Envoyer un feedback" onPress={() => onOpenWeb('/sections/feedback')} />
      </Card>
    </> : null}

    <View style={section === 'help' ? styles.visibleSection : styles.hiddenSection} pointerEvents={section === 'help' ? 'auto' : 'none'}><EmergencyContactPanel /></View>

    {section === 'about' ? <Card title="À propos et informations légales">
      <LinkButton label="Politique de confidentialité" onPress={() => onOpenWeb('/politique-confidentialite')} />
      <LinkButton label="Mentions légales" onPress={() => onOpenWeb('/mentions-legales')} />
      <LinkButton label="Réseau CleanMyMap" onPress={() => onOpenWeb('/sections/annuaire')} />
      <LinkButton label="Communauté CleanMyMap" onPress={() => onOpenWeb('/sections/community')} />
      <Text style={styles.helper}>La demande d’effacement passe par le workflow RGPD du site ; cette action ne supprime pas immédiatement le compte.</Text>
    </Card> : null}

    <TouchableOpacity style={styles.signOutButton} onPress={() => Alert.alert('Se déconnecter ?', 'La session Clerk sera fermée sur cet appareil.', [{ text: 'Annuler', style: 'cancel' }, { text: 'Se déconnecter', style: 'destructive', onPress: onSignOut }])} accessibilityRole="button"><Text style={styles.signOutLabel}>SE DÉCONNECTER</Text></TouchableOpacity>
  </View>
}

function SectionMenu({ section, onChange }: { section: AccountSection; onChange: (section: AccountSection) => void }) {
  return <View style={styles.sectionMenu} accessibilityRole="tablist">{ACCOUNT_SECTIONS.map(({ id, label, description, icon: Icon }) => <TouchableOpacity key={id} style={[styles.sectionButton, section === id && styles.sectionButtonSelected]} onPress={() => onChange(id)} accessibilityRole="tab" accessibilityState={{ selected: section === id }}><Icon size={19} color={section === id ? '#34d399' : '#94a3b8'} /><View style={styles.sectionCopy}><Text style={[styles.sectionLabel, section === id && styles.sectionLabelSelected]}>{label}</Text><Text style={styles.sectionDescription}>{description}</Text></View></TouchableOpacity>)}</View>
}

function HistoryCard({ account }: { account: AccountData }) { return <Card title="Historique des actions"><ListOrEmpty empty="Aucune inscription ou participation enregistrée." items={account.history.slice(0, 8).map((item) => <View key={`${item.id}-${item.joinedAt}`} style={styles.listRow}><View style={styles.listCopy}><Text style={styles.itemTitle}>{item.actionTitle || item.location_label}</Text><Text style={styles.meta}>{item.action_date} · {item.participationStatus}</Text></View><Text style={styles.status}>{item.actionPhase}</Text></View>)} /></Card> }
function MissionCard({ account }: { account: AccountData }) { return <Card title="Missions GPS"><ListOrEmpty empty="Aucune mission GPS dans ce compte." items={account.missions.slice(0, 6).map((mission) => <View key={mission.id} style={styles.listRow}><View style={styles.listCopy}><Text style={styles.itemTitle}>{mission.label}</Text><Text style={styles.meta}>{mission.status} · {mission.ended_at ? 'finalisée' : 'en reprise ou en cours'}</Text></View><Text style={styles.status}>{formatMetric(mission.distance_m, 'm')}</Text></View>)} /></Card> }
function CreatedActionCard({ account }: { account: AccountData }) { return <Card title="Actions organisées"><ListOrEmpty empty="Aucune action organisée depuis ce compte." items={account.createdActions.slice(0, 6).map((action) => <View key={action.id} style={styles.listRow}><View style={styles.listCopy}><Text style={styles.itemTitle}>{action.title || action.locationLabel}</Text><Text style={styles.meta}>{action.actionDate} · {action.status}</Text></View><Text style={styles.status}>{action.actionPhase}</Text></View>)} /></Card> }
function InvitationCard({ account }: { account: AccountData }) { return <Card title="Invitations en attente"><ListOrEmpty empty="Aucune invitation en attente." items={account.invitations.slice(0, 6).map((invitation, index) => <View key={String(invitation.registration_id ?? index)} style={styles.listRow}><View style={styles.listCopy}><Text style={styles.itemTitle}>{String(invitation.action_title ?? 'Action CleanMyMap')}</Text><Text style={styles.meta}>{String(invitation.action_date ?? 'Date à confirmer')}</Text></View><Text style={styles.status}>À traiter dans Agir</Text></View>)} /></Card> }
function ListOrEmpty({ empty, items }: { empty: string; items: React.ReactNode[] }) { return items.length > 0 ? <View>{items}</View> : <Text style={styles.helper}>{empty}</Text> }
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>{children}</View> }
function Field({ label, value, onChangeText, placeholder, autoComplete }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; autoComplete?: 'name' | 'family-name' }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#64748b" autoComplete={autoComplete} style={styles.input} /></View> }
function SwitchRow({ label, value, onChange, disabled }: { label: string; value: boolean; onChange: (value: boolean) => void; disabled: boolean }) { return <View style={styles.switchRow}><Text style={styles.switchLabel}>{label}</Text><TouchableOpacity style={[styles.switch, value && styles.switchOn]} onPress={() => onChange(!value)} disabled={disabled} accessibilityRole="switch" accessibilityState={{ checked: value }}><Text style={styles.switchText}>{value ? 'Oui' : 'Non'}</Text></TouchableOpacity></View> }
function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View> }
function LinkButton({ label, onPress }: { label: string; onPress: () => void }) { return <TouchableOpacity style={styles.outlineButton} onPress={onPress} accessibilityRole="link"><ExternalLink size={18} color="#a7f3d0" /><Text style={styles.secondaryLabel}>{label}</Text></TouchableOpacity> }
function valueOrUnknown(value: unknown, suffix = '') { return typeof value === 'number' && Number.isFinite(value) ? `${value}${suffix ? ` ${suffix}` : ''}` : 'Inconnu' }
function formatMetric(value: number | null, suffix: string) { return value === null ? 'Inconnu' : `${Math.round(value)} ${suffix}` }

const styles = StyleSheet.create({
  visibleSection: { display: 'flex' }, hiddenSection: { display: 'none' },
  root: { paddingBottom: 18 }, state: { alignItems: 'center', gap: 12, paddingVertical: 36 }, sectionMenu: { gap: 8, marginBottom: 16 }, sectionButton: { alignItems: 'center', borderColor: '#334155', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 12 }, sectionButtonSelected: { backgroundColor: '#064e3b', borderColor: '#34d399' }, sectionCopy: { flex: 1 }, sectionLabel: { color: '#e2e8f0', fontSize: 13, fontWeight: '900' }, sectionLabelSelected: { color: '#d1fae5' }, sectionDescription: { color: '#94a3b8', fontSize: 11, lineHeight: 16, marginTop: 2 }, eyebrow: { color: '#34d399', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 }, title: { color: '#f8fafc', fontSize: 30, fontWeight: '900', marginBottom: 12 }, body: { color: '#cbd5e1', fontSize: 14, lineHeight: 21, marginBottom: 16 }, card: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 18, borderWidth: 1, marginBottom: 14, padding: 16 }, cardTitle: { color: '#e2e8f0', fontSize: 17, fontWeight: '900', marginBottom: 14 }, identityName: { color: '#f8fafc', fontSize: 22, fontWeight: '900', marginBottom: 4 }, meta: { color: '#94a3b8', fontSize: 11, lineHeight: 17 }, roleLine: { color: '#d1fae5', fontSize: 12, fontWeight: '800', marginTop: 8 }, helper: { color: '#94a3b8', fontSize: 12, lineHeight: 18, marginTop: 10 }, label: { color: '#a7f3d0', fontSize: 11, fontWeight: '800', marginBottom: 6 }, field: { marginTop: 12 }, input: { backgroundColor: '#020617', borderColor: '#334155', borderRadius: 10, borderWidth: 1, color: '#f8fafc', minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 }, primaryButton: { alignItems: 'center', backgroundColor: '#34d399', borderRadius: 12, justifyContent: 'center', marginTop: 14, padding: 13 }, primaryLabel: { color: '#022c22', fontSize: 12, fontWeight: '900' }, outlineButton: { alignItems: 'center', borderColor: '#475569', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 10, padding: 12 }, secondaryLabel: { color: '#a7f3d0', fontSize: 12, fontWeight: '800' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { borderColor: '#475569', borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 9 }, chipSelected: { backgroundColor: '#064e3b', borderColor: '#34d399' }, chipLabel: { color: '#d1fae5', fontSize: 11, fontWeight: '800' }, row: { flexDirection: 'row', gap: 8 }, selectedButton: { backgroundColor: '#064e3b', borderColor: '#34d399', flex: 1 }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, stat: { backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: 10, borderWidth: 1, flexGrow: 1, minWidth: '45%', padding: 10 }, statValue: { color: '#34d399', fontSize: 21, fontWeight: '900' }, statLabel: { color: '#94a3b8', fontSize: 10, lineHeight: 15, marginTop: 3 }, metric: { color: '#cbd5e1', fontSize: 12, marginTop: 8 }, listRow: { alignItems: 'center', borderTopColor: '#1e293b', borderTopWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'space-between', paddingVertical: 11 }, listCopy: { flex: 1 }, itemTitle: { color: '#f8fafc', fontSize: 13, fontWeight: '800' }, status: { color: '#a7f3d0', fontSize: 10, fontWeight: '900', maxWidth: 100, textAlign: 'right', textTransform: 'uppercase' }, switchRow: { alignItems: 'center', borderTopColor: '#1e293b', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }, switchLabel: { color: '#e2e8f0', flex: 1, fontSize: 13, paddingRight: 12 }, switch: { alignItems: 'center', borderColor: '#475569', borderRadius: 12, borderWidth: 1, minWidth: 58, paddingHorizontal: 10, paddingVertical: 8 }, switchOn: { backgroundColor: '#064e3b', borderColor: '#34d399' }, switchText: { color: '#d1fae5', fontSize: 11, fontWeight: '900' }, error: { backgroundColor: '#451a1a', borderRadius: 10, color: '#fecaca', fontSize: 12, lineHeight: 18, marginBottom: 12, padding: 12 }, success: { backgroundColor: '#064e3b', borderRadius: 10, color: '#d1fae5', fontSize: 12, lineHeight: 18, marginBottom: 12, padding: 12 }, signOutButton: { alignItems: 'center', marginTop: 6, paddingVertical: 18 }, signOutLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
})
