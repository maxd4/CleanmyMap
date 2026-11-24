import type {
  OrganizationSource,
  PublicCleanlinessCityDataset,
  PublicCleanlinessOrganizationNode as Node,
  PublicCleanlinessOrganizationRelation as Edge,
} from './public-cleanliness-organization';

// Paris institutional data extension. Existing IDs remain canonical; sources and evidence accompany each new fact.
const checked = '2026-11-24';
const territories = (...numbers: number[]) => numbers.map(n => `Paris:${n}`);
const refs = (...ids: string[]) => ids;
const additionalSources: readonly OrganizationSource[] = [
  { id: 'paris-org-sept-2026', label: 'Organigramme municipal du 9 septembre 2026', url: 'https://paris-v4.paris.fr/pages/organigramme-de-la-ville-de-paris-2380', sourceContentDate: '2026-09-09', verifiedAt: checked, evidence: 'official_current' },
  { id: 'dpe-arrete-2024', label: 'Arrêté de structure DPE, 3 avril 2024, articles 1 à 6', url: 'https://bovp.apps.paris.fr/doc_num_data.php?explnum_id=25035', sourceContentDate: '2024-04-03', verifiedAt: checked, evidence: 'official_historical' },
  { id: 'sg-arrete-index', label: 'BOVP : notice de réorganisation du Secrétariat général du 23 juillet 2026 (texte intégral non obtenu)', url: 'https://bovp.apps.paris.fr/index.php?action=segment_results&id=155&lvl=search_segment&new_search=1', sourceContentDate: '2026-07-23', verifiedAt: checked, evidence: 'official_current' },
  { id: 'paris-elus-2026', label: 'Élus d’arrondissement, mandature 2026', url: 'https://www.paris.fr/pages/elus-d-arrondissements-2365', sourceContentDate: '2026-03-31', verifiedAt: checked, evidence: 'official_current' },
  { id: 'paris-conseil-2026', label: 'Fonctionnement du Conseil de Paris', url: 'https://www.paris.fr/pages/fonctionnement-du-conseil-de-paris-216', sourceContentDate: '2026-04-07', verifiedAt: checked, evidence: 'official_current' },
  { id: 'pierre-lombard-2026', label: 'Fiche municipale Pierre Lombard', url: 'https://www.paris.fr/pages/pierre-lombard-34351', sourceContentDate: '2026-04-09', verifiedAt: checked, evidence: 'official_current' },
  { id: 'carine-ekon-ville-2026', label: 'Fiche municipale Carine Ekon', url: 'https://www.paris.fr/pages/carine-ekon-34379', sourceContentDate: '2026-04-09', verifiedAt: checked, evidence: 'official_current' },
  { id: 'carine-ekon-20-2026', label: 'Délégation de Carine Ekon, mairie du 20e', url: 'https://mairie20.paris.fr/pages/carine-ekon-13923', sourceContentDate: '2026-04-07', verifiedAt: checked, evidence: 'official_current' },
  { id: 'commission-8-election-2026', label: 'Conseil de Paris : élection du bureau de la 8e commission', url: 'https://a06-v7.apps.paris.fr/a06/jsp/site/Portal.jsp?id_document=186231&items_per_page=20&page=ods-solr.display_document&query=Belliard&sort_name=score&sort_order=asc&terms=Belliard', verifiedAt: checked, evidence: 'official_current' },
  { id: 'dpmp-2026', label: 'Organisation de la police municipale : divisions de tranquillité publique', url: 'https://www.paris.fr/pages/tout-savoir-sur-la-police-municipale-parisienne-16970', sourceContentDate: '2026-10-26', verifiedAt: checked, evidence: 'official_current' },
  { id: 'dpmp-arrete-2025', label: 'Arrêté de structure DPMP du 6 janvier 2025', url: 'https://bovp.apps.paris.fr/doc_num_data.php?explnum_id=33617', sourceContentDate: '2025-01-06', verifiedAt: checked, evidence: 'official_historical' },
  { id: 'conseils-quartier-paris', label: 'Paris Data : conseils de quartier', url: 'https://opendata.paris.fr/explore/dataset/conseils-quartiers/', verifiedAt: checked, evidence: 'official_current' },
  { id: 'req-11-offer', label: 'Offre REQ 11e, index officiel documenté dans le dossier REQ', url: 'https://travaillerpourparis.offres.paris.fr/15064/1/referent-referente-de-l-entretien-du-quartier-paris-11eme-f-h', verifiedAt: checked, evidence: 'official_job_profile' },
  { id: 'req-18-offer', label: 'Offre REQ 18e, index officiel documenté dans le dossier REQ', url: 'https://travaillerpourparis.offres.paris.fr/15267/1/referents-referentes-de-l-entretien-du-quartier-paris-18eme-f-h', verifiedAt: checked, evidence: 'official_job_profile' },
  { id: 'dpmp-territoires', label: 'Divisions territoriales et articulation avec les mairies', url: 'https://www.paris.fr/pages/creation-de-17-divisions-territoriales-de-police-municipale-et-de-prevention-20110', sourceContentDate: '2024-10-29', verifiedAt: checked, evidence: 'official_historical' },
  { id: 'req-8-portrait', label: 'Paris Huit n°3, novembre 2026, p. 21 (portrait REQ ; source déjà qualifiée dans le dossier REQ du dépôt, non rouverte)', url: 'https://cdn.paris.fr/paris/2026/11/04/d21fbc997b6472a356e014e817bf3e5e.pdf', verifiedAt: checked, evidence: 'official_current' },
  { id: 'req-9-cr-2024', label: 'Conseil de quartier Pigalle-Martyrs, 1 octobre 2024', url: 'https://cdn.paris.fr/paris/2024/10/07/cr-2024-10-01-reunion-de-bureau-cq-pigalle-martyrs-3h99.pdf', sourceContentDate: '2024-10-01', verifiedAt: checked, evidence: 'official_historical' },
  { id: 'paris-adjoints-2026', label: 'Adjoints au maire de Paris, mandature 2026', url: 'https://pressev2.paris.fr/communiques/election-du-maire-de-paris-et-du-nouvel-executif-municipal', sourceContentDate: '2026-03-30', verifiedAt: checked, evidence: 'official_current' },
];

const mayors = [
  ['centre', 'Paris Centre', [1, 2, 3, 4], 'Ariel Weil', 'mairiepariscentre.paris.fr'],
  ['05', '5e', [5], 'Florence Berthout', 'mairie05.paris.fr'],
  ['06', '6e', [6], 'Jean-Pierre Lecoq', 'mairie06.paris.fr'],
  ['07', '7e', [7], 'Rachida Dati', 'mairie07.paris.fr'],
  ['08', '8e', [8], 'Catherine Lécuyer', 'mairie08.paris.fr'],
  ['09', '9e', [9], 'Delphine Bürkli', 'mairie09.paris.fr'],
  ['10', '10e', [10], 'Alexandra Cordebard', 'mairie10.paris.fr'],
  ['11', '11e', [11], 'David Belliard', 'mairie11.paris.fr'],
  ['12', '12e', [12], 'Lucie Castets', 'mairie12.paris.fr'],
  ['13', '13e', [13], 'Jérôme Coumet', 'mairie13.paris.fr'],
  ['14', '14e', [14], 'Carine Petit', 'mairie14.paris.fr'],
  ['15', '15e', [15], 'Philippe Goujon', 'mairie15.paris.fr'],
  ['16', '16e', [16], 'Jérémy Redler', 'mairie16.paris.fr'],
  ['17', '17e', [17], 'Geoffroy Boulard', 'mairie17.paris.fr'],
  ['18', '18e', [18], 'Éric Lejoindre', 'mairie18.paris.fr'],
  ['19', '19e', [19], 'François Dagnaud', 'mairie19.paris.fr'],
  ['20', '20e', [20], 'Éric Pliez', 'mairie20.paris.fr'],
] as const;

// Only the structure attested on 3 April 2024 is asserted here. No later
// DPE replacement was identified; continued validity of all units is not proven.
const regulationUnits: readonly [string, string, string, Node['kind'], Node['service'], number][] = [
  ['dpe-deputy', 'Direction adjointe de la DPE', 'dpe', 'position', 'governance', 1],
  ['dpe-risk', 'Contrôle interne et management des risques', 'dpe', 'position', 'governance', 1],
  ['dpe-sdag', 'Sous-direction de l’administration générale', 'dpe', 'service', 'governance', 1],
  ['dpe-hr', 'Ressources humaines', 'dpe-sdag', 'service', 'governance', 2],
  ['dpe-finance', 'Affaires financières', 'dpe-sdag', 'service', 'governance', 2],
  ['dpe-com', 'Communication', 'dpe-sdag', 'service', 'governance', 2],
  ['dpe-legal', 'Affaires juridiques et foncières', 'dpe-sdag', 'unit', 'governance', 2],
  ['dpe-it', 'Informatique et technologies', 'dpe-sdag', 'unit', 'governance', 2],
  ['dpe-buildings', 'Infrastructure et bâtiments', 'dpe-sdag', 'unit', 'governance', 2],
  ['stpp-territorial-animation', 'Animation territoriale', 'stpp', 'unit', 'coordination', 3],
  ['stpp-pilotage', 'Centre de pilotage de la collecte et de la propreté', 'stpp', 'unit', 'cleaning', 3],
  ['stpp-programmation', 'Programmation opérationnelle', 'stpp-pilotage', 'unit', 'cleaning', 3],
  ['stpp-analysis', 'Pilotage et analyse de la donnée', 'stpp-pilotage', 'unit', 'cleaning', 3],
  ['stpp-markets-quality', 'Marchés et qualité', 'stpp-pilotage', 'unit', 'cleaning', 3],
  ['stpp-mechanical', 'Section des moyens mécaniques', 'stpp', 'unit', 'cleaning', 3],
  ['stpp-heavy-vehicles', 'Exploitation poids lourds', 'stpp-mechanical', 'unit', 'cleaning', 3],
  ['stpp-maintenance', 'Maintenance et approvisionnement', 'stpp-mechanical', 'unit', 'cleaning', 3],
  ['stpp-equipment-purchase', 'Achats et utilisation des matériels', 'stpp-mechanical', 'unit', 'cleaning', 3],
  ['stpp-mechanical-admin', 'Coordination administrative', 'stpp-mechanical', 'unit', 'governance', 3],
  ['stpp-mechanical-data', 'Gestion des données', 'stpp-mechanical', 'unit', 'cleaning', 3],
  ['stpp-supply-center', 'Centre d’approvisionnement', 'stpp-mechanical', 'unit', 'cleaning', 3],
  ['stpp-functional', 'Circonscription fonctionnelle', 'stpp', 'unit', 'cleaning', 3],
  ['dpe-stea', 'Service technique de l’eau et de l’assainissement (STEA)', 'dpe', 'service', 'cleaning', 1],
  ['stea-network', 'Exploitation du réseau d’assainissement de Paris', 'dpe-stea', 'unit', 'cleaning', 4],
  ['stea-territorial', 'Trois circonscriptions territoriales d’exploitation', 'stea-network', 'unit', 'cleaning', 4],
  ['stea-network-support', 'Pilotage et appui à l’exploitation', 'stea-network', 'unit', 'cleaning', 4],
  ['stea-flows', 'Gestion des flux', 'dpe-stea', 'unit', 'cleaning', 4],
  ['stea-works', 'Grands travaux', 'dpe-stea', 'unit', 'cleaning', 4],
  ['stea-hydrology', 'Études, hydrologie et qualité de l’eau', 'dpe-stea', 'unit', 'cleaning', 4],
  ['stea-data', 'Numérique et donnée', 'dpe-stea', 'unit', 'cleaning', 4],
  ['stea-admin', 'Affaires générales', 'dpe-stea', 'unit', 'governance', 4],
  ['stea-com', 'Communication, relations internationales et musée des égouts', 'dpe-stea', 'unit', 'governance', 4],
  ['stea-swimming', 'Mission baignade', 'dpe-stea', 'unit', 'cleaning', 4],
  ['stea-quality', 'Qualité et méthodes', 'dpe-stea', 'unit', 'cleaning', 4],
  ['dpe-reduction', 'Service de la réduction des déchets, de l’innovation et des partenariats', 'dpe', 'service', 'prevention', 1],
  ['dpe-waste-valorisation', 'Réduction et valorisation des déchets', 'dpe-reduction', 'unit', 'prevention', 5],
  ['dpe-syndicates', 'Suivi des grands syndicats techniques', 'dpe-reduction', 'unit', 'prevention', 5],
  ['dpe-experiments', 'Études techniques et environnementales et expérimentations', 'dpe-reduction', 'unit', 'prevention', 5],
  ['dpe-work-safety', 'Service de la prévention et des conditions de travail', 'dpe-deputy', 'service', 'governance', 1],
  ['dpe-work-safety-cleaning', 'Prévention professionnelle : secteur propreté', 'dpe-work-safety', 'unit', 'governance', 6],
  ['dpe-work-safety-water', 'Prévention professionnelle : eau et assainissement', 'dpe-work-safety', 'unit', 'governance', 6],
  ['dpe-work-safety-resources', 'Pôle ressources', 'dpe-work-safety', 'unit', 'governance', 6],
  ['dpe-work-safety-improvement', 'Amélioration des conditions de travail', 'dpe-work-safety', 'unit', 'governance', 6],
  ['stpp-deputy', 'Adjoint à la direction du STPP', 'stpp', 'position', 'cleaning', 3],
  ['stea-deputy', 'Adjoint à la direction du STEA', 'dpe-stea', 'position', 'cleaning', 4],
  ['dpe-sdag-deputy', 'Adjoint de la SDAG chargé des finances', 'dpe-sdag', 'position', 'governance', 2],
  ['dpe-reduction-deputy', 'Adjoint chargé de la réduction et valorisation des déchets', 'dpe-reduction', 'position', 'prevention', 5],
  ['dpe-work-safety-deputy', 'Adjoint du service prévention et conditions de travail', 'dpe-work-safety', 'position', 'governance', 6],
  ['dpe-work-safety-mission', 'Chargé de missions du service prévention et conditions de travail', 'dpe-work-safety', 'position', 'governance', 6],
];

export function extendParisPublicCleanlinessDataset(base: Pick<PublicCleanlinessCityDataset, 'nodes' | 'relations' | 'sources'>) {
  const city = base.nodes.find(node => node.id === 'city-paris');
  if (!city) throw new Error('Missing Paris root');
  const all = city.territoryIds;
  const nodes = [...base.nodes];
  const relations = [...base.relations];
  const sources = [...base.sources, ...additionalSources];
  const add = (id: string, name: string, kind: Node['kind'], service: Node['service'], sourceIds: readonly string[], description: string, territoryIds: readonly string[] = all, assignment: Node['assignment'] = 'confirmed', extras: Partial<Pick<Node, 'unitId' | 'legalEmployerId' | 'territoryCoverageGroup' | 'publicContact' | 'coverageRole'>> = {}) => {
    nodes.push({ id, name, kind, service, sourceIds, description, territoryIds, assignment, ...extras });
  };
  const link = (from: string, to: string, kind: Edge['kind'], sourceIds: readonly string[], status: Edge['status'] = 'confirmed') => {
    relations.push({ id: `${kind}:${from}:${to}`, from, to, kind, sourceIds, status });
  };
  const unit = (id: string, name: string, parent: string, kind: Node['kind'], service: Node['service'], sourceIds: readonly string[], description: string, territoryIds: readonly string[] = all, assignment: Node['assignment'] = 'confirmed', extras: Partial<Pick<Node, 'territoryCoverageGroup' | 'publicContact' | 'coverageRole'>> = {}) => {
    add(id, name, kind, service, sourceIds, description, territoryIds, assignment, { unitId: parent, legalEmployerId: 'city-paris', ...extras });
    link(parent, id, 'hierarchy', sourceIds, assignment);
  };
  const person = (id: string, name: string, service: Node['service'], sourceIds: readonly string[], description: string, territoryIds: readonly string[] = all, assignment: Node['assignment'] = 'confirmed') => add(id, name, 'person', service, sourceIds, description, territoryIds, assignment);
  const role = (id: string, name: string, service: Node['service'], sourceIds: readonly string[], description: string, territoryIds: readonly string[] = all, coverageRole?: Node['coverageRole']) => add(id, name, 'position', service, sourceIds, description, territoryIds, 'confirmed', { coverageRole });
  const change = (id: string, patch: Partial<Node>) => {
    const index = nodes.findIndex(n => n.id === id);
    if (index < 0) throw new Error(`Missing existing node: ${id}`);
    nodes[index] = { ...nodes[index], ...patch };
  };
  const reparent = (id: string, parent: string) => {
    const index = relations.findIndex(e => e.to === id && e.kind === 'hierarchy');
    if (index < 0) throw new Error(`Missing existing hierarchy: ${id}`);
    // Preserve existing edge ID, evidence and status for compatibility.
    relations[index] = { ...relations[index], from: parent };
    change(id, { unitId: parent });
  };
  const org = refs('paris-org-sept-2026');
  const elected = refs('paris-elus-2026');
  const council = refs('paris-conseil-2026');
  const police = refs('dpmp-2026', 'dpmp-territoires');
  const decree = refs('dpe-arrete-2024');
  // Political institutions/functions are not an administrative reporting tree.
  role('mayor-paris-role', 'Maire de Paris', 'governance', org, 'Fonction exécutive municipale.');
  person('person-emmanuel-gregoire', 'Emmanuel Grégoire', 'governance', org, 'Maire de Paris indiqué par l’organigramme municipal.');
  link('person-emmanuel-gregoire', 'mayor-paris-role', 'mandate', org);
  link('mayor-paris-role', 'city-paris', 'mandate', org);
  add('mayor-cabinet', 'Cabinet du maire de Paris', 'unit', 'governance', org, 'Préparation et suivi des décisions de l’exécutif.');
  link('mayor-cabinet', 'mayor-paris-role', 'coordination', org);
  role('mayor-cabinet-director', 'Direction du cabinet du maire', 'governance', org, 'Fonction de direction du cabinet.');
  person('person-delphine-rouilleault', 'Delphine Rouilleault', 'governance', org, 'Directrice du cabinet selon l’organigramme du 9 septembre 2026.');
  link('person-delphine-rouilleault', 'mayor-cabinet-director', 'assignment', org);
  link('mayor-cabinet', 'mayor-cabinet-director', 'hierarchy', org);
  change('mayor-cabinet-director', { unitId: 'mayor-cabinet' });
  unit('secretariat-general', 'Secrétariat général', 'city-paris', 'service', 'governance', refs(...org, 'sg-arrete-index'), 'Coordination administrative centrale. Notice du nouvel arrêté du 23 juillet 2026 vérifiée ; détail réglementaire non lu.');
  person('person-marie-daude', 'Marie Daudé', 'governance', org, 'Secrétaire générale selon l’organigramme de septembre 2026.');
  unit('secretariat-general-role', 'Fonction de secrétaire générale', 'secretariat-general', 'position', 'governance', org, 'Fonction de direction administrative.');
  link('person-marie-daude', 'secretariat-general-role', 'assignment', org);
  add('council-paris', 'Conseil de Paris', 'unit', 'governance', council, 'Assemblée délibérante de la collectivité.');
  link('council-paris', 'city-paris', 'coordination', council);
  add('commission-8', '8e commission : environnement, climat, biodiversité et propreté', 'unit', 'governance', refs('pierre-lombard-2026', 'commission-8-election-2026'), 'Commission thématique du Conseil de Paris ; n’est pas la hiérarchie administrative des services.');
  link('commission-8', 'council-paris', 'coordination', council);
  const lombard = refs('pierre-lombard-2026');
  role('deputy-waste', 'Adjoint chargé de la propreté, de l’assainissement et des déchets', 'governance', lombard, 'Mandat comprenant la réduction des déchets et l’économie circulaire.');
  person('person-pierre-lombard', 'Pierre Lombard', 'governance', lombard, 'Adjoint élu le 29 mars 2026 et membre de la 8e commission.');
  link('person-pierre-lombard', 'deputy-waste', 'mandate', lombard);
  link('person-pierre-lombard', 'commission-8', 'mandate', lombard);
  link('deputy-waste', 'mayor-paris-role', 'mandate', lombard);
  link('deputy-waste', 'dpe', 'coordination', lombard);
  const adj = refs('paris-adjoints-2026');
  role('deputy-territorial', 'Première adjointe : coordination avec les arrondissements', 'governance', adj, 'Mandat comprenant notamment la coordination territoriale.');
  person('person-lamia-el-aaraje', 'Lamia El Aaraje', 'governance', adj, 'Première adjointe selon la composition municipale publiée.');
  link('person-lamia-el-aaraje', 'deputy-territorial', 'mandate', adj);
  link('deputy-territorial', 'mayor-paris-role', 'mandate', adj);
  for (const [id, name, label] of [
    ['alice-timsit', 'Alice Timsit', 'Transition écologique, Plan Climat, eau et énergie'],
    ['marine-rosset', 'Marine Rosset', 'Vie associative et démocratie de proximité'],
    ['aminata-niakate', 'Aminata Niakaté', 'Végétalisation et biodiversité'],
    ['antoine-guillou', 'Antoine Guillou', 'Espaces verts, bois, Seine et canaux'],
    ['thomas-chevandier', 'Thomas Chevandier', 'Espaces publics et coordination des chantiers'],
    ['dan-lert', 'Dan Lert', 'Transports, mobilités et logistique urbaine'],
    ['antoine-alibert', 'Antoine Alibert', 'Santé environnementale et lutte contre les pollutions'],
    ['amina-bouri', 'Amina Bouri', 'Économie sociale et solidaire'],
  ] as const) {
    role(`deputy-${id}`, `Adjoint : ${label}`, 'governance', adj, 'Périmètre politique publié par la Ville de Paris.');
    person(`person-${id}`, name, 'governance', adj, 'Membre de l’exécutif municipal élu le 29 mars 2026.');
    link(`person-${id}`, `deputy-${id}`, 'mandate', adj);
    link(`deputy-${id}`, 'mayor-paris-role', 'mandate', adj);
  }
  const commission = refs('commission-8-election-2026');
  for (const [id, label, name] of [['person-julie-boillot', 'Présidence de la 8e commission', 'Julie Boillot'], ['person-sylvain-maschino', 'Vice-présidence de la 8e commission', 'Sylvain Maschino']] as const) {
    const roleId = id === 'person-julie-boillot' ? 'commission-8-chair' : 'commission-8-vice-chair';
    role(roleId, label, 'governance', commission, 'Fonction élective au sein du bureau de la commission.');
    person(id, name, 'governance', commission, 'Élection attestée par le compte rendu du Conseil de Paris.');
    link(id, roleId, 'mandate', commission);
    link(roleId, 'commission-8', 'mandate', commission);
  }
  for (const [id, name, service] of [['dvd', 'Direction de la Voirie et des Déplacements (DVD)', 'coordination'], ['deve', 'Direction des Espaces Verts et de l’Environnement (DEVE)', 'prevention'], ['dtec', 'Direction de la Transition écologique et du Climat (DTEC)', 'prevention']] as const) {
    unit(id, name, 'city-paris', 'direction', service, org, 'Direction municipale publiée dans l’organigramme.');
  }
  for (const [id, name, target, service] of [
    ['person-veronique-le-gall', 'Véronique Le Gall', 'dpe', 'cleaning'], ['person-frederique-lancestremere', 'Frédérique Lancestremère', 'ddct', 'coordination'], ['person-blaise-lechevalier', 'Blaise Lechevalier', 'municipal-police', 'police'], ['person-francois-wouts', 'François Wouts', 'dvd', 'coordination'], ['person-christophe-rosa', 'Christophe Rosa', 'deve', 'prevention'], ['person-pauline-lavaud', 'Pauline Lavaud', 'dtec', 'prevention'],
  ] as const) {
    person(id, name, service, org, 'Direction attestée par l’organigramme du 9 septembre 2026 ; pas de mandat de coopération CleanMyMap.');
    const directorRole = `${target}-director-role`;
    unit(directorRole, 'Fonction de direction', target, 'position', service, org, 'Fonction de direction de l’unité ; titulaire relié séparément.');
    link(id, directorRole, 'assignment', org);
  }
  for (const [id, name, parent, kind, service, article] of regulationUnits) {
    unit(id, name, parent, kind, service, decree, `Structure attestée par l’article ${article} de l’arrêté du 3 avril 2024. Maintien et titulaire actuels non établis indépendamment.`, all, 'historical');
  }
  // Keep the existing prevention node without an inferred new reporting link.
  const dpmpDecree = refs('dpmp-arrete-2025');
  unit('dpmp-territorial-management', 'Sous-direction des divisions territoriales', 'municipal-police', 'service', 'police', dpmpDecree, 'Organisation réglementaire attestée en janvier 2025 ; maintien détaillé à vérifier.', all, 'historical');
  unit('ddct-territorial-action', 'Sous-direction de l’action territoriale', 'ddct', 'service', 'coordination', refs('req-20-recruitment'), 'Entité citée dans le recrutement REQ ; coordinateur opérationnel inconnu.');
  add('paris-neighborhood-councils', 'Conseils de quartier parisiens', 'unit', 'coordination', refs('conseils-quartier-paris'), 'Instances de concertation ; pas d’autorité hiérarchique sur les services.');
  // Published reception desk numbers: functional public contacts, not individual agents.
  const divisionPhones: readonly [string, string][] = [
    ['division-01-04', '01 55 34 77 17'], ['division-05-06', '01 53 63 03 30'],
    ['division-07-08', '01 45 61 57 00'], ['division-09-10', '01 53 34 11 11'],
    ['division-11', '01 55 28 36 60'], ['division-12', '01 43 41 74 44'],
    ['division-13', '01 53 94 15 30'], ['division-14', '01 56 53 10 20'],
    ['division-15', '01 45 45 86 00'], ['division-16', '01 55 74 44 60'],
    ['division-17', '01 45 61 57 17'], ['division-18', '01 53 09 22 60'],
    ['division-19', '01 53 72 54 00'], ['division-20', '01 40 33 83 33'],
  ];
  for (const [id, phone] of divisionPhones) {
    change(id, { publicContact: { label: `Accueil propreté : ${phone}`, url: 'https://www.paris.fr/pages/la-proprete-239/', sourceIds: refs('paris-cleanliness'), kind: 'functional_contact' } });
  }
  link('dpe', 'syctom', 'cooperation', decree, 'historical');
  // Municipal local level: one town hall per administrative sector, not DPE division.
  for (const [id, label, districts, name, host] of mayors) {
    const territoryIds = territories(...districts);
    const hallId = `town-hall-${id}`;
    const mayorId = `local-mayor-${id}`;
    const divisionId = `dpmp-division-${id}`;
    unit(hallId, `Mairie ${label === 'Paris Centre' ? 'de ' : 'du '}${label}`, 'borough-mayors', 'unit', 'governance', elected, 'Mairie de secteur, distincte de la division de propreté.', territoryIds, 'confirmed', { territoryCoverageGroup: 'town-halls', publicContact: { label: 'Portail officiel de la mairie', url: `https://${host}/`, sourceIds: elected, kind: 'official_portal' } });
    role(mayorId, `Maire ${label === 'Paris Centre' ? 'de ' : 'du '}${label}`, 'governance', elected, 'Mandat local ; ne constitue pas la hiérarchie des directions techniques.', territoryIds, 'local_mayor');
    const personId = `person-${name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    person(personId, name, 'governance', elected, 'Maire indiqué dans la liste municipale des élus de la mandature 2026.', territoryIds);
    link(personId, mayorId, 'mandate', elected);
    link(mayorId, hallId, 'mandate', elected);
    unit(divisionId, `Division de tranquillité publique ${label}`, 'municipal-police', 'unit', 'police', police, 'Division de police municipale, distincte de la division DPE.', territoryIds, 'confirmed', { territoryCoverageGroup: 'dpmp-divisions' });
    link(hallId, divisionId, 'coordination', police);
  }
  reparent('dgs-19', 'town-hall-19');
  reparent('dgaep', 'town-hall-20');
  change('dgs-19', { coverageRole: 'local_dgs' });
  change('dgaep-19', { coverageRole: 'local_dgaep' });
  change('dgaep', { coverageRole: 'local_dgaep' });
  change('req', { coverageRole: 'req' });
  const ekon = refs('carine-ekon-ville-2026', 'carine-ekon-20-2026');
  role('local-delegation-20-waste', 'Délégation propreté, réemploi, économie circulaire et climat du 20e', 'governance', ekon, 'Délégation politique locale ; distincte de la direction administrative.', territories(20), 'local_delegation');
  person('person-carine-ekon', 'Carine Ekon', 'governance', ekon, 'Conseillère déléguée du 20e et vice-présidente de la 8e commission.');
  link('person-carine-ekon', 'local-delegation-20-waste', 'mandate', ekon);
  link('person-carine-ekon', 'commission-8-vice-chair', 'mandate', ekon);
  link('person-carine-ekon', 'council-paris', 'mandate', ekon);
  link('local-delegation-20-waste', 'town-hall-20', 'mandate', ekon);
  for (const [district, sourceId] of [[11, 'req-11-offer'], [18, 'req-18-offer']] as const) {
    add(`req-recruitment-${district}`, `Recrutement REQ du ${district}e`, 'position', 'coordination', refs(sourceId), 'Offre documentée dans le dossier REQ ; aucun titulaire ni périmètre précis établi.', territories(district), 'unknown', { coverageRole: 'req' });
  }
  const req8 = refs('req-8-portrait');
  role('req-08', 'Référent de l’entretien du quartier du 8e', 'coordination', req8, 'Prise de fonction attestée le 14 septembre 2026 ; quartiers précis inconnus.', territories(8), 'req');
  change('req-08', { searchTerms: ['REQ'] });
  person('person-regine-merlin', 'Régine Merlin', 'coordination', req8, 'Prise de fonction publiée dans le magazine municipal ; pas de contact nominatif direct.', territories(8));
  link('person-regine-merlin', 'req-08', 'assignment', req8);
  link('req-08', 'town-hall-08', 'coordination', req8);
  const req9 = refs('req-9-cr-2024');
  add('req-historical-09', 'Référent propreté du 9e (2024)', 'position', 'coordination', req9, 'Pigalle-Martyrs, Anvers-Montholon, Faubourg Montmartre ; maintien dans le dispositif actuel non prouvé.', territories(9), 'historical', { coverageRole: 'req' });
  person('person-vincent-chetouani', 'Vincent Chetouani', 'coordination', req9, 'Affectation historique en octobre 2024, sans preuve de fonction actuelle.', territories(9), 'historical');
  link('person-vincent-chetouani', 'req-historical-09', 'assignment', req9, 'historical');
  return { nodes, relations, sources };
}
