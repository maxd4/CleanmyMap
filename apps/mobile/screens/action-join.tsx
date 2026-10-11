import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  cancelFutureAction,
  claimPastAction,
  loadActionReview,
  loadMobileActionDetail,
  loadMobileActions,
  requestFutureAction,
  respondToInvitation,
  reviewActionRequest,
  type MobileActionItem,
  type MobileActionReviewItem,
  type MobileInvitation,
} from '../lib/mobile-actions-service'

type ActionJoinScreenProps = {
  onSessionExpired: () => void
}

type Tab = 'future' | 'past'

export function ActionJoinScreen({ onSessionExpired }: ActionJoinScreenProps) {
  const [tab, setTab] = useState<Tab>('future')
  const [query, setQuery] = useState('')
  const [future, setFuture] = useState<MobileActionItem[]>([])
  const [past, setPast] = useState<MobileActionItem[]>([])
  const [invitations, setInvitations] = useState<MobileInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selected, setSelected] = useState<MobileActionItem | null>(null)
  const [review, setReview] = useState<{ actionId: string; requests: MobileActionReviewItem[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = await loadMobileActions({ view: 'all', query })
      setFuture(payload.future)
      setPast(payload.past)
      setInvitations(payload.invitations)
    } catch (loadError) {
      if ((loadError as { status?: number }).status === 401) {
        onSessionExpired()
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Les actions sont temporairement indisponibles.')
      }
    } finally {
      setLoading(false)
    }
  }, [onSessionExpired, query])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const items = useMemo(() => (tab === 'future' ? future : past), [future, past, tab])

  async function runMutation(actionId: string, operation: () => Promise<unknown>, successMessage: string) {
    setBusyId(actionId)
    setError(null)
    try {
      await operation()
      Alert.alert('Action mise à jour', successMessage)
      await refresh()
    } catch (mutationError) {
      if ((mutationError as { status?: number }).status === 401) onSessionExpired()
      else setError(mutationError instanceof Error ? mutationError.message : 'La demande n’a pas abouti.')
    } finally {
      setBusyId(null)
    }
  }

  async function openDetails(item: MobileActionItem) {
    try {
      const details = await loadMobileActionDetail(item.id)
      setSelected(details.action)
    } catch (detailError) {
      if ((detailError as { status?: number }).status === 401) onSessionExpired()
      else setError(detailError instanceof Error ? detailError.message : 'Le détail est indisponible.')
    }
  }

  async function openReview(actionId: string) {
    try {
      const result = await loadActionReview(actionId)
      setReview({ actionId, requests: result.pendingRequests })
    } catch (reviewError) {
      if ((reviewError as { status?: number }).status === 401) onSessionExpired()
      else if ((reviewError as { status?: number }).status === 403) setError('La gestion des demandes est réservée aux organisateurs autorisés.')
      else setError(reviewError instanceof Error ? reviewError.message : 'La file de demandes est indisponible.')
    }
  }

  return (
    <View>
      <Text style={styles.eyebrow}>PARTICIPATION</Text>
      <Text style={styles.title}>Rejoindre une action</Text>
      <Text style={styles.bodyText}>Trouvez une action future, suivez votre inscription ou demandez à rattacher votre participation à une action passée.</Text>

      <View style={styles.tabs} accessibilityRole="tablist">
        {(['future', 'past'] as const).map((value) => (
          <TouchableOpacity key={value} style={[styles.tab, tab === value && styles.tabSelected]} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)}>
            <Text style={[styles.tabLabel, tab === value && styles.tabLabelSelected]}>{value === 'future' ? 'À venir' : 'Passées'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        accessibilityLabel="Rechercher une action"
        value={query}
        onChangeText={setQuery}
        placeholder="Ville, lieu ou titre"
        placeholderTextColor="#64748b"
        style={styles.search}
        returnKeyType="search"
      />

      {invitations.length > 0 ? <InvitationPanel invitations={invitations} onDecision={(id, decision) => void runMutation(`invitation-${id}`, () => respondToInvitation(id, decision), decision === 'accept' ? 'Invitation acceptée.' : 'Invitation refusée.')} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color="#34d399" style={styles.loader} /> : null}
      {!loading && items.length === 0 ? <Text style={styles.empty}>Aucune action ne correspond à votre recherche.</Text> : null}

      {items.map((item) => (
        <ActionCard
          key={item.id}
          item={item}
          busy={busyId === item.id}
          onDetails={() => void openDetails(item)}
          onJoin={() => void runMutation(item.id, () => requestFutureAction(item.id), 'Votre demande d’inscription a été envoyée.')}
          onCancel={() => void runMutation(item.id, () => cancelFutureAction(item.id), 'Votre inscription a été annulée.')}
          onClaim={() => void runMutation(item.id, () => claimPastAction(item.id), 'Votre demande de rattachement a été envoyée pour validation.')}
          onReview={() => void openReview(item.id)}
        />
      ))}

      {selected ? <DetailPanel item={selected} onClose={() => setSelected(null)} /> : null}
      {review ? <ReviewPanel review={review} busy={busyId === review.actionId} onClose={() => setReview(null)} onDecision={(request) => void runMutation(review.actionId, () => reviewActionRequest(review.actionId, request.id, 'accept'), `Demande de ${request.displayName} acceptée.`)} /> : null}
    </View>
  )
}

function ActionCard({ item, busy, onDetails, onJoin, onCancel, onClaim, onReview }: { item: MobileActionItem; busy: boolean; onDetails: () => void; onJoin: () => void; onCancel: () => void; onClaim: () => void; onReview: () => void }) {
  const isPast = item.actionPhase === 'post_action_complete' || item.contract?.metadata?.actionPhase === 'post_action_complete'
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onDetails} accessibilityRole="button" accessibilityLabel={`Voir le détail de ${item.actionTitle ?? item.location_label}`}>
        <View style={styles.cardHeader}><Ionicons name={isPast ? 'time-outline' : 'people-outline'} size={20} color="#34d399" /><Text style={styles.cardTitle}>{item.actionTitle ?? item.location_label}</Text></View>
        <Text style={styles.cardMeta}>{item.action_date} · {item.location_label}</Text>
        <Text style={styles.cardMeta}>{item.volunteers_count} bénévole(s) · {item.duration_minutes} min</Text>
      </TouchableOpacity>
      {item.awaitingApproval ? <Text style={styles.status}>Demande en attente</Text> : null}
      {item.joined ? <Text style={styles.status}>Inscription confirmée</Text> : null}
      <View style={styles.cardActions}>
        {!isPast && !item.joined && !item.awaitingApproval ? <SmallButton label="Demander" disabled={busy} onPress={onJoin} /> : null}
        {!isPast && (item.joined || item.awaitingApproval) ? <SmallButton label="Annuler" disabled={busy} onPress={onCancel} secondary /> : null}
        {isPast && !item.joined && !item.awaitingApproval ? <SmallButton label="Demander le rattachement" disabled={busy} onPress={onClaim} /> : null}
        {!isPast ? <SmallButton label="Demandes organisateur" disabled={busy} onPress={onReview} secondary /> : null}
      </View>
    </View>
  )
}

function SmallButton({ label, disabled, onPress, secondary = false }: { label: string; disabled: boolean; onPress: () => void; secondary?: boolean }) {
  return <TouchableOpacity style={[styles.smallButton, secondary && styles.smallButtonSecondary]} disabled={disabled} onPress={onPress} accessibilityRole="button"><Text style={[styles.smallButtonLabel, secondary && styles.smallButtonLabelSecondary]}>{disabled ? '...' : label}</Text></TouchableOpacity>
}

function InvitationPanel({ invitations, onDecision }: { invitations: MobileInvitation[]; onDecision: (id: string, decision: 'accept' | 'reject') => void }) {
  return <View style={styles.invitation}><Text style={styles.sectionTitle}>Invitations</Text>{invitations.map((invitation) => <View key={invitation.registration_id} style={styles.invitationRow}><Text style={styles.cardMeta}>{invitation.action_title ?? invitation.location_label ?? invitation.action_id}</Text><View style={styles.cardActions}><SmallButton label="Accepter" disabled={false} onPress={() => onDecision(invitation.registration_id, 'accept')} /><SmallButton label="Refuser" disabled={false} onPress={() => onDecision(invitation.registration_id, 'reject')} secondary /></View></View>)}</View>
}

function DetailPanel({ item, onClose }: { item: MobileActionItem; onClose: () => void }) {
  return <View style={styles.detail}><View style={styles.cardHeader}><Text style={styles.sectionTitle}>Détail</Text><TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer le détail"><Ionicons name="close" size={22} color="#94a3b8" /></TouchableOpacity></View><Text style={styles.bodyText}>{item.actionTitle ?? item.location_label}</Text><Text style={styles.cardMeta}>Rendez-vous : {item.location_label}</Text><Text style={styles.cardMeta}>Date : {item.action_date}</Text></View>
}

function ReviewPanel({ review, busy, onClose, onDecision }: { review: { actionId: string; requests: MobileActionReviewItem[] }; busy: boolean; onClose: () => void; onDecision: (request: MobileActionReviewItem) => void }) {
  return <View style={styles.detail}><View style={styles.cardHeader}><Text style={styles.sectionTitle}>Demandes à traiter</Text><TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer les demandes"><Ionicons name="close" size={22} color="#94a3b8" /></TouchableOpacity></View>{review.requests.length === 0 ? <Text style={styles.cardMeta}>Aucune demande en attente.</Text> : review.requests.map((request) => <View key={request.id} style={styles.invitationRow}><Text style={styles.cardMeta}>{request.displayName}</Text><SmallButton label="Accepter" disabled={busy} onPress={() => onDecision(request)} /></View>)}</View>
}

const styles = StyleSheet.create({
  eyebrow: { color: '#34d399', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  title: { color: '#f8fafc', fontSize: 30, fontWeight: '900', marginBottom: 12 },
  bodyText: { color: '#cbd5e1', fontSize: 15, lineHeight: 22, marginBottom: 16 },
  tabs: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 14, padding: 4, marginBottom: 12 },
  tab: { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 11 },
  tabSelected: { backgroundColor: '#064e3b' },
  tabLabel: { color: '#94a3b8', fontWeight: '800' },
  tabLabelSelected: { color: '#a7f3d0' },
  search: { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 14, borderWidth: 1, color: '#f8fafc', padding: 14, marginBottom: 14 },
  loader: { marginVertical: 20 },
  empty: { color: '#94a3b8', lineHeight: 20, marginBottom: 16 },
  error: { color: '#fca5a5', backgroundColor: '#451a1a', borderRadius: 12, padding: 12, marginBottom: 14 },
  card: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  cardTitle: { color: '#f8fafc', flex: 1, fontSize: 16, fontWeight: '800' },
  cardMeta: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  status: { color: '#a7f3d0', fontSize: 12, fontWeight: '800', marginTop: 10 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  smallButton: { backgroundColor: '#34d399', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  smallButtonSecondary: { backgroundColor: 'transparent', borderColor: '#475569', borderWidth: 1 },
  smallButtonLabel: { color: '#022c22', fontSize: 11, fontWeight: '900' },
  smallButtonLabelSecondary: { color: '#a7f3d0' },
  invitation: { backgroundColor: '#11352f', borderColor: '#256e5b', borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 14 },
  invitationRow: { borderTopColor: '#1e293b', borderTopWidth: 1, paddingTop: 10, marginTop: 10 },
  sectionTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: '900' },
  detail: { backgroundColor: '#172033', borderColor: '#334155', borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 8, marginBottom: 16 },
})
