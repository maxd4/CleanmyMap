import { useAuth } from '@clerk/expo'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createLocalIdentifier } from '../lib/local-identifier'
import {
  createMobileAction,
  loadMobileActionDay,
  loadMobileActionEditor,
  publishMobileAction,
  updateMobileAction,
  type MobileActionDraftPayload,
  type MobileActionDay,
  type MobileOrganizerType,
  isMobileOrganizerType,
} from '../lib/mobile-actions-service'

export type Section = 'essentiel' | 'terrain' | 'equipe' | 'verification'
export type Draft = {
  title: string
  description: string
  organizerName: string
  organizerType: MobileOrganizerType | null
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

const STORAGE_KEY_PREFIX = 'cleanmymap.mobile.action-create.v1'
const LEGACY_STORAGE_KEY = STORAGE_KEY_PREFIX
const EMPTY: Draft = {
  title: '', description: '', organizerName: '', organizerType: null, date: '', start: '', end: '', location: '',
  latitude: '', longitude: '', meetingPoint: '', materials: '', recommendedMaterials: '', logistics: '', checklist: '', safety: '', accessibility: '', coorganizers: '', invitees: '', departure: '', arrival: '', routeTopology: 'loop', participants: '1',
  duration: '60', notes: '',
}

type StoredDraft = { ownerId?: string; draft?: Draft; actionId?: string | null; section?: Section; published?: boolean; clientRequestId?: string }
type StoredDraftInput = Partial<Draft> & { association?: unknown; organizerType?: unknown; organizerName?: unknown }

function normalizeOwnerId(ownerId: string | null | undefined): string | null {
  const normalized = ownerId?.trim() ?? ''
  return /^[A-Za-z0-9_-]+$/.test(normalized) ? normalized : null
}

function ownerScopedStorageKey(ownerId: string | null): string | null {
  const normalizedOwnerId = normalizeOwnerId(ownerId)
  return normalizedOwnerId ? `${STORAGE_KEY_PREFIX}:${normalizedOwnerId}` : null
}

function isSection(value: unknown): value is Section {
  return typeof value === 'string' && SECTIONS.some((item) => item.id === value)
}

function parseStoredDraft(value: string | null, expectedOwnerId?: string | null): StoredDraft {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as StoredDraft
    const storedOwnerId = normalizeOwnerId(parsed.ownerId ?? undefined) ?? undefined
    if (expectedOwnerId && storedOwnerId && storedOwnerId !== expectedOwnerId) return {}
    const storedDraft = parsed.draft as StoredDraftInput | undefined
    const organizerName = typeof storedDraft?.organizerName === 'string'
      ? storedDraft.organizerName
      : typeof storedDraft?.association === 'string'
        ? storedDraft.association
        : EMPTY.organizerName
    const organizerType = isMobileOrganizerType(storedDraft?.organizerType) ? storedDraft.organizerType : null
    return {
      draft: storedDraft ? { ...EMPTY, ...storedDraft, organizerName, organizerType } : undefined,
      ownerId: storedOwnerId,
      actionId: parsed.actionId || undefined,
      section: isSection(parsed.section) ? parsed.section : undefined,
      published: Boolean(parsed.published),
      clientRequestId: typeof parsed.clientRequestId === 'string' && parsed.clientRequestId.trim() ? parsed.clientRequestId : undefined,
    }
  } catch {
    return {}
  }
}

function serializeStoredDraft(ownerId: string, value: Omit<StoredDraft, 'ownerId'>): string {
  return JSON.stringify({ ownerId, ...value })
}

const draftWritesInFlight = new Map<string, Promise<void>>()

function queueDraftWrite(key: string, value: string, canWrite: () => boolean): Promise<void> {
  const previous = draftWritesInFlight.get(key) ?? Promise.resolve()
  const mutation = previous.then(async () => {
    if (!canWrite()) return
    await AsyncStorage.setItem(key, value)
  }, async () => {
    if (!canWrite()) return
    await AsyncStorage.setItem(key, value)
  })
  const settled = mutation.then(() => undefined, () => undefined)
  draftWritesInFlight.set(key, settled)
  void settled.then(() => {
    if (draftWritesInFlight.get(key) === settled) draftWritesInFlight.delete(key)
  }).catch(() => undefined)
  return mutation
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
  ownerId,
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
  ownerId: string | null
}) {
  const [draftHydrated, setDraftHydrated] = useState(false)
  const [hydratedOwnerId, setHydratedOwnerId] = useState<string | null>(null)
  const [draftReadAttempt, setDraftReadAttempt] = useState(0)
  const [draftReadError, setDraftReadError] = useState(false)
  const [draftWriteError, setDraftWriteError] = useState(false)
  const currentOwnerRef = useRef<string | null>(ownerId)

  useEffect(() => {
    let active = true
    let readSucceeded = false
    currentOwnerRef.current = ownerId
    const scopedKey = ownerScopedStorageKey(ownerId)
    setDraftHydrated(false)
    setHydratedOwnerId(null)
    setDraftReadError(false)
    setDraftWriteError(false)
    setDraft(EMPTY)
    setActionId(null)
    setSection('essentiel')
    setPublished(false)
    setClientRequestId(createLocalIdentifier('action-create'))

    if (!scopedKey) return () => { active = false }

    const restoreDraft = async () => {
      try {
        const scopedValue = await AsyncStorage.getItem(scopedKey)
        let stored = parseStoredDraft(scopedValue, ownerId)
        if (!scopedValue) {
          // A legacy global draft is migratable only when it carries an exact
          // Clerk owner. An owner-less value is deliberately ignored.
          const legacy = parseStoredDraft(await AsyncStorage.getItem(LEGACY_STORAGE_KEY))
          if (legacy.ownerId === ownerId) stored = legacy
        }
        if (!active) return
        if (currentOwnerRef.current !== ownerId) return
        if (stored.draft) setDraft(stored.draft)
        if (stored.actionId) setActionId(stored.actionId)
        if (stored.section) setSection(stored.section)
        if (stored.published) setPublished(true)
        if (stored.clientRequestId) setClientRequestId(stored.clientRequestId)
        readSucceeded = true
        setHydratedOwnerId(ownerId)
      } catch {
        if (active) setDraftReadError(true)
      } finally {
        if (active && readSucceeded) setDraftHydrated(true)
      }
    }
    void restoreDraft().catch(() => undefined)
    return () => { active = false }
  }, [draftReadAttempt, ownerId, setActionId, setClientRequestId, setDraft, setPublished, setSection])

  useEffect(() => {
    const scopedKey = ownerScopedStorageKey(ownerId)
    if (!draftHydrated || !scopedKey || !ownerId) return
    let active = true
    setDraftWriteError(false)
    const storedValue = serializeStoredDraft(ownerId, { draft, actionId, section, published, clientRequestId })
    void queueDraftWrite(scopedKey, storedValue, () => active && currentOwnerRef.current === ownerId).catch(() => {
      if (active) setDraftWriteError(true)
    })
    return () => { active = false }
  }, [actionId, clientRequestId, draft, draftHydrated, ownerId, published, section])

  return { draftHydrated, hydratedOwnerId, draftReadError, draftWriteError, retryDraftRead: () => setDraftReadAttempt((attempt) => attempt + 1) }
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
    associationName: draft.organizerType === 'spontaneous' ? 'Action spontanée' : draft.organizerName.trim(),
    organizerName: draft.organizerName.trim() || undefined,
    organizerType: draft.organizerType,
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
  ownerId,
  onSessionExpired,
  onStartAction,
  setActionId,
  setPublished,
}: {
  draft: Draft
  actionId: string | null
  published: boolean
  payload: MobileActionDraftPayload
  draftHydrated: boolean
  draftReadError: boolean
  ownerId: string | null
  onSessionExpired: () => void
  onStartAction: (actionId: string, label: string) => void | Promise<void>
  setActionId: React.Dispatch<React.SetStateAction<string | null>>
  setPublished: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dayBriefing, setDayBriefing] = useState<MobileActionDay | null>(null)
  const currentOwnerRef = useRef<string | null>(ownerId)
  const mutationsBlocked = !ownerId || !draftHydrated || draftReadError || busy

  useEffect(() => {
    currentOwnerRef.current = ownerId
    setBusy(false)
    setMessage(null)
    setError(null)
  }, [ownerId])

  useEffect(() => {
    setDayBriefing(null)
  }, [actionId, ownerId])

  function canMutate(ownerAtStart: string | null): boolean {
    return Boolean(ownerAtStart && currentOwnerRef.current === ownerAtStart)
  }

  function handleError(value: unknown) {
    if (isUnauthorized(value)) onSessionExpired()
    else setError(value instanceof Error ? value.message : 'La sauvegarde n’a pas abouti.')
  }

  async function saveDraft() {
    if (mutationsBlocked) return
    const ownerAtStart = ownerId
    setBusy(true); setError(null); setMessage(null)
    try {
      const result = actionId ? await updateMobileAction(actionId, payload) : await createMobileAction(payload)
      if (!canMutate(ownerAtStart)) return
      if (!actionId && 'id' in result) setActionId(result.id)
      setMessage('Brouillon enregistré sur le serveur. Vous pouvez reprendre plus tard.')
    } catch (value) {
      if (canMutate(ownerAtStart)) handleError(value)
    } finally { setBusy(false) }
  }

  async function publish() {
    if (mutationsBlocked || published) return
    const ownerAtStart = ownerId
    setBusy(true); setError(null); setMessage(null)
    try {
      const currentActionId = actionId ?? (await createMobileAction(payload)).id
      if (!canMutate(ownerAtStart)) return
      if (!actionId) setActionId(currentActionId)
      if (actionId) await updateMobileAction(actionId, payload)
      if (!canMutate(ownerAtStart)) return
      await publishMobileAction(currentActionId)
      if (!canMutate(ownerAtStart)) return
      setPublished(true)
      setMessage('Publication confirmée par le serveur.')
    } catch (value) {
      if (canMutate(ownerAtStart)) handleError(value)
    } finally { setBusy(false) }
  }

  async function linkGps() {
    if (!ownerId || !actionId) { setError('Enregistrez le brouillon avant de relier une activité GPS.'); return }
    const ownerAtStart = ownerId
    setBusy(true); setError(null)
    try {
      await onStartAction(actionId, draft.title || draft.location || 'Action mobile')
      if (canMutate(ownerAtStart)) setMessage('Suivi GPS démarré pour cette action. La même mission sera finalisée puis réconciliée.')
    } catch (value) {
      if (canMutate(ownerAtStart)) handleError(value)
    } finally { setBusy(false) }
  }

  async function loadDayBriefing() {
    if (!ownerId || !actionId) return
    const ownerAtStart = ownerId
    setBusy(true); setError(null)
    try {
      const result = await loadMobileActionDay(actionId)
      if (canMutate(ownerAtStart)) {
        setDayBriefing(result)
        setMessage('Les informations Préparer / Jour J ont été chargées depuis le serveur.')
      }
    } catch (value) {
      if (canMutate(ownerAtStart)) handleError(value)
    } finally { setBusy(false) }
  }

  return { busy, message, error, dayBriefing, setError, setMessage, mutationsBlocked, saveDraft, publish, linkGps, loadDayBriefing }
}

type ActionCreateControllerProps = { onSessionExpired: () => void; onStartAction: (actionId: string, label: string) => void | Promise<void> }

export function useActionCreateController({ onSessionExpired, onStartAction }: ActionCreateControllerProps) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const ownerId = isLoaded && isSignedIn ? normalizeOwnerId(userId) : null
  const [section, setSection] = useState<Section>('essentiel')
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [clientRequestId, setClientRequestId] = useState(() => createLocalIdentifier('action-create'))
  const [actionId, setActionId] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const persistence = useActionCreatePersistence({ draft, actionId, section, published, clientRequestId, setDraft, setActionId, setSection, setPublished, setClientRequestId, ownerId })
  const ownerHydrated = Boolean(ownerId && persistence.draftHydrated && persistence.hydratedOwnerId === ownerId)
  const visibleDraft = ownerHydrated ? draft : EMPTY
  const visibleActionId = ownerHydrated ? actionId : null
  const visiblePublished = ownerHydrated ? published : false
  const visibleSection = ownerHydrated ? section : 'essentiel'
  const visibleClientRequestId = ownerHydrated ? clientRequestId : ''
  const payload = useMemo(() => buildPayload(visibleDraft, visibleClientRequestId), [visibleClientRequestId, visibleDraft])
  const mutations = useActionCreateMutations({ draft: visibleDraft, actionId: visibleActionId, published: visiblePublished, payload, draftHydrated: ownerHydrated, draftReadError: persistence.draftReadError, ownerId, onSessionExpired, onStartAction, setActionId, setPublished })

  useEffect(() => {
    if (!visibleActionId || !ownerId) return
    let active = true
    loadMobileActionEditor(visibleActionId).catch((value) => {
      if (active && isUnauthorized(value)) onSessionExpired()
    })
    return () => { active = false }
  }, [onSessionExpired, ownerId, visibleActionId])

  async function getCurrentPosition() {
    const permission = await Location.requestForegroundPermissionsAsync()
    if (permission.status !== 'granted') { mutations.setError('La permission de localisation est nécessaire pour utiliser la position actuelle.'); return }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    if (!ownerHydrated) return
    setDraft((current) => ({ ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }))
    mutations.setMessage('Position actuelle ajoutée. Vérifiez-la avant de sauvegarder.')
  }

  const update = (key: keyof Draft, value: string) => {
    if (ownerHydrated) setDraft((current) => ({ ...current, [key]: value }))
  }
  return { section: visibleSection, setSection, draft: visibleDraft, update, actionId: visibleActionId, published: visiblePublished, sectionIndex: SECTIONS.findIndex((item) => item.id === visibleSection), getCurrentPosition, ...persistence, ...mutations, setActionId, setPublished }
}
