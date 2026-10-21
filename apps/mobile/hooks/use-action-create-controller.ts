import { useEffect, useMemo, useState } from 'react'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createLinkedMission } from '../lib/linked-mission-service'
import { createLocalIdentifier } from '../lib/local-identifier'
import {
  createMobileAction,
  loadMobileActionDay,
  loadMobileActionEditor,
  publishMobileAction,
  updateMobileAction,
  type MobileActionDraftPayload,
} from '../lib/mobile-actions-service'

export type Section = 'essentiel' | 'terrain' | 'equipe' | 'verification'
export type Draft = {
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

export const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'essentiel', label: 'Essentiel' },
  { id: 'terrain', label: 'Terrain' },
  { id: 'equipe', label: 'Équipe et logistique' },
  { id: 'verification', label: 'Vérifier et publier' },
]

const STORAGE_KEY = 'cleanmymap.mobile.action-create.v1'
const EMPTY: Draft = {
  title: '', description: '', association: 'Mon organisation', date: '', start: '', end: '', location: '',
  latitude: '', longitude: '', meetingPoint: '', materials: '', recommendedMaterials: '', logistics: '', checklist: '', safety: '', accessibility: '', coorganizers: '', invitees: '', departure: '', arrival: '', routeTopology: 'loop', participants: '1',
  duration: '60', notes: '',
}

type StoredDraft = { draft?: Draft; actionId?: string | null; section?: Section; published?: boolean; clientRequestId?: string }

function isSection(value: unknown): value is Section {
  return typeof value === 'string' && SECTIONS.some((item) => item.id === value)
}

function parseStoredDraft(value: string | null): StoredDraft {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as StoredDraft
    return {
      draft: parsed.draft ? { ...EMPTY, ...parsed.draft } : undefined,
      actionId: parsed.actionId || undefined,
      section: isSection(parsed.section) ? parsed.section : undefined,
      published: Boolean(parsed.published),
      clientRequestId: typeof parsed.clientRequestId === 'string' && parsed.clientRequestId.trim() ? parsed.clientRequestId : undefined,
    }
  } catch {
    return {}
  }
}

function useActionCreatePersistence({
  draft,
  actionId,
  section,
  published,
  clientRequestId,
  setDraft,
  setActionId,
  setSection,
  setPublished,
  setClientRequestId,
}: {
  draft: Draft
  actionId: string | null
  section: Section
  published: boolean
  clientRequestId: string
  setDraft: React.Dispatch<React.SetStateAction<Draft>>
  setActionId: React.Dispatch<React.SetStateAction<string | null>>
  setSection: React.Dispatch<React.SetStateAction<Section>>
  setPublished: React.Dispatch<React.SetStateAction<boolean>>
  setClientRequestId: React.Dispatch<React.SetStateAction<string>>
}) {
  const [draftHydrated, setDraftHydrated] = useState(false)
  const [draftReadAttempt, setDraftReadAttempt] = useState(0)
  const [draftReadError, setDraftReadError] = useState(false)
  const [draftWriteError, setDraftWriteError] = useState(false)

  useEffect(() => {
    let active = true
    let readSucceeded = false
    setDraftHydrated(false)
    setDraftReadError(false)
    const restoreDraft = async () => {
      try {
        const stored = parseStoredDraft(await AsyncStorage.getItem(STORAGE_KEY))
        if (!active) return
        if (stored.draft) setDraft(stored.draft)
        if (stored.actionId) setActionId(stored.actionId)
        if (stored.section) setSection(stored.section)
        if (stored.published) setPublished(true)
        if (stored.clientRequestId) setClientRequestId(stored.clientRequestId)
        readSucceeded = true
      } catch {
        if (active) setDraftReadError(true)
      } finally {
        if (active && readSucceeded) setDraftHydrated(true)
      }
    }
    void restoreDraft()
    return () => { active = false }
  }, [draftReadAttempt, setActionId, setClientRequestId, setDraft, setPublished, setSection])

  useEffect(() => {
    if (!draftHydrated) return
    let active = true
    setDraftWriteError(false)
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ draft, actionId, section, published, clientRequestId })).catch(() => {
      if (active) setDraftWriteError(true)
    })
    return () => { active = false }
  }, [actionId, clientRequestId, draft, draftHydrated, published, section])

  return { draftHydrated, draftReadError, draftWriteError, retryDraftRead: () => setDraftReadAttempt((attempt) => attempt + 1) }
}

function splitTokens(value: string): string[] {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, 20)
}

function buildPayload(draft: Draft, clientRequestId: string): MobileActionDraftPayload {
  const volunteersExpected = Math.max(1, Number(draft.participants) || 1)
  return {
    clientRequestId,
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
    volunteersCount: volunteersExpected,
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
      volunteersExpected,
      groupJoinEnabled: true,
      actionDate: draft.date,
      preparationChecklist: draft.checklist.split('\n').map((label, index) => ({ key: `mobile-${index + 1}`, label: label.trim(), checked: false })).filter((item) => item.label).slice(0, 12),
      routeTopology: draft.routeTopology,
    },
  }
}

function isUnauthorized(value: unknown): boolean {
  return (value as { status?: number }).status === 401
}

function useActionCreateMutations({
  draft,
  actionId,
  published,
  payload,
  draftHydrated,
  draftReadError,
  onSessionExpired,
  setActionId,
  setPublished,
}: {
  draft: Draft
  actionId: string | null
  published: boolean
  payload: MobileActionDraftPayload
  draftHydrated: boolean
  draftReadError: boolean
  onSessionExpired: () => void
  setActionId: React.Dispatch<React.SetStateAction<string | null>>
  setPublished: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mutationsBlocked = !draftHydrated || draftReadError || busy

  function handleError(value: unknown) {
    if (isUnauthorized(value)) onSessionExpired()
    else setError(value instanceof Error ? value.message : 'La sauvegarde n’a pas abouti.')
  }

  async function saveDraft() {
    if (mutationsBlocked) return
    setBusy(true); setError(null); setMessage(null)
    try {
      const result = actionId ? await updateMobileAction(actionId, payload) : await createMobileAction(payload)
      if (!actionId && 'id' in result) setActionId(result.id)
      setMessage('Brouillon enregistré sur le serveur. Vous pouvez reprendre plus tard.')
    } catch (value) { handleError(value) } finally { setBusy(false) }
  }

  async function publish() {
    if (mutationsBlocked || published) return
    setBusy(true); setError(null); setMessage(null)
    try {
      const currentActionId = actionId ?? (await createMobileAction(payload)).id
      if (!actionId) setActionId(currentActionId)
      if (actionId) await updateMobileAction(actionId, payload)
      await publishMobileAction(currentActionId)
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

  return { busy, message, error, setError, setMessage, mutationsBlocked, saveDraft, publish, linkGps, loadDayBriefing }
}

type ActionCreateControllerProps = { onSessionExpired: () => void }

export function useActionCreateController({ onSessionExpired }: ActionCreateControllerProps) {
  const [section, setSection] = useState<Section>('essentiel')
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [clientRequestId, setClientRequestId] = useState(() => createLocalIdentifier('action-create'))
  const [actionId, setActionId] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const persistence = useActionCreatePersistence({ draft, actionId, section, published, clientRequestId, setDraft, setActionId, setSection, setPublished, setClientRequestId })
  const payload = useMemo(() => buildPayload(draft, clientRequestId), [clientRequestId, draft])
  const mutations = useActionCreateMutations({ draft, actionId, published, payload, draftHydrated: persistence.draftHydrated, draftReadError: persistence.draftReadError, onSessionExpired, setActionId, setPublished })

  useEffect(() => {
    if (!actionId) return
    void loadMobileActionEditor(actionId).catch((value) => {
      if (isUnauthorized(value)) onSessionExpired()
    })
  }, [actionId, onSessionExpired])

  async function getCurrentPosition() {
    const permission = await Location.requestForegroundPermissionsAsync()
    if (permission.status !== 'granted') { mutations.setError('La permission de localisation est nécessaire pour utiliser la position actuelle.'); return }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    setDraft((current) => ({ ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }))
    mutations.setMessage('Position actuelle ajoutée. Vérifiez-la avant de sauvegarder.')
  }

  const update = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }))
  return { section, setSection, draft, update, actionId, published, sectionIndex: SECTIONS.findIndex((item) => item.id === section), getCurrentPosition, ...persistence, ...mutations, setActionId, setPublished }
}
