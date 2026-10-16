import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { createLinkedMission } from '../lib/linked-mission-service'
import {
  createMobileAction,
  loadMobileActionDay,
  loadMobileActionEditor,
  publishMobileAction,
  updateMobileAction,
  type MobileActionDraftPayload,
} from '../lib/mobile-actions-service'
import { MobileFormField } from '../lib/mobile-form-field'

type ActionCreateProps = { onSessionExpired: () => void }
type Section = 'essentiel' | 'terrain' | 'equipe' | 'verification'
type Draft = {
  title: string
  description: string
  association: string
  date: string
  start: string
  end: string
  location: string
  latitude: string
  longitude: string
  meetingPoint: string
  materials: string
  recommendedMaterials: string
  logistics: string
  checklist: string
  safety: string
  accessibility: string
  coorganizers: string
  invitees: string
  departure: string
  arrival: string
  routeTopology: 'loop' | 'point_to_point'
  participants: string
  duration: string
  notes: string
}

const STORAGE_KEY = 'cleanmymap.mobile.action-create.v1'
const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'essentiel', label: 'Essentiel' },
  { id: 'terrain', label: 'Terrain' },
  { id: 'equipe', label: 'Équipe et logistique' },
  { id: 'verification', label: 'Vérifier et publier' },
]
const EMPTY: Draft = {
  title: '', description: '', association: 'Mon organisation', date: '', start: '', end: '', location: '',
  latitude: '', longitude: '', meetingPoint: '', materials: '', recommendedMaterials: '', logistics: '', checklist: '', safety: '', accessibility: '', coorganizers: '', invitees: '', departure: '', arrival: '', routeTopology: 'loop', participants: '1',
  duration: '60', notes: '',
}

export function ActionCreateScreen({ onSessionExpired }: ActionCreateProps) {
  const [section, setSection] = useState<Section>('essentiel')
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [draftHydrated, setDraftHydrated] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const restoreDraft = async () => {
      try {
        const value = await AsyncStorage.getItem(STORAGE_KEY)
        if (!active || !value) return
        try {
          const parsed = JSON.parse(value) as { draft?: Draft; actionId?: string | null; section?: Section; published?: boolean }
          if (parsed.draft) setDraft({ ...EMPTY, ...parsed.draft })
          if (parsed.actionId) setActionId(parsed.actionId)
          if (parsed.section && SECTIONS.some((item) => item.id === parsed.section)) setSection(parsed.section)
          if (parsed.published) setPublished(true)
        } catch { /* A malformed local draft must not block a new server-backed draft. */ }
      } catch { /* A read failure leaves the empty draft available for a retry. */ }
      finally {
        if (active) setDraftHydrated(true)
      }
    }
    void restoreDraft()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!draftHydrated) return
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ draft, actionId, section, published }))
  }, [actionId, draft, draftHydrated, published, section])

  const update = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }))
  const sectionIndex = SECTIONS.findIndex((item) => item.id === section)

  async function getCurrentPosition() {
    const permission = await Location.requestForegroundPermissionsAsync()
    if (permission.status !== 'granted') { setError('La permission de localisation est nécessaire pour utiliser la position actuelle.'); return }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    setDraft((current) => ({ ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }))
    setMessage('Position actuelle ajoutée. Vérifiez-la avant de sauvegarder.')
  }

  const payload = useMemo<MobileActionDraftPayload>(() => ({
    actionDate: draft.date,
    locationLabel: draft.location,
    latitude: draft.latitude ? Number(draft.latitude) : undefined,
    longitude: draft.longitude ? Number(draft.longitude) : undefined,
    associationName: draft.association || 'Mon organisation',
    organizerType: 'association',
    organizerAccounts: splitTokens(draft.coorganizers),
    participantAccounts: splitTokens(draft.invitees),
    groupJoinEnabled: true,
    actionPhase: 'pre_action',
    submissionMode: 'complete',
    eventStartTime: draft.start || null,
    eventEndTime: draft.end || null,
    routeTopology: draft.routeTopology,
    routeStyle: 'souple',
    departureLocationLabel: draft.departure || undefined,
    arrivalLocationLabel: draft.routeTopology === 'point_to_point' ? draft.arrival || undefined : undefined,
    wasteKg: 0,
    cigaretteButts: 0,
    volunteersCount: Math.max(1, Number(draft.participants) || 1),
    durationMinutes: Math.max(0, Number(draft.duration) || 0),
    wasteMeasurementMethod: 'manual',
    notes: draft.notes || undefined,
    preparationData: {
      actionTitle: draft.title,
      shortDescription: draft.description,
      pointDeRendezVous: draft.meetingPoint || draft.location,
      meetingTime: draft.start || undefined,
      safetyInstructions: draft.safety,
      materialsProvided: draft.materials,
      recommendedMaterials: draft.recommendedMaterials,
      logisticsNotes: draft.logistics,
      accessibility: draft.accessibility,
      accessibilityStatus: draft.accessibility ? 'conditions_reported' : 'not_evaluated',
      participantMessage: 'Merci de respecter les consignes de sécurité sur place.',
      volunteersExpected: Math.max(1, Number(draft.participants) || 1),
      groupJoinEnabled: true,
      actionDate: draft.date,
      preparationChecklist: draft.checklist.split('\n').map((label, index) => ({ key: `mobile-${index + 1}`, label: label.trim(), checked: false })).filter((item) => item.label).slice(0, 12),
      routeTopology: draft.routeTopology,
    },
  }), [draft])

  function handleError(value: unknown) {
    if ((value as { status?: number }).status === 401) onSessionExpired()
    else setError(value instanceof Error ? value.message : 'La sauvegarde n’a pas abouti.')
  }

  async function saveDraft() {
    setBusy(true); setError(null); setMessage(null)
    try {
      const result = actionId
        ? await updateMobileAction(actionId, payload)
        : await createMobileAction(payload)
      if (!actionId && 'id' in result) setActionId(result.id)
      setMessage('Brouillon enregistré sur le serveur. Vous pouvez reprendre plus tard.')
    } catch (value) { handleError(value) } finally { setBusy(false) }
  }

  async function publish() {
    setBusy(true); setError(null); setMessage(null)
    try {
      if (!actionId) {
        const created = await createMobileAction(payload)
        setActionId(created.id)
        await publishMobileAction(created.id)
      } else {
        await updateMobileAction(actionId, payload)
        await publishMobileAction(actionId)
      }
      setPublished(true)
      setMessage('Publication confirmée par le serveur.')
    } catch (value) { handleError(value) } finally { setBusy(false) }
  }

  async function linkGps() {
    if (!actionId) { setError('Enregistrez le brouillon avant de relier une activité GPS.'); return }
    setBusy(true); setError(null)
    const result = await createLinkedMission(draft.title || draft.location || 'Action mobile', actionId)
    setBusy(false)
    if (result.ok) setMessage('Suivi GPS lié. Il sera réconcilié par le serveur après finalisation.')
    else setError(result.error)
  }

  async function loadDayBriefing() {
    if (!actionId) return
    setBusy(true); setError(null)
    try { await loadMobileActionDay(actionId); setMessage('Les espaces Préparer et Jour J sont disponibles pour cette action.') }
    catch (value) { handleError(value) } finally { setBusy(false) }
  }

  useEffect(() => {
    if (!actionId) return
    void loadMobileActionEditor(actionId).catch((value) => {
      if ((value as { status?: number }).status === 401) onSessionExpired()
    })
  }, [actionId, onSessionExpired])

  return <View style={styles.root}>
    <Text style={styles.eyebrow}>ORGANISER</Text>
    <Text style={styles.title}>Créer une action</Text>
    <Text style={styles.body}>Le brouillon reste récupérable. Les validations, droits, formalités et résultats restent décidés par le serveur.</Text>
    <View style={styles.steps} accessibilityRole="tablist">
      {SECTIONS.map((item, index) => <TouchableOpacity key={item.id} onPress={() => setSection(item.id)} accessibilityRole="tab" accessibilityState={{ selected: section === item.id }} style={[styles.step, section === item.id && styles.stepSelected]}><Text style={[styles.stepNumber, section === item.id && styles.stepNumberSelected]}>{index + 1}</Text><Text style={[styles.stepLabel, section === item.id && styles.stepLabelSelected]}>{item.label}</Text></TouchableOpacity>)}
    </View>
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    {message ? <Text style={styles.success}>{message}</Text> : null}
    {section === 'essentiel' ? <Essentiel draft={draft} update={update} onPosition={getCurrentPosition} /> : null}
    {section === 'terrain' ? <Terrain draft={draft} update={update} onPosition={getCurrentPosition} /> : null}
    {section === 'equipe' ? <Equipe draft={draft} update={update} /> : null}
    {section === 'verification' ? <Verification draft={draft} actionId={actionId} published={published} onLinkGps={() => void linkGps()} onLoadDay={() => void loadDayBriefing()} /> : null}
    <View style={styles.actions}>
      <TouchableOpacity style={styles.secondaryButton} disabled={busy} onPress={() => void saveDraft()} accessibilityRole="button"><Text style={styles.secondaryLabel}>{busy ? '...' : 'Enregistrer le brouillon'}</Text></TouchableOpacity>
      {sectionIndex > 0 ? <TouchableOpacity style={styles.secondaryButton} disabled={busy} onPress={() => setSection(SECTIONS[sectionIndex - 1].id)} accessibilityRole="button"><Text style={styles.secondaryLabel}>Précédent</Text></TouchableOpacity> : null}
      {section !== 'verification' ? <TouchableOpacity style={styles.primaryButton} disabled={busy} onPress={() => setSection(SECTIONS[sectionIndex + 1].id)} accessibilityRole="button"><Text style={styles.primaryLabel}>Continuer</Text></TouchableOpacity> : <TouchableOpacity style={[styles.primaryButton, published && styles.disabled]} disabled={busy || published} onPress={() => void publish()} accessibilityRole="button"><Text style={styles.primaryLabel}>{published ? 'Publiée' : busy ? '...' : 'Publier'}</Text></TouchableOpacity>}
    </View>
    {busy ? <ActivityIndicator color="#34d399" /> : null}
  </View>
}

function splitTokens(value: string): string[] { return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, 20) }
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>{children}</View> }
function Essentiel({ draft, update, onPosition }: { draft: Draft; update: (key: keyof Draft, value: string) => void; onPosition: () => void }) { return <Card title="Identité et rendez-vous"><MobileFormField label="Titre de l’action" value={draft.title} onChangeText={(value) => update('title', value)} placeholder="Nettoyage du parc..." /><MobileFormField label="Objectif" value={draft.description} onChangeText={(value) => update('description', value)} placeholder="Ce que les bénévoles vont faire" multiline /><MobileFormField label="Organisateur" value={draft.association} onChangeText={(value) => update('association', value)} /><MobileFormField label="Date (AAAA-MM-JJ)" value={draft.date} onChangeText={(value) => update('date', value)} placeholder="2026-10-25" /><View style={styles.row}><MobileFormField label="Début (HH:MM)" value={draft.start} onChangeText={(value) => update('start', value)} placeholder="10:00" /><MobileFormField label="Fin (HH:MM)" value={draft.end} onChangeText={(value) => update('end', value)} placeholder="12:00" /></View><MobileFormField label="Lieu" value={draft.location} onChangeText={(value) => update('location', value)} placeholder="Parc ou commune" /><MobileFormField label="Point de rendez-vous" value={draft.meetingPoint} onChangeText={(value) => update('meetingPoint', value)} placeholder="Entrée principale" /><TouchableOpacity style={styles.outlineButton} onPress={onPosition} accessibilityRole="button"><Ionicons name="navigate-outline" size={18} color="#a7f3d0" /><Text style={styles.secondaryLabel}>Utiliser ma position actuelle</Text></TouchableOpacity></Card> }
function Terrain({ draft, update, onPosition }: { draft: Draft; update: (key: keyof Draft, value: string) => void; onPosition: () => void }) { return <Card title="Carte et terrain"><Text style={styles.helper}>La localisation manuelle reste possible. La géométrie et l’itinéraire sont validés et calculés par les contrats Actions.</Text><View style={styles.row}><MobileFormField label="Latitude" value={draft.latitude} onChangeText={(value) => update('latitude', value)} keyboardType="numeric" placeholder="48.8566" /><MobileFormField label="Longitude" value={draft.longitude} onChangeText={(value) => update('longitude', value)} keyboardType="numeric" placeholder="2.3522" /></View><TouchableOpacity style={styles.outlineButton} onPress={onPosition} accessibilityRole="button"><Ionicons name="locate-outline" size={18} color="#a7f3d0" /><Text style={styles.secondaryLabel}>Actualiser la position</Text></TouchableOpacity><Text style={styles.label}>Topologie du parcours</Text><View style={styles.row}><TouchableOpacity style={[styles.outlineButton, draft.routeTopology === 'loop' && styles.topologySelected]} onPress={() => update('routeTopology', 'loop')} accessibilityRole="radio" accessibilityState={{ checked: draft.routeTopology === 'loop' }}><Text style={styles.secondaryLabel}>Boucle</Text></TouchableOpacity><TouchableOpacity style={[styles.outlineButton, draft.routeTopology === 'point_to_point' && styles.topologySelected]} onPress={() => update('routeTopology', 'point_to_point')} accessibilityRole="radio" accessibilityState={{ checked: draft.routeTopology === 'point_to_point' }}><Text style={styles.secondaryLabel}>Point à point</Text></TouchableOpacity></View><MobileFormField label="Départ" value={draft.departure} onChangeText={(value) => update('departure', value)} placeholder="Point de départ" />{draft.routeTopology === 'point_to_point' ? <MobileFormField label="Arrivée" value={draft.arrival} onChangeText={(value) => update('arrival', value)} placeholder="Point d'arrivée" /> : null}<MobileFormField label="Consignes de sécurité" value={draft.safety} onChangeText={(value) => update('safety', value)} multiline placeholder="Risques connus et consignes" /></Card> }
function Equipe({ draft, update }: { draft: Draft; update: (key: keyof Draft, value: string) => void }) { return <Card title="Équipe, matériel et accessibilité"><MobileFormField label="Bénévoles attendus" value={draft.participants} onChangeText={(value) => update('participants', value)} keyboardType="numeric" /><MobileFormField label="Durée (minutes)" value={draft.duration} onChangeText={(value) => update('duration', value)} keyboardType="numeric" /><MobileFormField label="Coorganisateurs (identifiants séparés par des virgules)" value={draft.coorganizers} onChangeText={(value) => update('coorganizers', value)} placeholder="compte-1, compte-2" /><MobileFormField label="Invitations (identifiants séparés par des virgules)" value={draft.invitees} onChangeText={(value) => update('invitees', value)} placeholder="compte-3" /><MobileFormField label="Matériel fourni" value={draft.materials} onChangeText={(value) => update('materials', value)} multiline placeholder="Gants, sacs..." /><MobileFormField label="Matériel recommandé" value={draft.recommendedMaterials} onChangeText={(value) => update('recommendedMaterials', value)} multiline /><MobileFormField label="Accessibilité" value={draft.accessibility} onChangeText={(value) => update('accessibility', value)} multiline placeholder="Informations utiles" /><MobileFormField label="Logistique et checklist (une ligne par item)" value={draft.checklist} onChangeText={(value) => update('checklist', value)} multiline /><MobileFormField label="Notes logistiques" value={draft.logistics} onChangeText={(value) => update('logistics', value)} multiline /><MobileFormField label="Message aux participants" value={draft.notes} onChangeText={(value) => update('notes', value)} multiline /></Card> }
function Verification({ draft, actionId, published, onLinkGps, onLoadDay }: { draft: Draft; actionId: string | null; published: boolean; onLinkGps: () => void; onLoadDay: () => void }) { return <Card title="Vérifier et publier"><Text style={styles.reviewLine}>Action : {draft.title || 'À compléter'}</Text><Text style={styles.reviewLine}>Date : {draft.date || 'À compléter'} · {draft.location || 'Lieu à compléter'}</Text><Text style={styles.reviewLine}>Équipe : {draft.participants || '0'} bénévole(s) · {draft.duration || '0'} min</Text><Text style={styles.helper}>La publication peut être refusée par les formalités ou les permissions réelles. Aucun succès n’est affiché avant confirmation serveur.</Text>{actionId ? <><Text style={styles.serverRef}>Référence serveur : {actionId}</Text><TouchableOpacity style={styles.outlineButton} onPress={onLinkGps} accessibilityRole="button"><Ionicons name="footsteps-outline" size={18} color="#a7f3d0" /><Text style={styles.secondaryLabel}>Relier une activité GPS</Text></TouchableOpacity><TouchableOpacity style={styles.outlineButton} onPress={onLoadDay} accessibilityRole="button"><Ionicons name="calendar-outline" size={18} color="#a7f3d0" /><Text style={styles.secondaryLabel}>Ouvrir Préparer / Jour J</Text></TouchableOpacity></> : null}{published ? <Text style={styles.success}>Action publiée. Le serveur reste la source des statuts et indicateurs.</Text> : null}</Card> }

const styles = StyleSheet.create({
  root: { paddingBottom: 16 }, eyebrow: { color: '#34d399', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 }, title: { color: '#f8fafc', fontSize: 30, fontWeight: '900', marginBottom: 12 }, body: { color: '#cbd5e1', fontSize: 14, lineHeight: 21, marginBottom: 16 }, steps: { gap: 6, marginBottom: 14 }, step: { alignItems: 'center', backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 12, borderWidth: 1, flexDirection: 'row', padding: 10 }, stepSelected: { backgroundColor: '#064e3b', borderColor: '#34d399' }, stepNumber: { color: '#94a3b8', fontWeight: '900', marginRight: 10 }, stepNumberSelected: { color: '#34d399' }, stepLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '800' }, stepLabelSelected: { color: '#ecfdf5' }, card: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 }, cardTitle: { color: '#e2e8f0', fontSize: 17, fontWeight: '900', marginBottom: 14 }, field: { flex: 1, marginBottom: 12 }, label: { color: '#a7f3d0', fontSize: 11, fontWeight: '800', marginBottom: 6 }, input: { backgroundColor: '#020617', borderColor: '#334155', borderRadius: 10, borderWidth: 1, color: '#f8fafc', minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 }, multiline: { minHeight: 76, textAlignVertical: 'top' }, row: { flexDirection: 'row', gap: 10 }, helper: { color: '#94a3b8', fontSize: 12, lineHeight: 18, marginBottom: 12 }, outlineButton: { alignItems: 'center', borderColor: '#475569', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 12, padding: 12 }, topologySelected: { backgroundColor: '#064e3b', borderColor: '#34d399' }, secondaryLabel: { color: '#a7f3d0', fontSize: 12, fontWeight: '800' }, reviewLine: { color: '#e2e8f0', fontSize: 14, lineHeight: 23 }, serverRef: { color: '#64748b', fontFamily: 'monospace', fontSize: 11, marginTop: 12 }, success: { backgroundColor: '#064e3b', borderRadius: 10, color: '#d1fae5', fontSize: 12, lineHeight: 18, marginBottom: 12, padding: 12 }, error: { backgroundColor: '#451a1a', borderRadius: 10, color: '#fecaca', fontSize: 12, lineHeight: 18, marginBottom: 12, padding: 12 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }, primaryButton: { alignItems: 'center', backgroundColor: '#34d399', borderRadius: 12, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 13 }, primaryLabel: { color: '#022c22', fontSize: 12, fontWeight: '900' }, secondaryButton: { alignItems: 'center', borderColor: '#475569', borderRadius: 12, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 12 }, disabled: { opacity: 0.5 }, review: { color: '#cbd5e1' },
})
