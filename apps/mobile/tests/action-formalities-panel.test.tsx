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
}))

vi.mock('react-native', () => ({ ...commonNativeComponents() }))
vi.mock('../features/actions/mobile-actions-service', () => ({
  loadMobileActionFormalities: mocks.loadFormalities,
  loadMobileActionFormalitiesContacts: mocks.loadContacts,
  updateMobileActionFormality: mocks.updateFormality,
}))

const qualificationResponse: MobileActionFormalities = {
  status: 'ok',
  actionId: 'action-1',
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
  resources: [{ id: 'sinoe', label: 'SINOE Déchets', url: 'https://example.test/sinoe', needs: ['pickup'], guidance: 'Identifier la collectivité compétente et confirmer la reprise.' }],
  contacts: [{
    id: 'service-1', name: 'Service de propreté', types: ['service_dechets'], communeCodes: ['75056'], phones: ['0102030405'], emails: ['service@example.test'], websites: [],
    directoryUrl: 'https://example.test/fiche', formUrl: 'https://example.test/contact', retrievedAt: '2026-11-27T10:00:00.000Z',
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
    mocks.loadFormalities.mockReset().mockResolvedValue(qualificationResponse)
    mocks.loadContacts.mockReset().mockResolvedValue(contactResponse)
    mocks.updateFormality.mockReset().mockResolvedValue(qualificationResponse)
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

  it('loads a partial contact search only after a need was selected and exposes official recovery links', async () => {
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
    expect(content).toContain('Communes non résolues : 75056.')
  })

  it('shows a retry after a failed qualification load', async () => {
    mocks.loadFormalities.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(qualificationResponse)
    let renderer!: TestRenderer.ReactTestRenderer
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesPanel actionId="action-1" />) })
    expect(textContent(renderer)).toContain('Impossible de charger la qualification. Réessayez.')
    await act(async () => { callTestHandler(findButton(renderer, 'Réessayer'), 'onPress') })
    expect(textContent(renderer)).toContain('Obligations et démarches requises')
  })
})
