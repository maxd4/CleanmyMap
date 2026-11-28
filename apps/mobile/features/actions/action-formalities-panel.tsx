import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@clerk/expo'
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import {
  loadMobileActionFormalities,
  loadMobileActionFormalitiesContacts,
  updateMobileActionFormality,
  updateMobileActionFormalitiesFacts,
  type MobileActionFormalities,
  type MobileActionFormalitiesFacts,
  type MobileActionFormalitiesContacts,
  type MobileFormalitiesContact,
} from './mobile-actions-service'

type SelectedNeed = { id: string; label: string }
type Transition = MobileActionFormalities['availableTransitions'][string][number]

const STATUS_LABELS: Record<string, string> = {
  not_started: 'À préparer',
  prepared: 'Préparée',
  sent: 'Envoi déclaré',
  receipt_received: 'Récépissé déclaré reçu',
  authorization_obtained: 'Autorisation déclarée obtenue',
  refused: 'Refus déclaré reçu',
}
const TRANSITION_LABELS: Record<Transition, string> = {
  mark_prepared: 'Marquer préparée',
  declare_sent: 'Déclarer l’envoi',
  record_receipt: 'Déclarer le récépissé reçu',
  record_authorization: 'Déclarer l’autorisation obtenue',
  record_refusal: 'Déclarer le refus reçu',
}
const PROCEDURE_LABELS: Record<string, string> = {
  city_aot: 'Autorisation d’occupation',
  police_declaration: 'Déclaration de manifestation',
  police_authorization: 'Accord de sécurité et d’ordre public',
  other_manager: 'Accord du gestionnaire',
  information_only: 'Information pratique',
  none: 'Aucune formalité identifiée',
  unknown: 'Règle à confirmer',
}
const LOAD_ERROR = 'Impossible de charger la qualification. Réessayez.'
const MANAGER_LABELS: Record<MobileActionFormalitiesFacts['manager']['kind'], string> = {
  paris_city: 'Ville de Paris', state: 'État', sncf: 'SNCF', haropa: 'HAROPA',
  other_public: 'Autre gestionnaire public', private: 'Gestionnaire privé', unknown: 'À préciser',
}

function requirementLabel(status: string) {
  if (status === 'required') return 'Obligatoire selon la règle'
  if (status === 'recommended') return 'Recommandé'
  if (status === 'not_required') return 'Non requis dans ce cas'
  return 'À confirmer'
}

function groupByRecipient(formalities: MobileActionFormalities['qualification']['formalities']) {
  const groups = new Map<string, typeof formalities>()
  for (const item of formalities) {
    const recipient = item.recipient?.trim() || item.competentAuthority.label
    groups.set(recipient, [...(groups.get(recipient) ?? []), item])
  }
  return [...groups.entries()].map(([recipient, items]) => ({ recipient, items }))
}

async function openExternal(url: string) {
  await Linking.openURL(url)
}

function ExternalLink({ label, url, onError }: { label: string; url: string; onError: (message: string) => void }) {
  if (!url) return <Text style={styles.caption}>{label}</Text>
  return <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={() => { void openExternal(url).catch(() => onError('Impossible d’ouvrir ce lien. Copiez-le ou réessayez plus tard.')) }} hitSlop={8}>
    <Text style={styles.link}>{label}</Text>
  </Pressable>
}

function FormalityRow({
  item,
  data,
  busy,
  expanded,
  onToggleDetails,
  onTransition,
  onLinkError,
}: {
  item: MobileActionFormalities['qualification']['formalities'][number]
  data: MobileActionFormalities
  busy: boolean
  expanded: boolean
  onToggleDetails: () => void
  onTransition: (formalityId: string, kind: Transition) => void
  onLinkError: (message: string) => void
}) {
  const progress = data.workflow.progress.find(value => value.formalityId === item.id)
  const status = STATUS_LABELS[progress?.userStatus ?? 'not_started'] ?? 'À confirmer'
  const stale = progress?.validForQualification === false
  const statusNeedsAction = item.requirementStatus === 'required' && !stale && (progress?.userStatus === 'refused' || progress?.userStatus === 'not_started' || progress?.userStatus === 'prepared')
  return <View style={styles.formality}>
    <View style={styles.badgeRow}>
      <Text style={[styles.badge, item.requirementStatus === 'required' ? styles.required : styles.optional]}>{requirementLabel(item.requirementStatus)}</Text>
      <Text style={[styles.badge, statusNeedsAction || stale ? styles.attention : styles.neutral]}>{status}</Text>
    </View>
    <Text style={styles.procedure}>{PROCEDURE_LABELS[item.procedureKind] ?? 'Procédure locale à vérifier'}</Text>
    <Text style={styles.body}>{item.justification}</Text>
    {item.deadline ? <Text style={styles.body}><Text style={styles.strong}>Délai minimum : </Text>{item.deadline.minimumValue} {item.deadline.unit === 'months' ? 'mois' : 'jours'}. {item.deadline.note}</Text> : item.requirementStatus === 'required' ? <Text style={styles.attentionText}>Délai à confirmer auprès de l’autorité.</Text> : null}
    {item.source ? <View><Text style={styles.caption}>Source :</Text><ExternalLink label={item.source.title} url={item.source.url ?? ''} onError={onLinkError} />{item.source.verifiedOn ? <Text style={styles.caption}>Vérifiée le {item.source.verifiedOn}</Text> : null}</View> : <Text style={styles.attentionText}>Source officielle à confirmer.</Text>}
    {item.officialChannel ? <ExternalLink label={item.officialChannel.label} url={item.officialChannel.url ?? ''} onError={onLinkError} /> : <Text style={styles.caption}>Canal officiel à confirmer.</Text>}
    {(data.availableTransitions[item.id] ?? []).length ? <View style={styles.transitionList}>
      {(data.availableTransitions[item.id] ?? []).map(kind => <Pressable key={kind} disabled={busy} onPress={() => onTransition(item.id, kind)} accessibilityRole="button" accessibilityState={{ disabled: busy }} style={[styles.button, busy && styles.disabled]}>
        <Text style={styles.buttonText}>{TRANSITION_LABELS[kind]}</Text>
      </Pressable>)}
    </View> : null}
    <Pressable onPress={onToggleDetails} accessibilityRole="button" accessibilityState={{ expanded }} style={styles.detailToggle}>
      <Text style={styles.link}>{expanded ? 'Masquer les détails' : 'Périmètre, informations et pièces'}</Text>
    </Pressable>
    {expanded ? <View style={styles.details}>
      <Text style={styles.body}><Text style={styles.strong}>Périmètre : </Text>{item.scope}</Text>
      {item.requestedInformation.length ? <View><Text style={styles.strong}>Informations à préparer</Text>{item.requestedInformation.map(value => <Text key={value} style={styles.body}>• {value}</Text>)}</View> : null}
      {item.requestedDocuments.length ? <View><Text style={styles.strong}>Pièces à préparer</Text>{item.requestedDocuments.map(value => <Text key={value} style={styles.body}>• {value}</Text>)}</View> : <Text style={styles.body}>Pièces supplémentaires : à confirmer dans la source officielle.</Text>}
    </View> : null}
    {progress?.proof ? <Text style={styles.caption}>Déclaration enregistrée le {new Date(progress.proof.recordedAt).toLocaleDateString('fr-FR')} ; non vérifiée auprès de l’administration.</Text> : null}
    {stale ? <Text style={styles.attentionText}>Les faits ont changé : cette démarche doit être revue.</Text> : null}
  </View>
}

function ContactRow({ contact, onLinkError }: { contact: MobileFormalitiesContact; onLinkError: (message: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  return <View style={styles.contact}>
    <Pressable onPress={() => setExpanded(value => !value)} accessibilityRole="button" accessibilityState={{ expanded }} style={styles.contactToggle}>
      <Text style={styles.contactName}>{contact.name}</Text>
      <Text style={styles.caption}>Lien territorial officiel : {contact.communeCodes.join(', ') || 'à vérifier'}</Text>
    </Pressable>
    {expanded ? <View style={styles.details}>
      {contact.types.length ? <Text style={styles.caption}>Services : {contact.types.join(', ')}</Text> : null}
      <ExternalLink label="Fiche officielle du service" url={contact.directoryUrl} onError={onLinkError} />
      {contact.formUrl ? <ExternalLink label="Ouvrir le formulaire du service" url={contact.formUrl} onError={onLinkError} /> : null}
      {contact.phones.map(phone => <ExternalLink key={phone} label={`Appeler ${phone}`} url={`tel:${phone.replace(/[^+0-9]/g, '')}`} onError={onLinkError} />)}
      {contact.emails.map(email => <ExternalLink key={email} label={`Écrire à ${email}`} url={`mailto:${email}`} onError={onLinkError} />)}
      {contact.websites.map(url => <ExternalLink key={url} label="Site officiel" url={url} onError={onLinkError} />)}
      <Text style={styles.caption}>Lien DILA avec la commune vérifié. Rôle pour cette demande, disponibilité et accord à confirmer. Fiche consultée le {contact.retrievedAt.slice(0, 10)}.</Text>
    </View> : null}
  </View>
}

export function ActionFormalitiesPanel({ actionId, selectedNeeds = [] }: { actionId: string | null; selectedNeeds?: readonly SelectedNeed[] }) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const ownerId = isLoaded && isSignedIn ? userId : null
  const requestContextRef = useRef({ actionId, ownerId, generation: 0 })
  const mutationRef = useRef<number | null>(null)
  const mutationSequenceRef = useRef(0)
  const contactRequestRef = useRef<number | null>(null)
  const contactSequenceRef = useRef(0)
  const [data, setData] = useState<MobileActionFormalities | null>(null)
  const [contacts, setContacts] = useState<MobileActionFormalitiesContacts | null>(null)
  const [contactsContext, setContactsContext] = useState<{ actionId: string; ownerId: string | null; generation: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contactError, setContactError] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchingContacts, setSearchingContacts] = useState(false)
  const [busyMutation, setBusyMutation] = useState(false)
  const [failedFacts, setFailedFacts] = useState<MobileActionFormalitiesFacts | null>(null)
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(() => new Set())
  const [visibleContactCount, setVisibleContactCount] = useState(6)

  useLayoutEffect(() => {
    const previous = requestContextRef.current
    if (previous.actionId !== actionId || previous.ownerId !== ownerId) {
      requestContextRef.current = { actionId, ownerId, generation: previous.generation + 1 }
      mutationRef.current = null
      contactRequestRef.current = null
      setData(null)
      setContacts(null)
      setContactsContext(null)
      setError(null)
      setContactError(null)
      setFailedFacts(null)
      setLoading(Boolean(actionId))
      setSearchingContacts(false)
      setBusyMutation(false)
    }
  }, [actionId, ownerId])

  const isCurrentContext = useCallback((captured: typeof requestContextRef.current) => {
    const current = requestContextRef.current
    return current.actionId === captured.actionId && current.ownerId === captured.ownerId && current.generation === captured.generation
  }, [])

  const reload = useCallback(async () => {
    if (!actionId) return
    const captured = requestContextRef.current
    setLoading(true)
    setError(null)
    setFailedFacts(null)
    try {
      const next = await loadMobileActionFormalities(actionId)
      if (isCurrentContext(captured)) setData(next)
    } catch {
      if (isCurrentContext(captured)) setError(LOAD_ERROR)
    } finally {
      if (isCurrentContext(captured)) setLoading(false)
    }
  }, [actionId, isCurrentContext])

  useEffect(() => {
    setData(null)
    setContacts(null)
    setContactsContext(null)
    setError(null)
    setContactError(null)
    setExpandedDetails(new Set())
    if (actionId) void reload()
  }, [actionId, ownerId, reload])

  const contactHeading = useMemo(() => selectedNeeds.map(item => item.label).join(' · '), [selectedNeeds])

  async function searchContacts() {
    if (!actionId || contactRequestRef.current !== null) return
    const captured = requestContextRef.current
    const requestId = ++contactSequenceRef.current
    contactRequestRef.current = requestId
    setSearchingContacts(true)
    setContacts(null)
    setContactsContext(null)
    setContactError(null)
    setVisibleContactCount(6)
    try {
      const next = await loadMobileActionFormalitiesContacts(actionId, selectedNeeds.map(item => item.id))
      if (isCurrentContext(captured) && contactRequestRef.current === requestId) {
        setContacts(next)
        setContactsContext({ actionId, ownerId: captured.ownerId, generation: captured.generation })
      }
    } catch {
      if (isCurrentContext(captured) && contactRequestRef.current === requestId) setContactError('Annuaire indisponible. Réessayez ou consultez l’annuaire officiel.')
    } finally {
      if (isCurrentContext(captured) && contactRequestRef.current === requestId) {
        contactRequestRef.current = null
        setSearchingContacts(false)
      }
    }
  }

  async function transition(formalityId: string, kind: Transition) {
    if (!actionId || mutationRef.current !== null) return
    const captured = requestContextRef.current
    const mutationId = ++mutationSequenceRef.current
    mutationRef.current = mutationId
    setBusyMutation(true)
    setError(null)
    setFailedFacts(null)
    try {
      const next = await updateMobileActionFormality(actionId, formalityId, kind)
      if (isCurrentContext(captured) && mutationRef.current === mutationId) setData(next)
    } catch {
      if (isCurrentContext(captured) && mutationRef.current === mutationId) setError('État non enregistré. Réessayez ; vérifiez ensuite la démarche affichée.')
    } finally {
      if (isCurrentContext(captured) && mutationRef.current === mutationId) {
        mutationRef.current = null
        setBusyMutation(false)
      }
    }
  }

  async function updateFacts(facts: MobileActionFormalitiesFacts) {
    if (!actionId || mutationRef.current !== null) return
    const captured = requestContextRef.current
    const mutationId = ++mutationSequenceRef.current
    mutationRef.current = mutationId
    setBusyMutation(true)
    setError(null)
    setFailedFacts(null)
    try {
      const next = await updateMobileActionFormalitiesFacts(actionId, facts)
      if (isCurrentContext(captured) && mutationRef.current === mutationId) setData(next)
    } catch {
      if (isCurrentContext(captured) && mutationRef.current === mutationId) {
        setFailedFacts(facts)
        setError('Informations non enregistrées. Réessayez ; les obligations affichées restent celles du dernier calcul réussi.')
      }
    } finally {
      if (isCurrentContext(captured) && mutationRef.current === mutationId) {
        mutationRef.current = null
        setBusyMutation(false)
      }
    }
  }

  function cycleFact(key: keyof Omit<MobileActionFormalitiesFacts, 'territory' | 'manager' | 'isCleanwalk'>) {
    if (!data) return
    const current = data.facts[key]
    const next = current === 'unknown' ? true : current === true ? false : 'unknown'
    void updateFacts({ ...data.facts, [key]: next })
  }

  function cyclePublicSpace() {
    if (!data) return
    const next = data.facts.publicSpace === 'unknown' ? 'public_domain' : data.facts.publicSpace === 'public_domain' ? 'private_domain' : 'unknown'
    void updateFacts({ ...data.facts, publicSpace: next })
  }

  function cycleManager() {
    if (!data) return
    const kinds: MobileActionFormalitiesFacts['manager']['kind'][] = ['unknown', 'paris_city', 'state', 'sncf', 'haropa', 'other_public', 'private']
    const currentIndex = kinds.indexOf(data.facts.manager.kind)
    const kind = kinds[(currentIndex + 1) % kinds.length]!
    void updateFacts({ ...data.facts, manager: { kind, label: null } })
  }

  const factStateLabel = (value: boolean | 'unknown') => value === true ? 'Oui' : value === false ? 'Non' : 'À préciser'

  const visibleData = data?.actionId === actionId ? data : null
  const visibleContactData = contactsContext?.actionId === actionId && contactsContext.ownerId === ownerId ? contacts : null
  const required = visibleData?.qualification.formalities.filter(item => item.requirementStatus === 'required') ?? []
  const other = visibleData?.qualification.formalities.filter(item => item.requirementStatus !== 'required') ?? []
  const groups = (items: NonNullable<typeof data>['qualification']['formalities']) => groupByRecipient(items)

  return <View style={styles.root}>
    <Text accessibilityRole="header" style={styles.title}>Formalités et accompagnement</Text>
    {selectedNeeds.length ? <View style={styles.needSummary}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Demandes facultatives cochées</Text>
      <Text style={styles.body}>{contactHeading}</Text>
    </View> : <Text style={styles.caption}>Aucun besoin facultatif sélectionné. Les obligations éventuelles restent affichées ci-dessous.</Text>}

    {loading && !visibleData ? <View style={styles.state}><ActivityIndicator color="#34d399" accessibilityLabel="Chargement" /><Text accessibilityLiveRegion="polite" style={styles.body}>Chargement de la qualification officielle…</Text></View> : null}
    {!actionId ? <Text style={styles.attentionText}>Enregistrez le brouillon pour obtenir la qualification des formalités. Aucune absence d’obligation n’est déduite avant cette vérification.</Text> : null}
    {error ? <View accessibilityRole="alert" style={styles.state}><Text style={styles.error}>{error}</Text><Pressable onPress={() => { if (failedFacts) void updateFacts(failedFacts); else void reload() }} accessibilityRole="button" style={styles.button}><Text style={styles.buttonText}>Réessayer</Text></Pressable></View> : null}

    {visibleData ? <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Vérifier les faits de l’action</Text>
      <Text style={styles.caption}>Ces réponses servent à recalculer les règles avec le serveur. Une localisation incertaine ne crée pas de règle locale.</Text>
      <Pressable disabled={busyMutation} onPress={cyclePublicSpace} accessibilityRole="button" accessibilityLabel={`Type de lieu : ${visibleData.facts.publicSpace === 'public_domain' ? 'domaine public' : visibleData.facts.publicSpace === 'private_domain' ? 'lieu privé' : 'à préciser'}`} accessibilityState={{ disabled: busyMutation }} style={styles.factButton}><Text style={styles.buttonText}>Lieu : {visibleData.facts.publicSpace === 'public_domain' ? 'domaine public' : visibleData.facts.publicSpace === 'private_domain' ? 'lieu privé' : 'à préciser'}</Text></Pressable>
      <Pressable disabled={busyMutation} onPress={cycleManager} accessibilityRole="button" accessibilityLabel={`Gestionnaire : ${visibleData.facts.manager.label ?? MANAGER_LABELS[visibleData.facts.manager.kind]}`} accessibilityState={{ disabled: busyMutation }} style={styles.factButton}><Text style={styles.buttonText}>Gestionnaire : {visibleData.facts.manager.label ?? MANAGER_LABELS[visibleData.facts.manager.kind]}</Text></Pressable>
      {([
        ['isPublicRoadwayActivity', 'Activité sur la voie publique'],
        ['isCortegeOrGathering', 'Cortège ou rassemblement'],
        ['isItinerant', 'Action itinérante'],
        ['isClaiming', 'Revendication ou message revendicatif'],
        ['hasInstallations', 'Installations prévues'],
        ['requiresPhysicalOccupation', 'Occupation physique du lieu'],
        ['localCustomaryUse', 'Usage local habituel'],
        ['largeCrowdOrComplexInstallations', 'Foule importante ou installations complexes'],
      ] as const).map(([key, label]) => <Pressable key={key} disabled={busyMutation} onPress={() => cycleFact(key)} accessibilityRole="button" accessibilityLabel={`${label} : ${factStateLabel(visibleData.facts[key])}`} accessibilityState={{ disabled: busyMutation }} style={styles.factButton}><Text style={styles.buttonText}>{label} : {factStateLabel(visibleData.facts[key])}</Text></Pressable>)}
      {busyMutation ? <Text accessibilityLiveRegion="polite" style={styles.caption}>Enregistrement et recalcul des règles…</Text> : null}
    </View> : null}

    {required.length ? <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Obligations et démarches requises</Text>
      {groups(required).map(group => <View key={group.recipient} style={styles.group}>
        <Text accessibilityRole="header" style={styles.recipient}>{group.recipient}</Text>
        {group.items.map(item => <FormalityRow key={item.id} item={item} data={visibleData!} busy={busyMutation} expanded={expandedDetails.has(item.id)} onToggleDetails={() => setExpandedDetails(current => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next })} onTransition={(id, kind) => { void transition(id, kind) }} onLinkError={setLinkError} />)}
      </View>)}
    </View> : data && !error ? <Text style={styles.body}>Aucune démarche obligatoire n’est qualifiée. Vérifiez les faits et les sources affichés.</Text> : null}

    {other.length ? <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Autres démarches et contacts</Text>
      {groups(other).map(group => <View key={group.recipient} style={styles.group}>
        <Text accessibilityRole="header" style={styles.recipient}>{group.recipient}</Text>
        {group.items.map(item => <FormalityRow key={item.id} item={item} data={visibleData!} busy={busyMutation} expanded={expandedDetails.has(item.id)} onToggleDetails={() => setExpandedDetails(current => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next })} onTransition={(id, kind) => { void transition(id, kind) }} onLinkError={setLinkError} />)}
      </View>)}
    </View> : null}

    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Services du territoire</Text>
      {!actionId ? <Text style={styles.caption}>Enregistrez l’action pour rechercher les services des communes concernées.</Text> : <Pressable onPress={() => void searchContacts()} disabled={searchingContacts} accessibilityRole="button" accessibilityState={{ disabled: searchingContacts }} style={[styles.button, searchingContacts && styles.disabled]}>
        <Text style={styles.buttonText}>{searchingContacts ? 'Recherche en cours…' : visibleContactData ? 'Actualiser les contacts' : 'Rechercher les contacts'}</Text>
      </Pressable>}
      {contactError ? <View accessibilityRole="alert" style={styles.state}><Text style={styles.error}>{contactError}</Text><Pressable onPress={() => void searchContacts()} accessibilityRole="button" style={styles.button}><Text style={styles.buttonText}>Réessayer</Text></Pressable><ExternalLink label="Annuaire officiel des services publics" url="https://lannuaire.service-public.gouv.fr/" onError={setLinkError} /></View> : null}
      {visibleContactData ? <View style={styles.state} accessibilityLiveRegion="polite">
        <Text accessibilityLiveRegion="polite" style={styles.body}>{visibleContactData.coverage.communeCodes.length ? `Communes recherchées : ${visibleContactData.coverage.communeCodes.join(', ')}` : 'Aucune commune déterminée.'}</Text>
        <Text style={styles.caption}>Requêtes DILA : {visibleContactData.lookupBudget.requestsUsed}/{visibleContactData.lookupBudget.requestsAllowed} maximum.</Text>
        {visibleContactData.coverage.reason ? <Text style={styles.attentionText}>{visibleContactData.coverage.reason}</Text> : null}
        {visibleContactData.status !== 'complete' ? <Text style={styles.attentionText}>Résultats partiels ou indisponibles : des services peuvent manquer au plafond de requêtes. {visibleContactData.unresolvedCommuneCodes.length ? `Communes à compléter : ${visibleContactData.unresolvedCommuneCodes.join(', ')}.` : ''}</Text> : null}
        {visibleContactData.contacts.length ? <>
          {visibleContactData.contacts.slice(0, visibleContactCount).map(contact => <ContactRow key={contact.id} contact={contact} onLinkError={setLinkError} />)}
          {visibleContactCount < visibleContactData.contacts.length ? <Pressable onPress={() => setVisibleContactCount(count => count + 6)} accessibilityRole="button" style={styles.detailToggle}><Text style={styles.link}>Afficher d’autres services ({visibleContactData.contacts.length - visibleContactCount})</Text></Pressable> : null}
        </> : <Text style={styles.caption}>Aucun service trouvé pour cette recherche. Essayez l’annuaire officiel.</Text>}
        {visibleContactData.resources?.length ? <View style={styles.resourceList}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Ressources d’orientation et documentaires</Text>
          <Text style={styles.caption}>Ces liens ne sont pas des contacts vérifiés compétents pour l’action.</Text>
          {visibleContactData.resources.map(resource => <View key={resource.id} style={styles.resource}>
            <Text style={styles.contactName}>{resource.label}</Text>
            <Text style={styles.caption}>{resource.guidance}</Text>
            <Text style={styles.caption}>Pour : {resource.needs.map(id => selectedNeeds.find(need => need.id === id)?.label).filter(Boolean).join(', ')}</Text>
            <ExternalLink label={`Ouvrir ${resource.label}`} url={resource.url} onError={setLinkError} />
          </View>)}
        </View> : null}
        <ExternalLink label="Annuaire officiel des services publics" url="https://lannuaire.service-public.gouv.fr/" onError={setLinkError} />
      </View> : null}
    </View>
    {linkError ? <Text accessibilityRole="alert" style={styles.error}>{linkError}</Text> : null}
    {data?.actionData ? <View style={styles.prefill}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Informations reprises de l’action</Text>
      {[['Titre', data.actionData.title], ['Lieu', data.actionData.location], ['Date', data.actionData.date], ['Horaires', [data.actionData.startTime, data.actionData.endTime].filter(Boolean).join('–')], ['Organisateur', data.actionData.organizerName], ['Participants prévus', data.actionData.participantCount?.toString()], ['Matériel fourni', data.actionData.materialsProvided], ['Matériel recommandé', data.actionData.recommendedMaterials], ['Consignes de sécurité', data.actionData.safetyInstructions]].map(([label, value]) => value ? <Text key={label} style={styles.caption}>{label} : {value}</Text> : null)}
      {data.actionData.equipmentInventory ? <Text style={styles.caption}>Inventaire : {Object.entries(data.actionData.equipmentInventory).map(([key, value]) => `${key} ${typeof value === 'boolean' ? value ? 'oui' : 'non' : value}`).join(' · ')}</Text> : null}
    </View> : null}
    {visibleData ? <Text style={styles.caption}>Les états de démarche sont déclarés par l’organisateur ; aucun envoi, récépissé ou accord n’est vérifié automatiquement.</Text> : null}
  </View>
}

const styles = StyleSheet.create({
  root: { marginTop: 12, gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#2b5948', backgroundColor: '#0b241b' },
  title: { color: '#e7fff3', fontSize: 18, fontWeight: '800' },
  section: { gap: 10 },
  sectionTitle: { color: '#e7fff3', fontSize: 15, fontWeight: '700' },
  body: { color: '#d4e8de', fontSize: 14, lineHeight: 21 },
  caption: { color: '#b5d9c8', fontSize: 13, lineHeight: 19 },
  recipient: { color: '#f1fff7', fontSize: 14, fontWeight: '800' },
  procedure: { color: '#e7fff3', fontSize: 14, fontWeight: '700' },
  strong: { color: '#f1fff7', fontWeight: '800' },
  attentionText: { color: '#fde68a', fontSize: 13, lineHeight: 19 },
  error: { color: '#fecaca', fontSize: 14, lineHeight: 20 },
  group: { gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#315849' },
  formality: { gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#315849' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { overflow: 'hidden', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, color: '#fff', fontSize: 12, fontWeight: '700' },
  required: { backgroundColor: '#7c2d12' },
  optional: { backgroundColor: '#334155' },
  attention: { backgroundColor: '#78350f' },
  neutral: { backgroundColor: '#164e3b' },
  link: { color: '#a7f3d0', fontSize: 14, lineHeight: 20, fontWeight: '700', textDecorationLine: 'underline' },
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#4b8068', backgroundColor: '#164e3b' },
  factButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#4b8068', backgroundColor: '#123328' },
  buttonText: { color: '#f1fff7', fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  disabled: { opacity: 0.55 },
  transitionList: { gap: 8, paddingTop: 2 },
  detailToggle: { minHeight: 44, justifyContent: 'center' },
  details: { gap: 8, padding: 10, borderRadius: 10, backgroundColor: '#123328' },
  contact: { gap: 6, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#315849' },
  contactToggle: { minHeight: 44, justifyContent: 'center', gap: 3 },
  contactName: { color: '#e7fff3', fontSize: 14, fontWeight: '700' },
  state: { gap: 8, padding: 10, borderRadius: 10, backgroundColor: '#123328' },
  needSummary: { gap: 4, padding: 10, borderRadius: 10, backgroundColor: '#123328' },
  prefill: { gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#315849' },
  resourceList: { gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#315849' },
  resource: { gap: 5, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#315849' },
})
