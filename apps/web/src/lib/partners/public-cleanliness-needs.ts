import { getPublicCleanlinessContact, type PublicCleanlinessCityDataset, type PublicCleanlinessOrganizationNode as Node, type OrganizationSource } from "./public-cleanliness-organization";
import type { WasteCategorySlug } from "@/lib/waste/types";
import { PARIS_CLEANWALK_RELATIONS } from "./paris-cleanwalk-network.relations";

type Localized = { fr: string; en: string };
const copy = (fr: string, en: string): Localized => ({ fr, en });
type Target = { id?: string; group?: string; role?: Node['coverageRole']; required: boolean; rationale: Localized };
type Rule = { label: Localized; targets: readonly Target[]; guidance: Localized; gaps: Localized; sourceIds: readonly string[]; wasteCategories?: readonly WasteCategorySlug[] };
const node = (id: string, fr: string, en: string, required = true): Target => ({ id, required, rationale: copy(fr, en) });
const group = (group: string, fr: string, en: string): Target => ({ group, required: true, rationale: copy(fr, en) });
const dpe = group("stpp-divisions", "Accueil de la division compétente", "Local street-cleaning division");
const hall = group("town-halls", "Coordination politique et administrative locale", "Local municipal coordination");
const police = group("dpmp-divisions", "Police de proximité, selon ses compétences", "Local municipal policing within its remit");
const programme = node("participatory-cleaning", "Demande opérationnelle officielle", "Official operational request");
const req: Target = { role: "req", required: false, rationale: copy("Relais REQ attesté ou à confirmer", "Neighborhood maintenance contact, subject to evidence") };
const rules = {
  organize: {
    label: copy("Organiser une cleanwalk", "Organize a cleanup"),
    targets: [programme, dpe, hall],
    guidance: copy("Contacter le service de propreté avant l'action avec le lieu, la date, l'effectif prévu et les flux. La démarche municipale concerne les nettoyages participatifs ordinaires ; les activités ou occupations particulières restent à vérifier.", "Contact the street-cleaning service before the event with the location, date, anticipated participants and waste streams. Check any special use of public space separately."),
    gaps: copy("Accord opérationnel, référent du jour J et conditions spécifiques au site à confirmer.", "Operational agreement, on-the-day contact and site-specific conditions remain unconfirmed."),
    sourceIds: ["paris-participatory-cleaning"],
  },
  equipment: {
    label: copy("Obtenir du matériel", "Request equipment"),
    targets: [programme, dpe, node("stpp-mechanical", "Structure interne historique, pas un guichet de prêt", "Historical internal structure, not a loan counter", false), node("stpp-supply-center", "Approvisionnement interne, accès non établi", "Internal supply centre, access unconfirmed", false), node("dilt", "Logistique municipale générale, pas de prêt établi", "General municipal logistics, no loan established", false)],
    guidance: copy("La Ville annonce des sacs et des gants sur demande, et des cendriers de poche selon disponibilité. Demander confirmation écrite du stock, du retrait, du retour et des conditions applicables.", "Paris advertises bags and gloves on request, and pocket ashtrays subject to availability. Confirm stock, pickup, return and eligibility in writing."),
    gaps: copy("Pinces, chasubles, quantités, dépôt de retrait, réservation et accès aux stocks internes : non établis.", "Litter pickers, vests, quantities, pickup location, reservations and access to internal stocks are not established."),
    sourceIds: ["paris-participatory-cleaning", "dpe-arrete-2024"],
  },
  removal: {
    label: copy("Faire enlever les déchets collectés", "Arrange waste removal"),
    targets: [programme, dpe, node("municipal-collection-regie", "Régie ménagère selon le territoire", "Municipal household collection by territory", false), node("private-collectors", "Collecte ménagère déléguée selon le territoire", "Contracted household collection by territory", false), node("professional-waste-service", "Conditions pour associations et professionnels", "Conditions for associations and businesses"), node("syctom", "Traitement en aval, pas ramassage sur site", "Downstream treatment, not on-site pickup"), node("syctom-dgaevd", "Contrats de traitement et réception des collectes", "Treatment contracts and reception of municipal collections", false)],
    guidance: copy("Convenir avec la division du lieu, du créneau et des flux acceptés. Ne laisser aucun sac sur la voie publique sans consigne explicite. La répartition ménagère régie/prestataire n'est pas un accord pour une cleanwalk.", "Agree the pickup point, time and accepted streams with the division. Do not leave bags in public space without explicit instructions. Household collection arrangements are not an event pickup agreement."),
    gaps: copy("Titulaires des marchés, contrats par flux et période, transport et confirmation de prise en charge de l'opération : non établis.", "Contract holders, stream-specific contracts and validity, transport and confirmed event pickup remain unestablished."),
    sourceIds: ["paris-participatory-cleaning", "paris-collection", "paris-professional-waste"],
    wasteCategories: ["mixed_residual", "sharps"],
  },
  storage: {
    label: copy("Trouver un point de stockage ou de dépôt", "Find a storage or drop-off location"),
    targets: [dpe, node("municipal-tri-sites", "Liste officielle et conditions d'admission", "Official list and admission conditions"), node("municipal-waste-channels", "Consignes selon les flux", "Stream-specific instructions"), node("professional-waste-service", "Solutions pour déchets non ménagers", "Non-household waste options")],
    guidance: copy("Demander un point et un créneau expressément autorisés. Les Espaces tri sont destinés aux particuliers selon conditions ; les associations doivent faire instruire une demande préalable. Une adresse administrative ou industrielle n'est pas un dépôt autorisé.", "Ask for an explicitly approved site and time. Municipal recycling centres normally serve residents subject to conditions; associations need prior approval. Administrative or industrial addresses are not authorized drop-off locations."),
    gaps: copy("Aucun stock, site de massification, accès association ou dépôt de sacs confirmé pour cette opération.", "No stock, consolidation site, association access or bag drop-off confirmed for this event."),
    sourceIds: ["paris-tri-sites", "paris-tri-lilas", "paris-professional-waste"],
  },
  cigarette: {
    label: copy("Faire traiter des mégots", "Find a cigarette-butt treatment route"),
    targets: [dpe, node("asso-megots-alcome", "REP et orientation, pas collecteur direct", "Producer responsibility and guidance, not direct collection"), node("asso-megots-cyclope", "Valorisation énergétique annoncée ; offre à vérifier", "Advertised energy recovery; confirm offer", false), node("operator-ckfd", "Collecte spécialisée et filière matière annoncées ; demander un devis petits volumes et l’accord de réception à Gennevilliers", "Advertised specialist collection and material recovery; request a small-batch quote and acceptance at Gennevilliers", false), node("operator-carton-plein-cyclo", "Transport à vélo sur devis seulement après accord de reprise ; mégots et trajet à confirmer", "Quoted cycle transport only after acceptance agreement; confirm cigarette butts and route", false), node("municipal-tri-sites", "Interroger le gestionnaire sur un bac commun autorisé ; aucun dépôt établi", "Ask the site operator about an authorized shared container; no established drop-off", false), node("asso-megots-ecomegot", "Offre déclarée, zone à confirmer", "Provider offer, coverage unconfirmed", false), node("asso-megots-tchaomegot", "Offre déclarée, zone à confirmer", "Provider offer, coverage unconfirmed", false)],
    guidance: copy("Demander d’abord à la division et à ALCOME si les mégots ramassés au sol peuvent rejoindre un stock municipal. Le seuil de 100 kg concerne les collectivités sous contrat ; à défaut, négocier un tarif petits volumes ou une tournée mutualisée. Confirmer le conditionnement, le site autorisé, le transport, le prix et le traitement réel avant tout dépôt.", "First ask the district service and ALCOME whether ground-collected butts can join municipal stock. The 100 kg threshold applies to contracted local authorities; otherwise negotiate a small-batch price or shared collection. Confirm packaging, authorized site, transport, cost and actual treatment before any drop-off."),
    gaps: copy("Aucun bac commun, dépôt direct à Gennevilliers, transport à vélo, tarif associatif, financement ni recyclage du lot n’est confirmé.", "No shared container, direct Gennevilliers drop-off, cycle transport, nonprofit rate, funding or batch recycling is confirmed."),
    sourceIds: ["alcome-rep", "cyclope-service", "ckfd-megots-service", "carton-plein-cyclo-service", "paris-tri-sites", "ecomegot-service", "tchaomegot-service"],
    wasteCategories: ["cigarette_butt"],
  },
  coordinated: {
    label: copy("Organiser une opération coordonnée avec la mairie", "Coordinate an event with the town hall"),
    targets: [hall, dpe, programme, req, node("ddct", "Coordination territoriale", "Territorial coordination"), node("dvd", "Voirie, lorsque compétente", "Roads, where relevant"), police, node("deve", "Espaces verts, lorsque compétente", "Parks, where relevant")],
    guidance: copy("Solliciter les autorités compétentes selon le lieu. Un accord de la mairie ne vaut pas automatiquement accord logistique DPE, autorisation du gestionnaire du site ou intervention de police.", "Contact the authorities responsible for the site. Town-hall agreement does not automatically establish DPE logistics, site-manager permission or police involvement."),
    gaps: copy("Chef de file, décideur habilité, périmètre du site et engagements de chaque service à confirmer.", "Lead contact, authorized decision maker, site remit and each service's commitment need confirmation."),
    sourceIds: ["paris-participatory-cleaning", "paris-org-chart", "paris-incivility"],
  },
  mobilize: {
    label: copy("Mobiliser des habitants, étudiants ou entreprises RSE", "Mobilize residents, students or CSR teams"),
    targets: [hall, node("paris-mvac", "Relais associatif et communication", "Community and communications support"), node("paris-agir", "Publication de missions selon conditions", "Mission publishing subject to conditions"), node("paris-volunteers", "Programme d'engagement municipal", "Municipal volunteering programme"), node("paris-neighborhood-councils", "Concertation de quartier", "Neighborhood consultation"), node("sorbonne-student-life", "Pour la communauté de Sorbonne Université uniquement", "For the Sorbonne University community only", false), node("djs", "Jeunesse", "Youth", false), node("dasco", "Écoles", "Schools", false), node("dicom", "Communication municipale, sans diffusion acquise", "Municipal communications, no guaranteed publication", false), node("dpe-reduction", "Service de réduction et d’innovation documenté historiquement", "Historically documented waste-reduction service", false), node("syctom-dgampt", "Accompagnement territorial de prévention", "Territorial waste-prevention support", false), node("eco-organisme-citeo", "Accompagnement du tri pour les collectivités", "Recycling support for local authorities", false)],
    guidance: copy("Définir le public et solliciter le relais concerné. Vérifier l'éligibilité de la mission et l'accord du gestionnaire ou de l'établissement avant diffusion. Les acteurs RSE choisissent leur engagement.", "Identify the audience and contact the relevant intermediary. Confirm mission eligibility and site or institution agreement before publication. CSR actors choose their involvement."),
    gaps: copy("Interlocuteurs nominatifs locaux, établissements partenaires, bénévoles, communication et soutien RSE effectivement engagés : non confirmés.", "Named local contacts, participating institutions, volunteers, communications and actual CSR commitment are unconfirmed."),
    sourceIds: ["paris-mvac", "paris-civic-platform", "paris-volunteers", "sorbonne-student-engagement", "syctom-org", "citeo-territories"],
  },
  report: {
    label: copy("Faire remonter un problème récurrent de propreté", "Report a recurring cleanliness problem"),
    targets: [node("paris-dans-ma-rue", "Signalement public", "Public reporting"), dpe, police, hall, req, node("ddct", "Coordination, si le problème est transversal", "Coordination for cross-service issues", false)],
    guidance: copy("Signaler l'anomalie via Dans Ma Rue ; contacter le 3975 pour les incivilités relevant de la police municipale. Pour un danger immédiat, utiliser les services d'urgence appropriés. Ne pas manipuler les déchets dangereux.", "Report anomalies via Dans Ma Rue; use 3975 for matters within municipal police remit. For immediate danger, contact the appropriate emergency services. Do not handle hazardous waste."),
    gaps: copy("Responsable REQ, suivi du signalement, réponse et délai d'intervention non confirmés.", "REQ contact, case follow-up, response and intervention time are unconfirmed."),
    sourceIds: ["paris-incivility", "paris-cleanliness"],
    wasteCategories: ["sharps"],
  },
} satisfies Record<string, Rule>;

export type PublicCleanlinessNeed = keyof typeof rules;
export const PUBLIC_CLEANLINESS_NEEDS = Object.keys(rules) as PublicCleanlinessNeed[];
export function getPublicCleanlinessNeedLabel(need: PublicCleanlinessNeed) { return rules[need].label; }

/** Strict public projection: never accept a private contact record, action draft or relationship store. */
export function getPublicCleanlinessNeedRoute(dataset: PublicCleanlinessCityDataset, territoryId: string, need: PublicCleanlinessNeed) {
  if (dataset.city !== "Paris" || !dataset.territoryIds.includes(territoryId) || !Object.prototype.hasOwnProperty.call(rules, need)) return null;
  const rule: Rule = rules[need];
  const sourceById = new Map(dataset.sources.map(s => [s.id, s]));
  const sourceList = (ids: readonly string[]) => ids.flatMap(id => {
    const source = sourceById.get(id);
    return source ? [{ id: source.id, label: source.label, url: source.url, evidence: source.evidence, verifiedAt: source.verifiedAt, sourceContentDate: source.sourceContentDate }] : [];
  });
  const matches = (n: Node) => n.territoryIds.includes(territoryId);
  const targetIds = new Set<string>();
  const missing: Localized[] = [];
  const targets = rule.targets.flatMap(target => {
    const candidates = dataset.nodes.filter(n => (target.id ? n.id === target.id : target.role ? n.coverageRole === target.role : n.territoryCoverageGroup === target.group) && (matches(n) || (target.id && n.territoryIds.length === 0)));
    if (!candidates.length && target.required) missing.push(target.rationale);
    return candidates.filter(n => !targetIds.has(n.id)).map(n => {
      targetIds.add(n.id);
      // Resolve only documented current holders of relevant functions; no assumed hierarchy from a political mandate.
      const roleIds = new Set([n.id, ...dataset.relations.filter(e => e.kind === "hierarchy" && e.from === n.id && e.status === "confirmed").map(e => e.to), ...dataset.relations.filter(e => e.kind === "mandate" && e.to === n.id && e.status === "confirmed").map(e => e.from)]);
      const holderIds = new Set(dataset.relations.filter(e => (e.kind === "assignment" || e.kind === "mandate") && e.status === "confirmed" && roleIds.has(e.to)).map(e => e.from));
      const holders = dataset.nodes.filter(p => p.kind === "person" && p.assignment === "confirmed" && holderIds.has(p.id) && matches(p)).map(p => ({ id: p.id, name: p.name }));
      const publicContact = getPublicCleanlinessContact(n, dataset.sources);
      return { id: n.id, name: n.name, status: n.assignment, territoryKnown: matches(n), rationale: target.rationale, holders, contact: publicContact, sources: sourceList(n.sourceIds) };
    });
  });
  const sources: OrganizationSource[] = sourceList(rule.sourceIds);
  return { targets, missing, guidance: rule.guidance, gaps: rule.gaps, sources, wasteCategories: rule.wasteCategories ?? [] };
}

/** Reuse the public 3D relation registry, not the administrative relationship tracker. */
export function getPublicInstitutionalContributions(dataset: PublicCleanlinessCityDataset, selectedId: string) {
  if (dataset.city !== "Paris") return [];
  const ids = new Map(dataset.nodes.flatMap(n => {
    const ref = n.networkActorId ?? n.directoryId;
    return ref ? [[ref, n] as const] : [];
  }));
  return PARIS_CLEANWALK_RELATIONS.flatMap(relation => {
    const from = ids.get(relation.sourceId);
    const to = ids.get(relation.targetId);
    if (!from || !to || (from.id !== selectedId && to.id !== selectedId) || relation.source.certainty !== "verifie") return [];
    return [{ id: relation.id, otherId: from.id === selectedId ? to.id : from.id, otherName: from.id === selectedId ? to.name : from.name, type: relation.relationType, title: relation.title, summary: relation.summary, source: relation.source }];
  });
}
