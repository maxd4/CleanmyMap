import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import {
  loadMobileActionFormalities,
  loadMobileActionFormalitiesContacts,
  updateMobileActionFormality,
  type MobileActionFormalities,
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
      <Text style={styles.caption}>{contact.communeCodes.join(', ') || 'Compétence territoriale à vérifier'}</Text>
    </Pressable>
    {expanded ? <View style={styles.details}>
      {contact.types.length ? <Text style={styles.caption}>Services : {contact.types.join(', ')}</Text> : null}
      <ExternalLink label="Fiche officielle du service" url={contact.directoryUrl} onError={onLinkError} />
      {contact.formUrl ? <ExternalLink label="Ouvrir le formulaire du service" url={contact.formUrl} onError={onLinkError} /> : null}
      {contact.phones.map(phone => <ExternalLink key={phone} label={`Appeler ${phone}`} url={`tel:${phone.replace(/[^+0-9]/g, '')}`} onError={onLinkError} />)}
      {contact.emails.map(email => <ExternalLink key={email} label={`Écrire à ${email}`} url={`mailto:${email}`} onError={onLinkError} />)}
      {contact.websites.map(url => <ExternalLink key={url} label="Site officiel" url={url} onError={onLinkError} />)}
      <Text style={styles.caption}>Annuaire consulté le {contact.retrievedAt.slice(0, 10)}. Contact publié, compétence et disponibilité à confirmer.</Text>
    </View> : null}
  </View>
}

export function ActionFormalitiesPanel({ actionId, selectedNeeds = [] }: { actionId: string | null; selectedNeeds?: readonly SelectedNeed[] }) {
  const [data, setData] = useState<MobileActionFormalities | null>(null)
  const [contacts, setContacts] = useState<MobileActionFormalitiesContacts | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contactError, setContactError] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchingContacts, setSearchingContacts] = useState(false)
  const [busyTransition, setBusyTransition] = useState(false)
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(() => new Set())
  const [visibleContacts, setVisibleContacts] = useState(6)

  const reload = useCallback(async () => {
    if (!actionId) return
    setLoading(true)
    setError(null)
    try { setData(await loadMobileActionFormalities(actionId)) }
    catch { setError(LOAD_ERROR) }
    finally { setLoading(false) }
  }, [actionId])

  useEffect(() => {
    setData(null)
    setContacts(null)
    setError(null)
    setContactError(null)
    setExpandedDetails(new Set())
    if (actionId) void reload()
  }, [actionId, reload])

  const contactHeading = useMemo(() => selectedNeeds.map(item => item.label).join(' · '), [selectedNeeds])

  async function searchContacts() {
    if (!actionId || !selectedNeeds.length || searchingContacts) return
    setSearchingContacts(true)
    setContacts(null)
    setContactError(null)
    setVisibleContacts(6)
    try { setContacts(await loadMobileActionFormalitiesContacts(actionId, selectedNeeds.map(item => item.id))) }
    catch { setContactError('Annuaire indisponible. Réessayez ou consultez l’annuaire officiel.') }
    finally { setSearchingContacts(false) }
  }

  async function transition(formalityId: string, kind: Transition) {
    if (!actionId || busyTransition) return
    setBusyTransition(true)
    setError(null)
    try { setData(await updateMobileActionFormality(actionId, formalityId, kind)) }
    catch { setError('État non enregistré. Réessayez ; vérifiez ensuite la démarche affichée.') }
    finally { setBusyTransition(false) }
  }

  const required = data?.qualification.formalities.filter(item => item.requirementStatus === 'required') ?? []
  const other = data?.qualification.formalities.filter(item => item.requirementStatus !== 'required') ?? []
  const groups = (items: NonNullable<typeof data>['qualification']['formalities']) => groupByRecipient(items)

  return <View style={styles.root}>
    <Text accessibilityRole="header" style={styles.title}>Formalités et accompagnement</Text>
    {selectedNeeds.length ? <View style={styles.needSummary}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Demandes facultatives cochées</Text>
      <Text style={styles.body}>{contactHeading}</Text>
    </View> : <Text style={styles.caption}>Aucun besoin facultatif sélectionné. Les obligations éventuelles restent affichées ci-dessous.</Text>}

    {loading && !data ? <View style={styles.state}><ActivityIndicator color="#34d399" accessibilityLabel="Chargement" /><Text accessibilityLiveRegion="polite" style={styles.body}>Chargement de la qualification officielle…</Text></View> : null}
    {!actionId ? <Text style={styles.attentionText}>Enregistrez le brouillon pour obtenir la qualification des formalités. Aucune absence d’obligation n’est déduite avant cette vérification.</Text> : null}
    {error ? <View accessibilityRole="alert" style={styles.state}><Text style={styles.error}>{error}</Text><Pressable onPress={() => void reload()} accessibilityRole="button" style={styles.button}><Text style={styles.buttonText}>Réessayer</Text></Pressable></View> : null}

    {required.length ? <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Obligations et démarches requises</Text>
      {groups(required).map(group => <View key={group.recipient} style={styles.group}>
        <Text accessibilityRole="header" style={styles.recipient}>{group.recipient}</Text>
        {group.items.map(item => <FormalityRow key={item.id} item={item} data={data!} busy={busyTransition} expanded={expandedDetails.has(item.id)} onToggleDetails={() => setExpandedDetails(current => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next })} onTransition={(id, kind) => { void transition(id, kind) }} onLinkError={setLinkError} />)}
      </View>)}
    </View> : data && !error ? <Text style={styles.body}>Aucune démarche obligatoire n’est qualifiée. Vérifiez les faits et les sources affichés.</Text> : null}

    {other.length ? <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Autres démarches et contacts</Text>
      {groups(other).map(group => <View key={group.recipient} style={styles.group}>
        <Text accessibilityRole="header" style={styles.recipient}>{group.recipient}</Text>
        {group.items.map(item => <FormalityRow key={item.id} item={item} data={data!} busy={busyTransition} expanded={expandedDetails.has(item.id)} onToggleDetails={() => setExpandedDetails(current => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next })} onTransition={(id, kind) => { void transition(id, kind) }} onLinkError={setLinkError} />)}
      </View>)}
    </View> : null}

    {selectedNeeds.length ? <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Services du territoire</Text>
      {!actionId ? <Text style={styles.caption}>Enregistrez l’action pour rechercher les services des communes concernées.</Text> : <Pressable onPress={() => void searchContacts()} disabled={searchingContacts} accessibilityRole="button" accessibilityState={{ disabled: searchingContacts }} style={[styles.button, searchingContacts && styles.disabled]}>
        <Text style={styles.buttonText}>{searchingContacts ? 'Recherche en cours…' : contacts ? 'Actualiser les contacts' : 'Rechercher les contacts'}</Text>
      </Pressable>}
      {contactError ? <View accessibilityRole="alert" style={styles.state}><Text style={styles.error}>{contactError}</Text><Pressable onPress={() => void searchContacts()} accessibilityRole="button" style={styles.button}><Text style={styles.buttonText}>Réessayer</Text></Pressable><ExternalLink label="Annuaire officiel des services publics" url="https://lannuaire.service-public.gouv.fr/" onError={setLinkError} /></View> : null}
      {contacts ? <View style={styles.state} accessibilityLiveRegion="polite">
        <Text accessibilityLiveRegion="polite" style={styles.body}>{contacts.coverage.communeCodes.length ? `Communes recherchées : ${contacts.coverage.communeCodes.join(', ')}` : 'Aucune commune déterminée.'}</Text>
        {contacts.coverage.reason ? <Text style={styles.attentionText}>{contacts.coverage.reason}</Text> : null}
        {contacts.status !== 'complete' ? <Text style={styles.attentionText}>Résultats partiels ou indisponibles : les services manquants restent à rechercher. {contacts.unresolvedCommuneCodes.length ? `Communes non résolues : ${contacts.unresolvedCommuneCodes.join(', ')}.` : ''}</Text> : null}
        {contacts.contacts.length ? <>
          {contacts.contacts.slice(0, visibleContacts).map(contact => <ContactRow key={contact.id} contact={contact} onLinkError={setLinkError} />)}
          {visibleContacts < contacts.contacts.length ? <Pressable onPress={() => setVisibleContacts(count => count + 6)} accessibilityRole="button" style={styles.detailToggle}><Text style={styles.link}>Afficher d’autres services ({contacts.contacts.length - visibleContacts})</Text></Pressable> : null}
        </> : <Text style={styles.caption}>Aucun service trouvé pour cette recherche. Essayez l’annuaire officiel.</Text>}
        {contacts.resources?.length ? <View style={styles.resourceList}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Référentiels utiles à vos demandes</Text>
          {contacts.resources.map(resource => <View key={resource.id} style={styles.resource}>
            <Text style={styles.contactName}>{resource.label}</Text>
            <Text style={styles.caption}>{resource.guidance}</Text>
            <Text style={styles.caption}>Pour : {resource.needs.map(id => selectedNeeds.find(need => need.id === id)?.label).filter(Boolean).join(', ')}</Text>
            <ExternalLink label={`Ouvrir ${resource.label}`} url={resource.url} onError={setLinkError} />
          </View>)}
        </View> : null}
        <ExternalLink label="Annuaire officiel des services publics" url="https://lannuaire.service-public.gouv.fr/" onError={setLinkError} />
      </View> : null}
    </View> : null}
    {linkError ? <Text accessibilityRole="alert" style={styles.error}>{linkError}</Text> : null}
    {data?.actionData ? <View style={styles.prefill}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Informations reprises de l’action</Text>
      {[['Titre', data.actionData.title], ['Lieu', data.actionData.location], ['Date', data.actionData.date], ['Horaires', [data.actionData.startTime, data.actionData.endTime].filter(Boolean).join('–')], ['Organisateur', data.actionData.organizerName], ['Participants prévus', data.actionData.participantCount?.toString()], ['Matériel fourni', data.actionData.materialsProvided], ['Matériel recommandé', data.actionData.recommendedMaterials], ['Consignes de sécurité', data.actionData.safetyInstructions]].map(([label, value]) => value ? <Text key={label} style={styles.caption}>{label} : {value}</Text> : null)}
      {data.actionData.equipmentInventory ? <Text style={styles.caption}>Inventaire : {Object.entries(data.actionData.equipmentInventory).map(([key, value]) => `${key} ${typeof value === 'boolean' ? value ? 'oui' : 'non' : value}`).join(' · ')}</Text> : null}
    </View> : null}
    {data ? <Text style={styles.caption}>Les états de démarche sont déclarés par l’organisateur ; aucun envoi, récépissé ou accord n’est vérifié automatiquement.</Text> : null}
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
