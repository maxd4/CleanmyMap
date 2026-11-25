import type { OrganizationSource, PublicCleanlinessCityDataset, PublicCleanlinessOrganizationNode as Node, PublicCleanlinessOrganizationRelation as Edge } from "./public-cleanliness-organization";

const sources: readonly OrganizationSource[] = [
  { id: "paris-participatory-cleaning", label: "Ville de Paris : nettoyages participatifs", url: "https://www.paris.fr/pages/nettoyages-participatifs-ensemble-rendons-paris-plus-propre-15425", sourceContentDate: "2023-07-03", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "paris-professional-waste", label: "Ville de Paris : gestion des déchets professionnels", url: "https://www.paris.fr/pages/gestion-des-dechets-3545", sourceContentDate: "2025-03-19", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "paris-tri-sites", label: "Ville de Paris : liste des Espaces tri", url: "https://www.paris.fr/lieux/espaces-tri-decheteries/tous-les-horaires", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "paris-tri-lilas", label: "Espace tri Porte des Lilas : conditions d'accès et demande préalable des associations", url: "https://www.paris.fr/lieux/espace-tri-de-la-porte-des-lilas-decheterie-1764", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "paris-mvac", label: "Ville de Paris : Maisons de la vie associative et citoyenne", url: "https://www.paris.fr/pages/les-maisons-de-la-vie-associative-et-citoyenne-5388/", sourceContentDate: "2022-03-14", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "paris-volunteers", label: "Ville de Paris : Volontaires de Paris", url: "https://www.paris.fr/pages/volontaires-de-paris-engagez-vous-6922/", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "paris-civic-platform", label: "Ville de Paris : Agir et mobilisation de bénévoles", url: "https://www.paris.fr/pages/benevolat-175/", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "paris-incivility", label: "Ville de Paris : signaler une incivilité du quotidien", url: "https://www.paris.fr/pages/signaler-une-incivilite-du-quotidien-3800", sourceContentDate: "2026-06-29", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "sorbonne-student-engagement", label: "Sorbonne Université : vie associative et citoyenne", url: "https://www.sorbonne-universite.fr/formation-et-vie-etudiante/vie-etudiante/vie-associative-et-citoyenne", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "syctom-governance-2026", label: "Syctom : installation du conseil syndical et élection du bureau", url: "https://www.syctom-paris.fr/actualites/election-du-bureau-syndical-du-syctom-consensus-sur-la-nouvelle-gouvernance-1.html", sourceContentDate: "2026-06-16", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "syctom-org", label: "Syctom : organigramme et directions", url: "https://www.syctom-paris.fr/le-syctom-lagence-metropolitaine-des-dechets-menagers/organigramme-et-effectifs.html", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "syctom-contact", label: "Syctom : contact institutionnel", url: "https://www.syctom-paris.fr/contacts.html", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "syctom-nanterre-2026", label: "Syctom : prolongation du marché de Nanterre et fermeture Paris XVII", url: "https://www.syctom-paris.fr/actualites/le-marche-dexploitation-du-centre-de-tri-a-nanterre-prolonge-de-18-mois.html", sourceContentDate: "2026-03-10", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "syctom-semop", label: "Syctom : marchés d'exploitation et SEMOP", url: "https://www.syctom-paris.fr/actualites/le-syctom-fait-le-choix-de-la-semop-pour-la-gestion-de-ses-installations.html", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "syctom-valoest", label: "Syctom : groupement retenu pour Romainville/Bobigny", url: "https://www.syctom-paris.fr/actualites/le-syctom-confie-a-suez-et-chantiers-modernes-construction-la-transformation-du-centre-de-traitement-des-dechets-de-romainville-bobigny.html", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "syctom-sorting", label: "Syctom : centres de tri", url: "https://www.syctom-paris.fr/centres-de-traitement/centres-de-tri.html", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "paris-residual-treatment", label: "Ville de Paris : destination des déchets non triés", url: "https://www.paris.fr/pages/que-deviennent-les-dechets-non-tries-36100", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "alcome-rep", label: "ALCOME : filière REP tabac et accompagnements", url: "https://alcome.eco/faq-3/", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "alcome-contact", label: "ALCOME : contact et accompagnement", url: "https://alcome.eco/", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "citeo-territories", label: "Citeo : accompagnement des collectivités pour les emballages et papiers", url: "https://www.citeo.com/territoires/", verifiedAt: "2026-11-25", evidence: "official_current" },
  { id: "cyclope-service", label: "Cy-Clope : offre déclarée de collecte sur devis en Île-de-France", url: "https://www.cy-clope.com/prix-collecte-recyclage-megot/", verifiedAt: "2026-11-25", evidence: "operator_statement" },
  { id: "ecomegot-service", label: "Écomégot : offre déclarée de collecte des mégots", url: "https://ecomegot.com/collecte-megots/", verifiedAt: "2026-11-25", evidence: "operator_statement" },
  { id: "ckfd-megots-service", label: "CKFD : collecte francilienne et massification annoncées", url: "https://www.ckfd.fr/recyclage-dechets/megot-de-cigarette", verifiedAt: "2026-11-25", evidence: "operator_statement" },
  { id: "mego-megots-service", label: "MéGO! : recyclage matière annoncé", url: "https://www.me-go.fr/a-propos/", verifiedAt: "2026-11-25", evidence: "operator_statement" },
  { id: "carton-plein-cyclo-service", label: "Carton Plein : collecte professionnelle de déchets à vélo", url: "https://cartonplein.org/nos-services-cyclologistique/collecte-de-dechets-a-paris-et-en-proche-banlieue/", verifiedAt: "2026-11-25", evidence: "operator_statement" },
  { id: "tchaomegot-service", label: "TchaoMegot : offre déclarée de collecte et traitement", url: "https://tchaomegot.com/contactez-nous/", verifiedAt: "2026-11-25", evidence: "operator_statement" },
];

export function extendParisWasteChain(base: Pick<PublicCleanlinessCityDataset, "nodes" | "relations" | "sources">) {
  const nodes = [...base.nodes];
  const relations = [...base.relations];
  const all = nodes.find(n => n.id === "city-paris")?.territoryIds;
  if (!all) throw new Error("Missing Paris root");
  const sourceById = new Map([...base.sources, ...sources].map(s => [s.id, s]));
  const patch = (id: string, change: Partial<Node>) => {
    const i = nodes.findIndex(n => n.id === id);
    if (i < 0) throw new Error("Missing Paris node: " + id);
    nodes[i] = { ...nodes[i], ...change };
  };
  const contact = (sourceId: string, label: string, kind: "official_portal" | "functional_contact" = "official_portal"): NonNullable<Node["publicContact"]> => {
    const source = sourceById.get(sourceId);
    if (!source) throw new Error("Missing contact source: " + sourceId);
    return { label, url: source.url, kind, sourceIds: [sourceId] };
  };
  const add = (id: string, name: string, kind: Node["kind"], service: Node["service"], sourceIds: readonly string[], description: string, extras: Partial<Node> = {}) => {
    nodes.push({ id, name, kind, service, sourceIds, description, territoryIds: all, assignment: "confirmed", ...extras });
  };
  const link = (from: string, to: string, kind: Edge["kind"], sourceIds: readonly string[], metadata: Pick<Edge, "validFrom" | "validUntil" | "status"> = { status: "confirmed" }) => {
    relations.push({ id: "waste-chain:" + kind + ":" + from + ":" + to, from, to, kind, sourceIds, ...metadata });
  };
  const unit = (id: string, name: string, parent: string, employer: string, service: Node["service"], sourceId: string, description: string) => {
    add(id, name, "direction", service, [sourceId], description, { unitId: parent, legalEmployerId: employer });
    link(parent, id, "hierarchy", [sourceId]);
  };
  // Municipal collection regime is distinct from a commitment to remove an event's waste.
  const regie = new Set([2, 5, 6, 8, 9, 12, 14, 16, 17, 20].map(n => "Paris:" + n));
  const scopeSource = ["paris-collection", "paris-professional-waste"];
  add("municipal-collection-regie", "Collecte municipale en régie", "unit", "collection", scopeSource, "Répartition publiée pour les déchets ménagers et assimilés. Elle ne vaut pas accord d'enlèvement pour une cleanwalk.", { territoryIds: all.filter(id => regie.has(id)), unitId: "stpp", legalEmployerId: "city-paris" });
  link("stpp", "municipal-collection-regie", "hierarchy", scopeSource);
  patch("private-collectors", { territoryIds: all.filter(id => !regie.has(id)), sourceIds: scopeSource, description: "Collecte ménagère confiée à des entreprises privées selon la répartition publiée. Noms des titulaires, flux exacts, marchés et dates de validité non établis ; aucun contrat pour une cleanwalk n'est présumé." });
  add("participatory-cleaning", "Dispositif Nettoyages participatifs", "service", "coordination", ["paris-participatory-cleaning"], "Formulaire pour habitants, associations et entreprises. Gants et sacs annoncés sur demande ; cendriers de poche selon disponibilité. Pinces, quantités, retrait, transport et enlèvement effectif à confirmer.", { publicContact: contact("paris-participatory-cleaning", "Formulaire Nettoyages participatifs", "functional_contact") });
  link("dpe", "participatory-cleaning", "programme", ["paris-participatory-cleaning"]);
  add("municipal-waste-channels", "Collecte par flux et apport volontaire", "service", "collection", ["paris-collection"], "Flux municipaux : résiduels, verre, emballages et papiers, déchets alimentaires en apport volontaire, encombrants et déchets spécifiques. Conditions propres à chaque flux et usager ; aucun point de dépôt de sacs de cleanwalk n'est présumé.", { publicContact: contact("paris-collection", "Consignes et points d'apport") });
  link("dpe", "municipal-waste-channels", "service", ["paris-collection"]);
  add("professional-waste-service", "Déchets non ménagers et prestataires", "service", "collection", ["paris-professional-waste"], "Les associations et professionnels organisent l'élimination de leurs déchets. Collecte municipale payante pour certains déchets assimilables ou prestataire privé ; demander les conditions applicables à l'opération.", { publicContact: contact("paris-professional-waste", "Modalités DNM et prestataires") });
  link("dpe", "professional-waste-service", "service", ["paris-professional-waste"]);
  add("municipal-tri-sites", "Déchèteries et Espaces tri municipaux", "service", "collection", ["paris-tri-sites", "paris-tri-lilas"], "Liste officielle des sites. L'accès ordinaire est réservé aux particuliers selon conditions ; une association doit faire instruire une demande préalable. Ni stockage ni dépôt de sacs autorisé par défaut.", { publicContact: contact("paris-tri-sites", "Liste et fiches des Espaces tri") });
  link("dpe", "municipal-tri-sites", "service", ["paris-tri-sites"]);
  add("tri-site-lilas", "Espace tri Porte des Lilas", "unit", "collection", ["paris-tri-lilas"], "Site situé dans le 20e. La fiche prévoit une demande préalable pour les associations ; acceptation, flux et accès à confirmer. Pas un point de massification cleanwalk attesté.", { territoryIds: [], publicContact: contact("paris-tri-lilas", "Fiche du site et demande d'autorisation") });
  link("municipal-tri-sites", "tri-site-lilas", "service", ["paris-tri-lilas"]);
  add("paris-mvac", "Maisons de la vie associative et citoyenne (MVAC)", "service", "coordination", ["paris-mvac"], "Accompagnement de projets, recherche de bénévoles, relais associatifs et communication. Conditions d'inscription et règlement propres aux services ; aucun stockage de déchets ni prêt de matériel de ramassage attesté.", { publicContact: contact("paris-mvac", "Contacts et inscription MVAC") });
  link("city-paris", "paris-mvac", "service", ["paris-mvac"]);
  add("paris-volunteers", "Volontaires de Paris", "service", "coordination", ["paris-volunteers", "paris-civic-platform"], "Programme municipal de mobilisation ; aucune affectation de bénévoles n'est garantie pour une opération.", { publicContact: contact("paris-volunteers", "Programme Volontaires de Paris") });
  add("paris-agir", "Agir.paris", "service", "coordination", ["paris-civic-platform"], "Canal de publication de missions pour les associations et collectifs, selon les conditions de la plateforme.", { publicContact: contact("paris-civic-platform", "Modalités de mobilisation") });
  link("city-paris", "paris-volunteers", "programme", ["paris-volunteers"]);
  link("paris-volunteers", "paris-agir", "service", ["paris-civic-platform"]);
  for (const [id, label, holderId, holderName] of [
    ["djs", "Direction de la Jeunesse et des Sports (DJS)", "person-francois-tchekemian", "François Tchekemian"],
    ["dasco", "Direction des Affaires Scolaires (DASCO)", "person-catherine-baratti-elbaz", "Catherine Baratti-Elbaz"],
    ["dicom", "Direction de l'Information et de la Communication (DICOM)", "person-anthony-leroi", "Anthony Leroi"],
    ["dilt", "Direction de l'Immobilier, de la Logistique et des Transports (DILT)", "person-christine-foucart", "Christine Foucart"],
  ] as const) {
    unit(id, label, "city-paris", "city-paris", "coordination", "paris-org-chart", "Direction municipale publiée ; interlocuteur opérationnel, accès au matériel et participation à une cleanwalk à confirmer.");
    const roleId = id + "-director-role";
    add(roleId, "Fonction de direction", "position", "coordination", ["paris-org-chart"], "Fonction de direction, distincte du responsable opérationnel de l'événement.", { unitId: id, legalEmployerId: "city-paris" });
    link(id, roleId, "hierarchy", ["paris-org-chart"]);
    add(holderId, holderName, "person", "coordination", ["paris-org-chart"], "Direction attestée par l'organigramme municipal du 9 septembre 2026.");
    link(holderId, roleId, "assignment", ["paris-org-chart"]);
  }
  add("sorbonne-student-life", "Sorbonne Université : services de la vie étudiante", "service", "coordination", ["sorbonne-student-engagement"], "Accompagnement des projets étudiants et associatifs de l'établissement ; pas un interlocuteur universel pour toute école ni un partenariat CleanMyMap.", { territoryIds: [], publicContact: contact("sorbonne-student-engagement", "Vie associative et citoyenne") });
  add("paris-dans-ma-rue", "Dans Ma Rue et signalements", "service", "police", ["paris-incivility"], "Canal public de signalement des anomalies sur l'espace public. Pour les incivilités relevant de la police municipale : 3975. Ne remplace pas une confirmation d'enlèvement.", { publicContact: contact("paris-incivility", "Démarches et 3975", "functional_contact") });
  link("city-paris", "paris-dans-ma-rue", "service", ["paris-incivility"]);
  link("municipal-police", "paris-dans-ma-rue", "service", ["paris-incivility"]);

  // Syctom is a separate legal employer and not a reporting unit of the DPE.
  patch("syctom", { networkActorId: "collectivite-syctom", publicContact: contact("syctom-contact", "Accueil Syctom : 01 40 13 17 00", "functional_contact"), sourceIds: ["paris-collection", "syctom-org", "syctom-contact"] });
  add("syctom-council", "Comité syndical du Syctom", "unit", "governance", ["syctom-governance-2026"], "Instance composée des représentants des collectivités adhérentes.");
  add("syctom-presidency", "Présidence du Syctom", "position", "governance", ["syctom-governance-2026"], "Mandat élu par le conseil syndical.");
  add("syctom-vice-presidency", "Vice-présidences du Syctom", "position", "governance", ["syctom-governance-2026"], "Quinze vice-présidences élues le 5 juin 2026.");
  add("person-corentin-duprey", "Corentin Duprey", "person", "governance", ["syctom-governance-2026"], "Président réélu le 5 juin 2026.");
  link("person-corentin-duprey", "syctom-presidency", "mandate", ["syctom-governance-2026"]);
  link("syctom-presidency", "syctom-council", "mandate", ["syctom-governance-2026"]);
  link("syctom-vice-presidency", "syctom-council", "mandate", ["syctom-governance-2026"]);
  link("syctom-council", "syctom", "mandate", ["syctom-governance-2026"]);
  for (const id of ["person-pierre-lombard", "person-geoffroy-boulard", "person-antoine-alibert", "person-jerome-coumet"]) {
    link(id, "syctom-vice-presidency", "mandate", ["syctom-governance-2026"]);
  }
  for (const [id, name, description] of [
    ["syctom-dgst", "Direction générale des services techniques (DGST)", "Patrimoine industriel, construction et modernisation."],
    ["syctom-dgaevd", "DGA Exploitation et valorisation des déchets (DGAEVD)", "Suivi des installations, contrats d'exploitation et réception des collectes des territoires."],
    ["syctom-dgarm", "DGA Ressources et moyens (DGARM)", "Ressources humaines, financières, juridiques, informatique et administration générale."],
    ["syctom-dgampt", "DGA Mobilisation, publics et territoires (DGAMPT)", "Prévention, sensibilisation, tri et accompagnement des territoires adhérents."],
  ] as const) unit(id, name, "syctom", "syctom", "provider", "syctom-org", description);
  for (const [id, label] of [["nanterre", "Nanterre"], ["paris-15", "Paris XV"], ["paris-17", "Paris XVII"], ["sevran", "Sevran"], ["romainville", "Romainville/Bobigny"]] as const) {
    add("syctom-tri-" + id, "Centre de tri du Syctom : " + label, "unit", "provider", ["syctom-sorting"], "Installation de traitement ; opérateur contractuel, territoires desservis et accès direct de tiers non établis.", { territoryIds: [] });
    link("syctom", "syctom-tri-" + id, "service", ["syctom-sorting"]);
  }
  patch("syctom-tri-paris-17", { assignment: "historical", sourceIds: ["syctom-sorting", "syctom-nanterre-2026"], description: "Centre détruit par un incendie en avril 2025 ; fermeture de durée indéterminée confirmée le 10 mars 2026. Réouverture non établie, ne pas orienter de déchets vers ce site." });
  const closedEdge = relations.findIndex(edge => edge.to === "syctom-tri-paris-17" && edge.from === "syctom");
  if (closedEdge >= 0) relations[closedEdge] = { ...relations[closedEdge], status: "historical", sourceIds: ["syctom-nanterre-2026"] };
  for (const [id, label] of [["saint-ouen", "Saint-Ouen"], ["issy", "Issy-les-Moulineaux"], ["ivry", "Ivry/Paris XIII"]] as const) {
    add("syctom-uve-" + id, "Unité de valorisation énergétique : " + label, "unit", "provider", ["paris-residual-treatment"], "Installation de valorisation énergétique ; destination effective de chaque lot et exploitant à vérifier. Aucun accès public de dépôt.", { territoryIds: [] });
    link("syctom", "syctom-uve-" + id, "service", ["paris-residual-treatment"]);
  }
  add("syctom-transfer-romainville", "Plateforme de transfert de Romainville", "unit", "provider", ["paris-residual-treatment"], "Plateforme de transfert du circuit de traitement ; accès direct des associations non attesté.", { territoryIds: [] });
  link("syctom", "syctom-transfer-romainville", "service", ["paris-residual-treatment"]);
  // Award / operating-contract evidence is attached to the named facility, not to every arrondissement.
  add("operator-trivalo-92", "Trivalo 92 (Paprec Group)", "provider", "provider", ["syctom-nanterre-2026"], "Exploitant de Nanterre selon la prolongation annoncée jusqu'au 30 juin 2028. Aucun contrat pour les cleanwalks.", { territoryIds: [] });
  link("operator-trivalo-92", "syctom-tri-nanterre", "service", ["syctom-nanterre-2026"], { status: "confirmed", validUntil: "2028-06-30" });
  add("operator-asterya", "Asterya", "provider", "provider", ["syctom-semop"], "SEMOP créée pour la gestion de l'Étoile Verte.", { territoryIds: [] });
  add("operator-urbaser", "Urbaser Environnement", "provider", "provider", ["syctom-semop"], "Titulaire annoncé du marché d'exploitation de l'Étoile Verte pour douze ans à partir du 1er janvier 2026. Exécution effective à confirmer.", { territoryIds: [] });
  link("operator-asterya", "syctom-uve-saint-ouen", "service", ["syctom-semop"]);
  link("operator-urbaser", "syctom-uve-saint-ouen", "service", ["syctom-semop"], { status: "confirmed", validFrom: "2026-01-01" });
  add("operator-valoest", "ValoEst (Suez / Chantiers Modernes Construction / Syctom)", "provider", "provider", ["syctom-valoest"], "SEMOP porteuse du contrat global de reconstruction et d'exploitation du site de Romainville/Bobigny ; date de fin et sous-traitants non établis.", { territoryIds: [] });
  link("operator-valoest", "syctom-tri-romainville", "service", ["syctom-valoest"]);
  link("operator-valoest", "syctom-transfer-romainville", "service", ["syctom-valoest"]);
  add("operator-semotris", "SemotriS", "provider", "provider", ["syctom-semop"], "SEMOP de Sevran depuis septembre 2023 selon la source de 2025 ; maintien actuel non reconfirmé.", { territoryIds: [], assignment: "historical" });
  add("operator-generis", "Généris", "provider", "provider", ["syctom-semop"], "Exploitation de Sevran confiée à Généris dans la source de 2025 ; maintien actuel non reconfirmé.", { territoryIds: [], assignment: "historical" });
  link("operator-semotris", "syctom-tri-sevran", "service", ["syctom-semop"], { status: "historical", validFrom: "2023-09-01" });
  link("operator-generis", "syctom-tri-sevran", "service", ["syctom-semop"], { status: "historical" });
  add("asso-megots-alcome", "ALCOME", "provider", "prevention", ["alcome-rep", "alcome-contact"], "Éco-organisme REP tabac : accompagnement de la réduction des mégots abandonnés, notamment auprès des collectivités. Ni collecteur direct ni financement acquis.", { directoryId: "asso-megots-alcome", publicContact: contact("alcome-contact", "Portail ALCOME") });
  add("eco-organisme-citeo", "Citeo", "provider", "prevention", ["citeo-territories"], "Éco-organisme REP emballages ménagers et papiers ; accompagnement des collectivités. Pas un opérateur de collecte de sacs de cleanwalk.", { networkActorId: "eco-organisme-citeo", publicContact: contact("citeo-territories", "Accompagnement des territoires") });
  for (const [id, name, src, desc] of [
    ["asso-megots-cyclope", "Cy-Clope", "cyclope-service", "Collecte sur devis en Île-de-France et valorisation énergétique annoncée par l’opérateur ; pas un recyclage matière."],
    ["asso-megots-ecomegot", "Écomégot", "ecomegot-service", "Offre de collecte et de traitement déclarée par l'opérateur ; desserte précise à confirmer."],
    ["asso-megots-tchaomegot", "TchaoMegot", "tchaomegot-service", "Offre de collecte, dépollution et recyclage déclarée par l'opérateur ; desserte précise à confirmer."],
  ] as const) add(id, name, "provider", "provider", [src], desc + " Acceptation des mégots ramassés au sol, conditionnement, volume, tarif et traçabilité à vérifier avant toute remise.", { directoryId: id, territoryIds: [], publicContact: contact(src, "Offre de service (à confirmer)") });
  add("operator-ckfd", "CKFD", "provider", "provider", ["ckfd-megots-service"], "Collecte et massification annoncées à Gennevilliers ; acheminement vers une filière bretonne. Admission des mégots ramassés au sol et tarif à confirmer.", { networkActorId: "operator-ckfd", territoryIds: [], publicContact: contact("ckfd-megots-service", "Offre de collecte (à confirmer)") });
  add("operator-mego", "MéGO!", "provider", "provider", ["mego-megots-service"], "Filière de recyclage matière annoncée en Bretagne ; ni dépôt public parisien ni preuve de traitement de lot.", { networkActorId: "operator-mego", territoryIds: [], publicContact: contact("mego-megots-service", "Offre de recyclage (à confirmer)") });
  link("operator-ckfd", "operator-mego", "service", ["ckfd-megots-service", "mego-megots-service"]);
  add("operator-carton-plein-cyclo", "Carton Plein Cyclo", "provider", "provider", ["carton-plein-cyclo-service"], "Collecte professionnelle de déchets à vélo cargo ; transport de lots citoyens de mégots, conditions, tarif et destination à confirmer. Aucun point de dépôt ni contrat de transport acquis.", { networkActorId: "operator-carton-plein-cyclo", territoryIds: [], publicContact: contact("carton-plein-cyclo-service", "Offre professionnelle (sur devis)") });
  patch("town-hall-05", { networkActorId: "mairie-paris-5" });
  patch("town-hall-06", { networkActorId: "mairie-paris-6" });
  return { nodes, relations, sources: [...base.sources, ...sources] };
}
