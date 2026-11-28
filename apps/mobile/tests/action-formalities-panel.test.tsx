import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callTestHandler } from './test-renderer-helpers'
import { commonNativeComponents } from './support/native-component'
import { ActionFormalitiesPanel } from '../features/actions/action-formalities-panel'
import type { MobileActionFormalities, MobileActionFormalitiesContacts } from '../features/actions/mobile-actions-service'

const mocks = vi.hoisted(() => ({
  loadFormalities: vi.fn(),
  loadContacts: vi.fn(),
  updateFormality: vi.fn(),
  updateFacts: vi.fn(),
  openURL: vi.fn(),
  auth: { isLoaded: true, isSignedIn: true, userId: 'user-a' as string | null },
}))

vi.mock('@clerk/expo', () => ({ useAuth: () => mocks.auth }))
vi.mock('react-native', () => ({ ...commonNativeComponents(), Linking: { openURL: mocks.openURL } }))
vi.mock('../features/actions/mobile-actions-service', () => ({
  loadMobileActionFormalities: mocks.loadFormalities,
  loadMobileActionFormalitiesContacts: mocks.loadContacts,
  updateMobileActionFormality: mocks.updateFormality,
  updateMobileActionFormalitiesFacts: mocks.updateFacts,
}))

const qualificationResponse: MobileActionFormalities = {
  status: 'ok',
  actionId: 'action-1',
  facts: {
    territory: { countryCode: 'FR', jurisdictionEvidence: 'metropolitan_point', code: 'FR-75', label: 'Paris' },
    publicSpace: 'public_domain', manager: { kind: 'paris_city', label: 'Ville de Paris' }, isCleanwalk: true,
    isPublicRoadwayActivity: false, isCortegeOrGathering: false, isItinerant: false, isClaiming: false,
    hasInstallations: false, requiresPhysicalOccupation: false, localCustomaryUse: false, largeCrowdOrComplexInstallations: false,
  },
  qualification: { formalities: [
    {
      id: 'aot', requirementStatus: 'required', procedureKind: 'city_aot', competentAuthority: { label: 'Ville de test' }, recipient: 'Service des événements',
      justification: 'Une occupation doit être autorisée.', scope: 'Domaine public municipal.', deadline: { minimumValue: 2, unit: 'months', note: 'Avant occupation.' },
      officialChannel: { label: 'Formulaire officiel', url: 'https://example.test/form' },
      source: { title: 'Source officielle', url: 'https://example.test/source', verifiedOn: '2026-11-27' }, requestedInformation: ['Date'], requestedDocuments: ['Plan PDF'],
    },
    {
      id: 'security', requirementStatus: 'required', procedureKind: 'police_authorization', competentAuthority: { label: 'Préfecture de police' }, recipient: 'Service des événements',
      justification: 'Accord distinct de sécurité.', scope: 'Ordre public.', deadline: null, officialChannel: { label: 'Plateforme', url: 'https://example.test/police' },
      source: { title: 'Source officielle', url: 'https://example.test/source', verifiedOn: '2026-11-27' }, requestedInformation: [], requestedDocuments: [],
    },
    {
      id: 'unknown', requirementStatus: 'unknown', procedureKind: 'unknown', competentAuthority: { label: 'Gestionnaire à préciser' }, recipient: null,
      justification: 'La règle locale est à confirmer.', scope: 'Lieu non établi.', deadline: null, officialChannel: null, source: null, requestedInformation: [], requestedDocuments: [],
    },
  ] },
  workflow: { progress: [
    { formalityId: 'aot', userStatus: 'prepared', proof: null, active: true, validForQualification: true },
    { formalityId: 'security', userStatus: 'not_started', proof: null, active: true, validForQualification: true },
    { formalityId: 'unknown', userStatus: 'not_started', proof: null, active: true, validForQualification: true },
  ] },
  availableTransitions: { aot: ['declare_sent'], security: ['mark_prepared'], unknown: ['mark_prepared'] },
  actionData: { title: 'Action test', location: 'Paris', date: '2026-12-01', participantCount: 8, equipmentInventory: { gloves: 4 } },
}

const contactResponse: MobileActionFormalitiesContacts = {
  status: 'partial',
  coverage: { status: 'partial', communeCodes: ['75056'], reason: 'Certaines communes restent à résoudre.' },
  unresolvedCommuneCodes: ['75056'],
  lookupBudget: { requestsUsed: 4, requestsAllowed: 48 },
  resources: [{ id: 'sinoe', label: 'SINOE Déchets', url: 'https://example.test/sinoe', needs: ['pickup'], guidance: 'Identifier la collectivité compétente et confirmer la reprise.' }],
  contacts: [{
    id: 'service-1', name: 'Service de propreté', types: ['service_dechets'], communeCodes: ['75056'], phones: ['0102030405'], emails: ['service@example.test'], websites: [],
    directoryUrl: 'https://example.test/fiche', formUrl: 'https://example.test/contact', retrievedAt: '2026-11-27T10:00:00.000Z',
    territorialRelation: 'official_geographic_competence', taskCompetence: 'not_verified',
  }],
}

function nodeText(node: TestRenderer.ReactTestInstance): string {
  return node.children.map(child => typeof child === 'string' || typeof child === 'number' ? String(child) : nodeText(child)).join(' ')
}

function textContent(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root.children.map(child => typeof child === 'string' || typeof child === 'number' ? String(child) : nodeText(child)).join(' ').replace(/\s+/g, ' ')
}

function findButton(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node =>
    nodeText(node).includes(label),
  )
}

describe('ActionFormalitiesPanel', () => {
  beforeEach(() => {
    mocks.auth.userId = 'user-a'
    mocks.loadFormalities.mockReset().mockResolvedValue(qualificationResponse)
    mocks.loadContacts.mockReset().mockResolvedValue(contactResponse)
    mocks.updateFormality.mockReset().mockResolvedValue(qualificationResponse)
    mocks.updateFacts.mockReset().mockResolvedValue(qualificationResponse)
    mocks.openURL.mockReset().mockResolvedValue(undefined)
  })

  it('ignores a qualification response after the panel switches to another action', async () => {
    let resolveOld!: (value: MobileActionFormalities) => void
    mocks.loadFormalities.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
      .mockResolvedValueOnce({ ...qualificationResponse, actionId: 'action-2', actionData: { ...qualificationResponse.actionData, title: 'Nouvelle action' } })
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" />) })
    await act(async () => { renderer.update(<ActionFormalitiesPanel actionId="action-2" />) })
    expect(textContent(renderer)).toContain('Nouvelle action')
    await act(async () => { resolveOld(qualificationResponse) })
    expect(textContent(renderer)).toContain('Nouvelle action')
    expect(textContent(renderer)).not.toContain('Action test')
  })

  it('invalidates pending qualification and contact reads when the Clerk identity changes', async () => {
    let resolveOldQualification!: (value: MobileActionFormalities) => void
    mocks.loadFormalities.mockImplementationOnce(() => new Promise(resolve => { resolveOldQualification = resolve }))
      .mockResolvedValueOnce({ ...qualificationResponse, actionData: { ...qualificationResponse.actionData, title: 'Session actuelle' } })
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" />) })
    mocks.auth.userId = 'user-b'
    await act(async () => { renderer.update(<ActionFormalitiesPanel actionId="action-1" />) })
    await act(async () => { resolveOldQualification(qualificationResponse) })
    expect(textContent(renderer)).toContain('Session actuelle')
    expect(textContent(renderer)).not.toContain('Action test')

    let resolveOldContacts!: (value: MobileActionFormalitiesContacts) => void
    mocks.loadContacts.mockImplementationOnce(() => new Promise(resolve => { resolveOldContacts = resolve }))
    await act(async () => { callTestHandler(findButton(renderer, 'Rechercher les contacts'), 'onPress') })
    mocks.auth.userId = 'user-c'
    mocks.loadFormalities.mockResolvedValueOnce(qualificationResponse)
    await act(async () => { renderer.update(<ActionFormalitiesPanel actionId="action-1" />) })
    await act(async () => { resolveOldContacts(contactResponse) })
    expect(textContent(renderer)).not.toContain('Service de propreté')
  })

  it('serializes fact qualification and workflow mutations', async () => {
    let resolveFacts!: (value: MobileActionFormalities) => void
    mocks.updateFacts.mockImplementationOnce(() => new Promise(resolve => { resolveFacts = resolve }))
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" />) })
    const roadway = renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => node.props.accessibilityLabel === 'Activité sur la voie publique : Non')
    const declareSent = findButton(renderer, 'Déclarer l’envoi')
    await act(async () => {
      callTestHandler(roadway, 'onPress')
      callTestHandler(roadway, 'onPress')
      callTestHandler(declareSent, 'onPress')
    })
    expect(mocks.updateFacts).toHaveBeenCalledTimes(1)
    expect(mocks.updateFormality).not.toHaveBeenCalled()
    await act(async () => { resolveFacts(qualificationResponse) })
  })

  it('cycles place and manager facts through every supported value using the shared qualification call', async () => {
    mocks.updateFacts.mockImplementation(async (_actionId: string, facts: MobileActionFormalities['facts']) => ({ ...qualificationResponse, facts }))
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" />) })
    for (const expected of ['lieu privé', 'à préciser', 'domaine public']) {
      const place = renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => String(node.props.accessibilityLabel ?? '').startsWith('Type de lieu :'))
      await act(async () => { callTestHandler(place, 'onPress') })
      expect(textContent(renderer)).toContain(`Lieu : ${expected}`)
    }
    for (const expected of ['État', 'SNCF', 'HAROPA', 'Autre gestionnaire public', 'Gestionnaire privé', 'À préciser', 'Ville de Paris']) {
      const manager = renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => String(node.props.accessibilityLabel ?? '').startsWith('Gestionnaire :'))
      await act(async () => { callTestHandler(manager, 'onPress') })
      expect(textContent(renderer)).toContain(`Gestionnaire : ${expected}`)
    }
    expect(mocks.updateFacts).toHaveBeenCalledTimes(10)
  })

  it('keeps required rules visible, groups the same recipient and reveals details without losing the selected need', async () => {
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" selectedNeeds={[{ id: 'pickup', label: 'Reprise des déchets' }]} />) })
    const content = textContent(renderer)
    expect(content).toContain('Obligations et démarches requises')
    expect(content).toContain('2 mois')
    expect(content).toContain('Source officielle')
    expect(content).toContain('Reprise des déchets')
    expect(content.match(/Service des événements/g)).toHaveLength(1)
    expect(content).toContain('Rechercher les contacts')

    const disclosure = findButton(renderer, 'Périmètre, informations et pièces')
    await act(async () => { callTestHandler(disclosure, 'onPress') })
    expect(textContent(renderer)).toContain('Plan PDF')
    expect(textContent(renderer)).toContain('Domaine public municipal.')
  })

  it('loads a partial contact search for selected needs and exposes official recovery links', async () => {
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" selectedNeeds={[{ id: 'pickup', label: 'Reprise des déchets' }]} />) })
    await act(async () => { callTestHandler(findButton(renderer, 'Rechercher les contacts'), 'onPress') })
    expect(mocks.loadContacts).toHaveBeenCalledWith('action-1', ['pickup'])
    const content = textContent(renderer)
    expect(content).toContain('Service de propreté')
    expect(content).toContain('Résultats partiels ou indisponibles')
    expect(content).toContain('Annuaire officiel des services publics')
    expect(content).toContain('SINOE Déchets')
    expect(content).toContain('confirmer la reprise')
    expect(content).toContain('Communes à compléter : 75056.')
  })

  it('recovers from contact provider failure and reports an empty retry without inventing contacts', async () => {
    mocks.loadContacts.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      ...contactResponse,
      status: 'complete',
      coverage: { status: 'resolved_point', communeCodes: ['75056'] },
      unresolvedCommuneCodes: [],
      contacts: [],
      resources: [],
    })
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" />) })
    await act(async () => { callTestHandler(findButton(renderer, 'Rechercher les contacts'), 'onPress') })
    expect(textContent(renderer)).toContain('Annuaire indisponible')
    await act(async () => { callTestHandler(findButton(renderer, 'Réessayer'), 'onPress') })
    expect(textContent(renderer)).toContain('Aucun service trouvé pour cette recherche.')
    expect(textContent(renderer)).not.toContain('Service de propreté')
  })

  it('announces a failed attempt to open an official contact link', async () => {
    mocks.openURL.mockRejectedValueOnce(new Error('link unavailable'))
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" />) })
    await act(async () => { callTestHandler(findButton(renderer, 'Rechercher les contacts'), 'onPress') })
    await act(async () => { callTestHandler(findButton(renderer, 'Service de propreté'), 'onPress') })
    const link = renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => node.props.accessibilityRole === 'link' && node.props.accessibilityLabel === 'Fiche officielle du service')
    await act(async () => { callTestHandler(link, 'onPress') })
    expect(textContent(renderer)).toContain('Impossible d’ouvrir ce lien.')
  })

  it('keeps contact discovery available without optional needs and recalculates facts through the shared API', async () => {
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" />) })
    expect(textContent(renderer)).toContain('Obligations et démarches requises')
    await act(async () => { callTestHandler(findButton(renderer, 'Rechercher les contacts'), 'onPress') })
    expect(mocks.loadContacts).toHaveBeenCalledWith('action-1', [])
    const roadway = renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => node.props.accessibilityLabel === 'Activité sur la voie publique : Non')
    await act(async () => { callTestHandler(roadway, 'onPress') })
    expect(mocks.updateFacts).toHaveBeenCalledWith('action-1', expect.objectContaining({ isPublicRoadwayActivity: 'unknown' }))
    expect(textContent(renderer)).toContain('Vérifier les faits de l’action')
  })

  it('retries a failed fact update instead of only reloading the old qualification', async () => {
    mocks.updateFacts.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(qualificationResponse)
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" />) })
    const roadway = renderer.root.findAll(node => typeof node.props.onPress === 'function').find(node => node.props.accessibilityLabel === 'Activité sur la voie publique : Non')
    await act(async () => { callTestHandler(roadway, 'onPress') })
    expect(textContent(renderer)).toContain('Informations non enregistrées')
    await act(async () => { callTestHandler(findButton(renderer, 'Réessayer'), 'onPress') })
    expect(mocks.updateFacts).toHaveBeenCalledTimes(2)
    expect(mocks.loadFormalities).toHaveBeenCalledTimes(1)
  })

  it('shows a retry after a failed qualification load', async () => {
    mocks.loadFormalities.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(qualificationResponse)
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" />) })
    expect(textContent(renderer)).toContain('Impossible de charger la qualification. Réessayez.')
    await act(async () => { callTestHandler(findButton(renderer, 'Réessayer'), 'onPress') })
    expect(textContent(renderer)).toContain('Obligations et démarches requises')
  })

  it('keeps a new action informative without requesting persisted qualification', async () => {
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId={null} selectedNeeds={[{ id: 'pickup', label: 'Reprise des déchets' }]} />) })
    expect(textContent(renderer)).toContain('Enregistrez le brouillon pour obtenir la qualification')
    expect(textContent(renderer)).toContain('Aucune absence d’obligation n’est déduite avant cette vérification.')
    expect(textContent(renderer)).toContain('Enregistrez l’action pour rechercher les services')
    expect(mocks.loadFormalities).not.toHaveBeenCalled()
    expect(mocks.loadContacts).not.toHaveBeenCalled()
  })

  it('persists transitions through the shared service and exposes retry after failure', async () => {
    mocks.updateFormality.mockRejectedValueOnce(new Error('offline'))
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" />) })
    await act(async () => { callTestHandler(findButton(renderer, 'Déclarer l’envoi'), 'onPress') })
    expect(mocks.updateFormality).toHaveBeenCalledWith('action-1', 'aot', 'declare_sent')
    expect(textContent(renderer)).toContain('État non enregistré. Réessayez')
    await act(async () => { callTestHandler(findButton(renderer, 'Réessayer'), 'onPress') })
    expect(textContent(renderer)).toContain('Obligations et démarches requises')
  })

  it('persists a successful transition and renders a complete contact result with incremental disclosure', async () => {
    const completeContacts: MobileActionFormalitiesContacts = {
      ...contactResponse,
      status: 'complete',
      coverage: { status: 'resolved_point', communeCodes: ['75056'] },
      unresolvedCommuneCodes: [],
      resources: [],
      contacts: Array.from({ length: 7 }, (_, index) => ({ ...contactResponse.contacts[0]!, id: `service-${index}`, name: `Service ${index}` })),
    }
    mocks.loadContacts.mockResolvedValueOnce(completeContacts)
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" selectedNeeds={[{ id: 'pickup', label: 'Reprise des déchets' }]} />) })
    await act(async () => { callTestHandler(findButton(renderer, 'Déclarer l’envoi'), 'onPress') })
    expect(mocks.updateFormality).toHaveBeenCalledWith('action-1', 'aot', 'declare_sent')
    expect(textContent(renderer)).toContain('Services du territoire')
    await act(async () => { callTestHandler(findButton(renderer, 'Rechercher les contacts'), 'onPress') })
    expect(textContent(renderer)).not.toContain('Résultats partiels ou indisponibles')
    expect(textContent(renderer)).toContain('Service 0')
    expect(textContent(renderer)).not.toContain('Service 6')
    await act(async () => { callTestHandler(findButton(renderer, 'Afficher d’autres services'), 'onPress') })
    expect(textContent(renderer)).toContain('Service 6')
    await act(async () => { callTestHandler(findButton(renderer, 'Service 0'), 'onPress') })
    expect(textContent(renderer)).toContain('Lien DILA avec la commune vérifié')
  })

  it('distinguishes an empty complete contact search from missing territorial coverage', async () => {
    mocks.loadContacts.mockResolvedValueOnce({
      ...contactResponse,
      status: 'complete',
      coverage: { status: 'unknown', communeCodes: [], reason: 'Géométrie manquante.' },
      unresolvedCommuneCodes: [],
      contacts: [],
      resources: [],
      lookupBudget: { requestsUsed: 0, requestsAllowed: 48 },
    })
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" selectedNeeds={[{ id: 'pickup', label: 'Reprise des déchets' }]} />) })
    await act(async () => { callTestHandler(findButton(renderer, 'Rechercher les contacts'), 'onPress') })
    expect(textContent(renderer)).toContain('Aucune commune déterminée.')
    expect(textContent(renderer)).toContain('Aucun service trouvé pour cette recherche.')
  })

  it('allows retry after a contact provider failure and opens the contact details', async () => {
    mocks.loadContacts.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(contactResponse)
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" selectedNeeds={[{ id: 'pickup', label: 'Reprise des déchets' }]} />) })
    await act(async () => { callTestHandler(findButton(renderer, 'Rechercher les contacts'), 'onPress') })
    expect(textContent(renderer)).toContain('Annuaire indisponible. Réessayez')
    await act(async () => { callTestHandler(findButton(renderer, 'Réessayer'), 'onPress') })
    await act(async () => { callTestHandler(findButton(renderer, 'Service de propreté'), 'onPress') })
    expect(textContent(renderer)).toContain('Lien DILA avec la commune vérifié')
    expect(textContent(renderer)).toContain('Rôle pour cette demande')
  })

  it('renders recommendation, refusal, day deadline, missing source details and reports link errors', async () => {
    const alternate: MobileActionFormalities = {
      ...qualificationResponse,
      qualification: { formalities: [
        { ...qualificationResponse.qualification.formalities[0]!, id: 'recommendation', requirementStatus: 'recommended', procedureKind: 'none', deadline: { minimumValue: 3, unit: 'days', note: 'Avant la date.' }, source: null, officialChannel: { label: 'Canal officiel', url: 'https://example.test' }, requestedInformation: [], requestedDocuments: [] },
      ] },
      workflow: { progress: [{ formalityId: 'recommendation', userStatus: 'refused', proof: { reference: null, recordedAt: '2026-11-27T10:00:00.000Z' }, active: true, validForQualification: false }] },
      availableTransitions: { recommendation: ['mark_prepared'] },
    }
    mocks.loadFormalities.mockResolvedValueOnce(alternate)
    mocks.openURL.mockRejectedValueOnce(new Error('link unavailable'))
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" />) })
    const content = textContent(renderer)
    expect(content).toContain('Recommandé')
    expect(content).toContain('Refus déclaré reçu')
    expect(content).toContain('3 jours')
    expect(content).toContain('Source officielle à confirmer.')
    expect(content).toContain('Déclaration enregistrée le')
    expect(content).toContain('Les faits ont changé')
    await act(async () => { callTestHandler(findButton(renderer, 'Périmètre, informations et pièces'), 'onPress') })
    expect(textContent(renderer)).toContain('Pièces supplémentaires : à confirmer')
    await act(async () => { callTestHandler(findButton(renderer, 'Canal officiel'), 'onPress') })
    expect(textContent(renderer)).toContain('Impossible d’ouvrir ce lien.')
  })
})
