import { useAuth } from '@clerk/expo'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createLocalIdentifier } from '../../shared/lib/local-identifier'
import {
  createMobileAction,
  loadMobileActionDay,
  loadMobileActionEditor,
  publishMobileAction,
  updateMobileAction,
  type MobileActionDraftPayload,
  type MobileActionDay,
  type MobileOrganizerType,
  SPONTANEOUS_PENDING_ORGANIZER_LABEL,
  isMobileOrganizerType,
} from './mobile-actions-service'

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

type PendingOrganizerOrigin = 'automatic' | 'explicit' | 'unknown'
type StoredDraft = { ownerId?: string; draft?: Draft; actionId?: string | null; section?: Section; published?: boolean; clientRequestId?: string; pendingOrganizerOrigin?: PendingOrganizerOrigin | null }
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

function isPendingOrganizerOrigin(value: unknown): value is PendingOrganizerOrigin {
  return value === 'automatic' || value === 'explicit' || value === 'unknown'
}

function normalizeOrganizerAccounts(value: string): string[] {
  return splitTokens(value)
}

function normalizeOrganizerName(organizerType: MobileOrganizerType | null, organizerName: string, organizerAccounts: string): string {
  const trimmedName = organizerName.trim()
  if (organizerType === 'spontaneous') {
    return trimmedName === SPONTANEOUS_PENDING_ORGANIZER_LABEL || normalizeOrganizerAccounts(organizerAccounts).length > 0
      ? SPONTANEOUS_PENDING_ORGANIZER_LABEL
      : ''
  }
  return trimmedName === SPONTANEOUS_PENDING_ORGANIZER_LABEL ? '' : organizerName
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
    const organizerAccounts = typeof storedDraft?.coorganizers === 'string' ? storedDraft.coorganizers : EMPTY.coorganizers
    const normalizedOrganizerName = normalizeOrganizerName(organizerType, organizerName, organizerAccounts)
    const pendingOrganizerOrigin = organizerType === 'spontaneous' && normalizedOrganizerName === SPONTANEOUS_PENDING_ORGANIZER_LABEL
      ? isPendingOrganizerOrigin(parsed.pendingOrganizerOrigin) ? parsed.pendingOrganizerOrigin : 'unknown'
      : null
    return {
      draft: storedDraft ? { ...EMPTY, ...storedDraft, organizerName: normalizedOrganizerName, organizerType } : undefined,
      ownerId: storedOwnerId,
      actionId: parsed.actionId || undefined,
      section: isSection(parsed.section) ? parsed.section : undefined,
      published: Boolean(parsed.published),
      clientRequestId: typeof parsed.clientRequestId === 'string' && parsed.clientRequestId.trim() ? parsed.clientRequestId : undefined,
      pendingOrganizerOrigin,
    }
  } catch {
    return {}
  }
}

function serializeStoredDraft(ownerId: string, value: Omit<StoredDraft, 'ownerId'>): string {
  return JSON.stringify({ ownerId, ...value })
}

const draftWritesInFlight = new Map<string, Promise<void>>()

type SessionIdentity = { ownerId: string | null; generation: number }
type SessionToken = { ownerId: string; generation: number }
type SessionRef = React.MutableRefObject<SessionIdentity>
type BriefingFeedback = { ownerId: string; actionId: string; generation: number; message: string | null; error: string | null }

function invalidateSession(sessionRef: SessionRef, ownerId: string): SessionToken {
  const generation = sessionRef.current.generation + 1
  sessionRef.current = { ownerId, generation }
  return { ownerId, generation }
}

function captureSession(sessionRef: SessionRef): SessionToken | null {
  const { ownerId, generation } = sessionRef.current
  return ownerId ? { ownerId, generation } : null
}

function isCurrentSession(sessionRef: SessionRef, sessionAtStart: SessionToken | null): boolean {
  return Boolean(
    sessionAtStart
      && sessionRef.current.ownerId === sessionAtStart.ownerId
      && sessionRef.current.generation === sessionAtStart.generation,
  )
}

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
  pendingOrganizerOrigin,
  setPendingOrganizerOrigin,
  setDraft,
  setActionId,
  setSection,
  setPublished,
  setClientRequestId,
  ownerId,
  sessionRef,
}: {
  draft: Draft
  actionId: string | null
  section: Section
  published: boolean
  clientRequestId: string
  pendingOrganizerOrigin: PendingOrganizerOrigin | null
  setPendingOrganizerOrigin: (origin: PendingOrganizerOrigin | null) => void
  setDraft: React.Dispatch<React.SetStateAction<Draft>>
  setActionId: React.Dispatch<React.SetStateAction<string | null>>
  setSection: React.Dispatch<React.SetStateAction<Section>>
  setPublished: React.Dispatch<React.SetStateAction<boolean>>
  setClientRequestId: React.Dispatch<React.SetStateAction<string>>
  ownerId: string | null
  sessionRef: SessionRef
}) {
  const [draftHydrated, setDraftHydrated] = useState(false)
  const [hydratedOwnerId, setHydratedOwnerId] = useState<string | null>(null)
  const [draftReadAttempt, setDraftReadAttempt] = useState(0)
  const [draftReadError, setDraftReadError] = useState(false)
  const [draftWriteError, setDraftWriteError] = useState(false)
  useEffect(() => {
    let active = true
    let readSucceeded = false
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
    setPendingOrganizerOrigin(null)

    if (!scopedKey) return () => { active = false }
    const sessionAtHydration = invalidateSession(sessionRef, ownerId as string)

    const restoreDraft = async () => {
      const isCurrentOwner = () => active && isCurrentSession(sessionRef, sessionAtHydration)
      try {
        const scopedValue = await AsyncStorage.getItem(scopedKey)
        let stored = parseStoredDraft(scopedValue, ownerId)
        if (!scopedValue) {
          // A legacy global draft is migratable only when it carries an exact
          // Clerk owner. An owner-less value is deliberately ignored.
          const legacy = parseStoredDraft(await AsyncStorage.getItem(LEGACY_STORAGE_KEY))
          if (legacy.ownerId === ownerId) stored = legacy
        }
        if (!isCurrentOwner()) return
        if (stored.draft) setDraft(stored.draft)
        if (stored.actionId) setActionId(stored.actionId)
        if (stored.section) setSection(stored.section)
        if (stored.published) setPublished(true)
        if (stored.clientRequestId) setClientRequestId(stored.clientRequestId)
        if (stored.pendingOrganizerOrigin) setPendingOrganizerOrigin(stored.pendingOrganizerOrigin)
        readSucceeded = true
        setHydratedOwnerId(ownerId)
      } catch {
        if (isCurrentOwner()) setDraftReadError(true)
      } finally {
        if (isCurrentOwner() && readSucceeded) setDraftHydrated(true)
      }
    }
    void restoreDraft().catch(() => undefined)
    return () => { active = false }
  }, [draftReadAttempt, ownerId, sessionRef, setActionId, setClientRequestId, setDraft, setPendingOrganizerOrigin, setPublished, setSection])

  useEffect(() => {
    const scopedKey = ownerScopedStorageKey(ownerId)
    if (!draftHydrated || hydratedOwnerId !== ownerId || !scopedKey || !ownerId) return
    const sessionAtStart = captureSession(sessionRef)
    if (!sessionAtStart) return
    let active = true
    setDraftWriteError(false)
    const storedValue = serializeStoredDraft(ownerId, { draft, actionId, section, published, clientRequestId, pendingOrganizerOrigin })
    void queueDraftWrite(scopedKey, storedValue, () => active && isCurrentSession(sessionRef, sessionAtStart) && hydratedOwnerId === sessionAtStart.ownerId).catch(() => {
      if (active && isCurrentSession(sessionRef, sessionAtStart)) setDraftWriteError(true)
    })
    return () => { active = false }
  }, [actionId, clientRequestId, draft, draftHydrated, hydratedOwnerId, ownerId, pendingOrganizerOrigin, published, section, sessionRef])

  return { draftHydrated, hydratedOwnerId, draftReadError, draftWriteError, retryDraftRead: () => setDraftReadAttempt((attempt) => attempt + 1) }
}

function splitTokens(value: string): string[] {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, 20)
}

function buildPayload(draft: Draft, clientRequestId: string): MobileActionDraftPayload {
  const volunteersExpected = Math.max(1, Number(draft.participants) || 1)
  const organizerAccounts = normalizeOrganizerAccounts(draft.coorganizers)
  const enteredOrganizerName = draft.organizerName.trim()
  return {
    clientRequestId,
    actionDate: draft.date,
    locationLabel: draft.location,
    latitude: draft.latitude ? Number(draft.latitude) : undefined,
    longitude: draft.longitude ? Number(draft.longitude) : undefined,
    associationName: draft.organizerType === 'spontaneous' ? 'Action spontanée' : draft.organizerName.trim(),
    organizerName: enteredOrganizerName || undefined,
    organizerType: draft.organizerType,
    organizerAccounts,
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

function getOrganizerSelectionError(payload: MobileActionDraftPayload, pendingOrganizerOrigin: PendingOrganizerOrigin | null): string | null {
  if (payload.organizerType !== 'spontaneous') return null
  const hasOrganizerAccount = (payload.organizerAccounts?.length ?? 0) > 0
  const hasPendingOrganizer = payload.organizerName?.trim() === SPONTANEOUS_PENDING_ORGANIZER_LABEL
  if (hasOrganizerAccount && payload.organizerName?.trim() && !hasPendingOrganizer) {
    return 'Un nom libre ne rattache pas un compte organisateur. Sélectionnez le compte identifié sans nom libre.'
  }
  if (!hasOrganizerAccount && hasPendingOrganizer && pendingOrganizerOrigin !== 'explicit') {
    return 'Resélectionnez explicitement « Organisateur en attente de compte » pour confirmer ce choix.'
  }
  if (!hasOrganizerAccount && !hasPendingOrganizer) {
    return 'Pour une action spontanée, sélectionnez un compte organisateur ou « Organisateur en attente de compte ».'
  }
  return null
}

function isUnauthorized(value: unknown): boolean {
  return (value as { status?: number }).status === 401
}

function isForbidden(value: unknown): boolean {
  return (value as { status?: number }).status === 403
}

function useActionCreateMutations({
  draft,
  actionId,
  published,
  payload,
  pendingOrganizerOrigin,
  draftHydrated,
  draftReadError,
  ownerId,
  onSessionExpired,
  onStartAction,
  setActionId,
  setPublished,
  sessionRef,
}: {
  draft: Draft
  actionId: string | null
  published: boolean
  payload: MobileActionDraftPayload
  pendingOrganizerOrigin: PendingOrganizerOrigin | null
  draftHydrated: boolean
  draftReadError: boolean
  ownerId: string | null
  onSessionExpired: () => void
  onStartAction: (actionId: string, label: string) => void | Promise<void>
  setActionId: React.Dispatch<React.SetStateAction<string | null>>
  setPublished: React.Dispatch<React.SetStateAction<boolean>>
  sessionRef: SessionRef
}) {
  const [busy, setBusy] = useState(false)
  const [briefingBusy, setBriefingBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [briefingFeedback, setBriefingFeedback] = useState<BriefingFeedback | null>(null)
  const [dayBriefing, setDayBriefing] = useState<MobileActionDay | null>(null)
  const briefingContextRef = useRef({ ownerId, actionId })
  const briefingGenerationRef = useRef(0)
  const [briefingGeneration, setBriefingGeneration] = useState(0)
  useLayoutEffect(() => {
    briefingContextRef.current = { ownerId, actionId }
    const nextGeneration = briefingGenerationRef.current + 1
    briefingGenerationRef.current = nextGeneration
    setBriefingGeneration(nextGeneration)
    setDayBriefing(null)
    setBriefingBusy(false)
    setBriefingFeedback(null)
  }, [actionId, ownerId])
  const mutationsBlocked = !ownerId || !draftHydrated || draftReadError || busy || briefingBusy

  useEffect(() => {
    setBusy(false)
    setBriefingBusy(false)
    setMessage(null)
    setError(null)
    setBriefingFeedback(null)
  }, [ownerId])

  function canMutate(sessionAtStart: SessionToken | null): boolean {
    return isCurrentSession(sessionRef, sessionAtStart)
  }

  function canApplyBriefing(sessionAtStart: SessionToken | null, actionAtStart: string, generationAtStart: number): boolean {
    return canMutate(sessionAtStart)
      && briefingContextRef.current.ownerId === sessionAtStart?.ownerId
      && briefingContextRef.current.actionId === actionAtStart
      && briefingGenerationRef.current === generationAtStart
  }

  function handleError(value: unknown) {
    if (isUnauthorized(value)) onSessionExpired()
    else if (isForbidden(value)) setError('Accès refusé pour cette action.')
    else setError(value instanceof Error ? value.message : 'La sauvegarde n’a pas abouti.')
  }

  function getBriefingError(value: unknown): string | null {
    if (isUnauthorized(value)) {
      onSessionExpired()
      return null
    }
    if (isForbidden(value)) return 'Accès refusé pour cette action.'
    return value instanceof Error ? value.message : 'Les informations Préparer / Jour J n’ont pas pu être chargées.'
  }

  async function saveDraft() {
    if (mutationsBlocked) return
    const organizerSelectionError = getOrganizerSelectionError(payload, pendingOrganizerOrigin)
    if (organizerSelectionError) { setError(organizerSelectionError); return }
    const sessionAtStart = captureSession(sessionRef)
    if (!sessionAtStart) return
    setBusy(true); setError(null); setMessage(null)
    try {
      const result = actionId ? await updateMobileAction(actionId, payload) : await createMobileAction(payload)
      if (!canMutate(sessionAtStart)) return
      if (!actionId && 'id' in result) setActionId(result.id)
      setMessage('Brouillon enregistré sur le serveur. Vous pouvez reprendre plus tard.')
    } catch (value) {
      if (canMutate(sessionAtStart)) handleError(value)
    } finally {
      if (canMutate(sessionAtStart)) setBusy(false)
    }
  }

  async function publish() {
    if (mutationsBlocked || published) return
    const organizerSelectionError = getOrganizerSelectionError(payload, pendingOrganizerOrigin)
    if (organizerSelectionError) { setError(organizerSelectionError); return }
    const sessionAtStart = captureSession(sessionRef)
    if (!sessionAtStart) return
    setBusy(true); setError(null); setMessage(null)
    try {
      const currentActionId = actionId ?? (await createMobileAction(payload)).id
      if (!canMutate(sessionAtStart)) return
      if (!actionId) setActionId(currentActionId)
      if (actionId) await updateMobileAction(actionId, payload)
      if (!canMutate(sessionAtStart)) return
      await publishMobileAction(currentActionId)
      if (!canMutate(sessionAtStart)) return
      setPublished(true)
      setMessage('Publication confirmée par le serveur.')
    } catch (value) {
      if (canMutate(sessionAtStart)) handleError(value)
    } finally {
      if (canMutate(sessionAtStart)) setBusy(false)
    }
  }

  async function linkGps() {
    if (!ownerId || !actionId) { setError('Enregistrez le brouillon avant de relier une activité GPS.'); return }
    const sessionAtStart = captureSession(sessionRef)
    if (!sessionAtStart) return
    setBusy(true); setError(null)
    try {
      await onStartAction(actionId, draft.title || draft.location || 'Action mobile')
      if (canMutate(sessionAtStart)) setMessage('Suivi GPS démarré pour cette action. La même mission sera finalisée puis réconciliée.')
    } catch (value) {
      if (canMutate(sessionAtStart)) handleError(value)
    } finally {
      if (canMutate(sessionAtStart)) setBusy(false)
    }
  }

  async function loadDayBriefing() {
    if (!ownerId || !actionId) return
    const sessionAtStart = captureSession(sessionRef)
    if (!sessionAtStart) return
    const actionAtStart = actionId
    const generationAtStart = briefingGenerationRef.current + 1
    briefingGenerationRef.current = generationAtStart
    setBriefingGeneration(generationAtStart)
    setBriefingFeedback(null)
    setBriefingBusy(true)
    try {
      const result = await loadMobileActionDay(actionAtStart)
      if (canApplyBriefing(sessionAtStart, actionAtStart, generationAtStart)) {
        setDayBriefing(result)
        setBriefingFeedback({
          ownerId: sessionAtStart.ownerId,
          actionId: actionAtStart,
          generation: generationAtStart,
          message: 'Les informations Préparer / Jour J ont été chargées depuis le serveur.',
          error: null,
        })
      }
    } catch (value) {
      if (canApplyBriefing(sessionAtStart, actionAtStart, generationAtStart)) {
        setDayBriefing(null)
        const briefingError = getBriefingError(value)
        if (briefingError) {
          setBriefingFeedback({ ownerId: sessionAtStart.ownerId, actionId: actionAtStart, generation: generationAtStart, message: null, error: briefingError })
        }
      }
    } finally {
      if (canMutate(sessionAtStart) && briefingGenerationRef.current === generationAtStart) setBriefingBusy(false)
    }
  }

  const currentBriefingFeedback = briefingFeedback
    && briefingFeedback.ownerId === ownerId
    && briefingFeedback.actionId === actionId
    && briefingFeedback.generation === briefingGeneration
    ? briefingFeedback
    : null
  return {
    busy: busy || briefingBusy,
    message,
    error,
    briefingMessage: currentBriefingFeedback?.message ?? null,
    briefingError: currentBriefingFeedback?.error ?? null,
    dayBriefing,
    setError,
    setMessage,
    mutationsBlocked,
    saveDraft,
    publish,
    linkGps,
    loadDayBriefing,
  }
}

type ActionCreateControllerProps = { onSessionExpired: () => void; onStartAction: (actionId: string, label: string) => void | Promise<void> }

export function useActionCreateController({ onSessionExpired, onStartAction }: ActionCreateControllerProps) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const ownerId = isLoaded && isSignedIn ? normalizeOwnerId(userId) : null
  const sessionRef = useRef<SessionIdentity>({ ownerId, generation: 0 })
  useLayoutEffect(() => {
    if (sessionRef.current.ownerId !== ownerId) {
      sessionRef.current = { ownerId, generation: sessionRef.current.generation + 1 }
    }
  }, [ownerId])
  const [section, setSection] = useState<Section>('essentiel')
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [clientRequestId, setClientRequestId] = useState(() => createLocalIdentifier('action-create'))
  const [actionId, setActionId] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const autoPendingOrganizerRef = useRef(false)
  const [pendingOrganizerOrigin, setPendingOrganizerOriginState] = useState<PendingOrganizerOrigin | null>(null)
  const setPendingOrganizerOrigin = useCallback((origin: PendingOrganizerOrigin | null) => {
    autoPendingOrganizerRef.current = origin === 'automatic'
    setPendingOrganizerOriginState(origin)
  }, [])
  useLayoutEffect(() => {
    setPendingOrganizerOrigin(null)
  }, [ownerId, setPendingOrganizerOrigin])
  const persistence = useActionCreatePersistence({ draft, actionId, section, published, clientRequestId, pendingOrganizerOrigin, setPendingOrganizerOrigin, setDraft, setActionId, setSection, setPublished, setClientRequestId, ownerId, sessionRef })
  const ownerHydrated = Boolean(ownerId && persistence.draftHydrated && persistence.hydratedOwnerId === ownerId)
  const ownerSessionRef = useRef({ ownerId: null as string | null, hydrated: false })
  useLayoutEffect(() => {
    ownerSessionRef.current = { ownerId, hydrated: ownerHydrated }
  }, [ownerId, ownerHydrated])
  const visibleDraft = ownerHydrated ? draft : EMPTY
  const visibleActionId = ownerHydrated ? actionId : null
  const visiblePublished = ownerHydrated ? published : false
  const visibleSection = ownerHydrated ? section : 'essentiel'
  const visibleClientRequestId = ownerHydrated ? clientRequestId : ''
  const payload = useMemo(() => buildPayload(visibleDraft, visibleClientRequestId), [visibleClientRequestId, visibleDraft])
  const mutations = useActionCreateMutations({ draft: visibleDraft, actionId: visibleActionId, published: visiblePublished, payload, pendingOrganizerOrigin: ownerHydrated ? pendingOrganizerOrigin : null, draftHydrated: ownerHydrated, draftReadError: persistence.draftReadError, ownerId, onSessionExpired, onStartAction, setActionId, setPublished, sessionRef })

  useEffect(() => {
    if (!visibleActionId || !ownerId) return
    let active = true
    const sessionAtStart = captureSession(sessionRef)
    loadMobileActionEditor(visibleActionId).catch((value) => {
      if (active && isCurrentSession(sessionRef, sessionAtStart) && isUnauthorized(value)) onSessionExpired()
    })
    return () => { active = false }
  }, [onSessionExpired, ownerId, visibleActionId])

  async function getCurrentPosition() {
    const sessionAtStart = captureSession(sessionRef)
    const isCurrentOwnerHydrated = () => isCurrentSession(sessionRef, sessionAtStart)
      && ownerSessionRef.current.ownerId === sessionAtStart?.ownerId
      && ownerSessionRef.current.hydrated
    if (!isCurrentOwnerHydrated()) return
    const permission = await Location.requestForegroundPermissionsAsync()
    if (!isCurrentOwnerHydrated()) return
    if (permission.status !== 'granted') { mutations.setError('La permission de localisation est nécessaire pour utiliser la position actuelle.'); return }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    if (!isCurrentOwnerHydrated()) return
    setDraft((current) => {
      if (!isCurrentOwnerHydrated()) return current
      return { ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }
    })
    mutations.setMessage('Position actuelle ajoutée. Vérifiez-la avant de sauvegarder.')
  }

  const update = (key: keyof Draft, value: string) => {
    if (!ownerHydrated) return
    setDraft((current) => {
      if (key === 'organizerName') {
        setPendingOrganizerOrigin(value.trim() === SPONTANEOUS_PENDING_ORGANIZER_LABEL ? 'explicit' : null)
        return { ...current, [key]: value }
      }
      if (key === 'coorganizers') {
        const hasOrganizerAccounts = normalizeOrganizerAccounts(value).length > 0
        const clearImplicitPending = current.organizerType === 'spontaneous'
          && !hasOrganizerAccounts
          && autoPendingOrganizerRef.current
          && current.organizerName.trim() === SPONTANEOUS_PENDING_ORGANIZER_LABEL
        if (clearImplicitPending) {
          setPendingOrganizerOrigin(null)
          return { ...current, coorganizers: value, organizerName: '' }
        }
      }
      return { ...current, [key]: value }
    })
  }
  const updateOrganizerType = (organizerType: MobileOrganizerType) => {
    if (ownerHydrated) {
      setDraft((current) => {
        if (current.organizerType === organizerType) return current
        const hasOrganizerAccounts = normalizeOrganizerAccounts(current.coorganizers).length > 0
        setPendingOrganizerOrigin(organizerType === 'spontaneous' && hasOrganizerAccounts ? 'automatic' : null)
        return {
          ...current,
          organizerType,
          organizerName: normalizeOrganizerName(organizerType, '', current.coorganizers),
        }
      })
    }
  }
  return { section: visibleSection, setSection, draft: visibleDraft, update, updateOrganizerType, actionId: visibleActionId, published: visiblePublished, sectionIndex: SECTIONS.findIndex((item) => item.id === visibleSection), getCurrentPosition, ...persistence, ...mutations, setActionId, setPublished }
}
