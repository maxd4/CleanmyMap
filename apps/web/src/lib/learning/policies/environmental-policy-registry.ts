import { assertPublishedContent, type ContentValidationRecord } from "@/lib/content/content-validation";

export type LocalizedText = { fr: string; en: string };
export type PolicyView = "world" | "france";
export type PolicyTerritoryScope = "international" | "national" | "regional" | "departmental" | "communal";
export type PolicyLegalStatus = "adopted" | "in_force" | "application_scheduled" | "transposition" | "implementation";
export type PolicyCollection = "international" | "france";
export type PolicyLifecycleStatus = "current" | "modified" | "suspended" | "repealed" | "execution_undocumented";
export type PolicyImplementationStatus = "not_assessed" | "partially_documented" | "documented" | "execution_undocumented";

export type PolicyDate = {
  value: string | null;
  precision: "day" | "month" | "year" | "unknown";
};

export type PolicyTerritory = {
  scope: PolicyTerritoryScope;
  label: LocalizedText;
  countryCode: string | null;
  memberCount: number | null;
  membership: "all_members" | "parties_only" | "national";
};

export type PolicyMilestone = {
  id: string;
  kind: "decision" | "publication" | "entry_into_force" | "application" | "objective" | "administrative_deployment" | "observed_result";
  label: LocalizedText;
  date: PolicyDate;
  note: LocalizedText;
};

export type PolicyOfficialSource = {
  name: LocalizedText;
  url: string;
  consultedAt: string | null;
  date: PolicyDate;
};

export type PolicyVersion = {
  id: string;
  recordedAt: PolicyDate;
  note: LocalizedText;
};

export type EnvironmentalPolicyRecord = {
  id: string;
  collection: PolicyCollection;
  title: LocalizedText;
  summary: LocalizedText;
  institution: LocalizedText;
  themes: LocalizedText[];
  territory: PolicyTerritory;
  territories: PolicyTerritory[];
  measure: LocalizedText;
  milestones: PolicyMilestone[];
  officialSources: PolicyOfficialSource[];
  lastConsultedAt: string | null;
  lastVerifiedAt: string | null;
  limitations: LocalizedText[];
  versions: PolicyVersion[];
  decisionDate: PolicyDate;
  applicationDate: PolicyDate | null;
  legalStatus: PolicyLegalStatus;
  lifecycleStatus: PolicyLifecycleStatus;
  implementationStatus: PolicyImplementationStatus;
  officialSource: { name: LocalizedText; url: string };
  detail: LocalizedText;
  validation: ContentValidationRecord;
};

const CONSULTED_AT = "2026-11-13";

const source = (name: string, url: string, date: string | null, datePrecision: "day" | "month" | "year" | "unknown") => ({
  name,
  url,
  date,
  datePrecision,
  dateBasis: "document" as const,
});

const claim = (id: string, fr: string, en: string) => ({
  id,
  type: "fact" as const,
  text: { fr, en },
});

const reviewPending = (id: string, sourceDetails: ReturnType<typeof source>, claims: ReturnType<typeof claim>[]) => ({
  id,
  kind: "environmental" as const,
  status: "in_review" as const,
  owner: "CleanMyMap — équipe éditoriale",
  source: sourceDetails,
  evidenceLevel: "strong" as const,
  lastReviewedAt: null,
  reviewedBy: null,
  claims: { fact: claims, estimate: [], recommendation: [] },
});

type PolicyInput = Omit<EnvironmentalPolicyRecord, "collection" | "territories" | "measure" | "milestones" | "officialSources" | "lastConsultedAt" | "lastVerifiedAt" | "limitations" | "versions" | "validation" | "territory" | "lifecycleStatus" | "implementationStatus"> & {
  territory: Omit<PolicyTerritory, "memberCount" | "membership"> & Partial<Pick<PolicyTerritory, "memberCount" | "membership">>;
  validation: ContentValidationRecord;
  collection?: PolicyCollection;
  milestoneOverrides?: PolicyMilestone[];
  sourceOverrides?: PolicyOfficialSource[];
  versionOverrides?: PolicyVersion[];
  limitations?: LocalizedText[];
  lifecycleStatus?: PolicyLifecycleStatus;
  implementationStatus?: PolicyImplementationStatus;
};

const territoryFor = (territory: PolicyInput["territory"]): PolicyTerritory => ({
  ...territory,
  memberCount: territory.memberCount ?? (territory.label.fr === "Union européenne" ? 27 : null),
  membership: territory.membership ?? (territory.label.fr === "Union européenne" ? "all_members" : territory.countryCode ? "national" : "parties_only"),
});

const policy = (record: PolicyInput): EnvironmentalPolicyRecord => {
  const { milestoneOverrides, sourceOverrides, versionOverrides, limitations, lifecycleStatus, implementationStatus, ...baseRecord } = record;
  const territory = territoryFor(record.territory);
  const collection = record.collection ?? (territory.countryCode === "FR" ? "france" : "international");
  const decisionMilestone: PolicyMilestone = {
    id: `${record.id}-decision`,
    kind: "decision",
    label: { fr: "Décision ou adoption", en: "Decision or adoption" },
    date: record.decisionDate,
    note: { fr: "Jalon documentaire utilisé pour la chronologie ; il ne remplace pas les autres étapes juridiques.", en: "Documented milestone used for the chronology; it does not replace other legal steps." },
  };
  const milestones = [
    decisionMilestone,
    ...(record.applicationDate ? [{ id: `${record.id}-application`, kind: "application" as const, label: { fr: "Entrée en vigueur ou application", en: "Entry into force or application" }, date: record.applicationDate, note: record.detail }] : []),
    ...(milestoneOverrides ?? []),
  ];
  return {
    ...baseRecord,
    collection,
    lifecycleStatus: lifecycleStatus ?? "current",
    implementationStatus: implementationStatus ?? "execution_undocumented",
    territory,
    territories: [territory],
    measure: record.summary,
    milestones,
    officialSources: [{ name: record.officialSource.name, url: record.officialSource.url, consultedAt: CONSULTED_AT, date: record.decisionDate }, ...(sourceOverrides ?? [])],
    lastConsultedAt: CONSULTED_AT,
    lastVerifiedAt: null,
    limitations: limitations ?? [{ fr: "La fiche résume les jalons principaux ; les obligations par disposition et les transpositions nationales peuvent suivre des calendriers distincts.", en: "This record summarizes the main milestones; provision-level obligations and national transpositions may follow separate schedules." }],
    versions: versionOverrides ?? [{ id: `${record.id}-initial`, recordedAt: record.decisionDate, note: { fr: "Version initiale du texte ou du dispositif telle que documentée dans la fiche.", en: "Initial version of the text or scheme documented in this record." } }],
  };
};

export const ENVIRONMENTAL_POLICY_REGISTRY: EnvironmentalPolicyRecord[] = [
  policy({
    id: "eu-packaging-packaging-waste-regulation",
    title: { fr: "Règlement européen sur les emballages", en: "European Packaging and Packaging Waste Regulation" },
    summary: { fr: "Un règlement européen fixe des mesures de prévention, de réemploi et de circularité pour les emballages.", en: "An EU regulation sets prevention, reuse and circularity measures for packaging." },
    institution: { fr: "Parlement européen et Conseil de l’Union européenne", en: "European Parliament and Council of the European Union" },
    themes: [{ fr: "Déchets et économie circulaire", en: "Waste and circular economy" }],
    territory: { scope: "international", label: { fr: "Union européenne", en: "European Union" }, countryCode: null },
    decisionDate: { value: "2024-12-19", precision: "day" },
    applicationDate: { value: "2026-08-12", precision: "day" },
    milestoneOverrides: [{ id: "eu-packaging-packaging-waste-regulation-2030", kind: "application", label: { fr: "Obligations ultérieures prévues", en: "Later obligations scheduled" }, date: { value: "2030", precision: "year" }, note: { fr: "Certaines interdictions, obligations de contenu recyclé et exigences de recyclabilité sont prévues à partir de 2030 selon les dispositions concernées.", en: "Some bans, recycled-content obligations and recyclability requirements are scheduled from 2030 depending on the provision." } }],
    legalStatus: "application_scheduled",
    officialSource: { name: { fr: "Règlement (UE) 2025/40 — EUR-Lex", en: "Regulation (EU) 2025/40 — EUR-Lex" }, url: "https://eur-lex.europa.eu/eli/reg/2025/40/oj" },
    detail: { fr: "Le texte est entré en vigueur le 11 février 2025 et prévoit une application générale à partir du 12 août 2026. Ces deux dates ne décrivent pas la même étape juridique.", en: "The text entered into force on 11 February 2025 and provides for general application from 12 August 2026. These are distinct legal steps." },
    validation: reviewPending("eu-packaging-packaging-waste-regulation", source("Règlement (UE) 2025/40 — EUR-Lex", "https://eur-lex.europa.eu/eli/reg/2025/40/oj", "2024-12-19", "day"), [claim("adoption", "Le règlement a été adopté le 19 décembre 2024.", "The regulation was adopted on 19 December 2024.")]),
  }),
  policy({
    id: "eu-right-to-repair-directive",
    title: { fr: "Droit européen à la réparation", en: "European Right-to-Repair Directive" },
    summary: { fr: "Une directive renforce les possibilités de réparation de certains biens et demande une transposition nationale.", en: "A directive strengthens repair options for certain goods and requires national transposition." },
    institution: { fr: "Parlement européen et Conseil de l’Union européenne", en: "European Parliament and Council of the European Union" },
    themes: [{ fr: "Ressources et économie circulaire", en: "Resources and circular economy" }],
    territory: { scope: "international", label: { fr: "Union européenne", en: "European Union" }, countryCode: null },
    decisionDate: { value: "2024-05-30", precision: "day" },
    applicationDate: { value: "2026-07-31", precision: "day" },
    milestoneOverrides: [{ id: "eu-right-to-repair-directive-entry", kind: "entry_into_force", label: { fr: "Entrée en vigueur de la directive", en: "Directive entry into force" }, date: { value: "2024-07-30", precision: "day" }, note: { fr: "L’entrée en vigueur de la directive est distincte de la date limite de transposition et d’application nationale.", en: "The directive's entry into force is distinct from the national transposition and application deadline." } }],
    legalStatus: "transposition",
    officialSource: { name: { fr: "Directive (UE) 2024/1799 — EUR-Lex", en: "Directive (EU) 2024/1799 — EUR-Lex" }, url: "https://eur-lex.europa.eu/eli/dir/2024/1799/oj" },
    detail: { fr: "Le Conseil a donné son approbation finale le 30 mai 2024. La directive est entrée en vigueur le 30 juillet 2024 ; les États membres doivent la transposer et l’appliquer à partir du 31 juillet 2026.", en: "The Council gave final approval on 30 May 2024. The directive entered into force on 30 July 2024; Member States must transpose and apply it from 31 July 2026." },
    validation: reviewPending("eu-right-to-repair-directive", source("Directive (UE) 2024/1799 — EUR-Lex", "https://eur-lex.europa.eu/eli/dir/2024/1799/oj", "2024-05-30", "day"), [claim("adoption", "L’approbation finale du Conseil date du 30 mai 2024.", "The Council's final approval dates from 30 May 2024.")]),
  }),
  policy({
    id: "un-bbnj-agreement",
    title: { fr: "Accord BBNJ sur la haute mer", en: "BBNJ Agreement on the High Seas" },
    summary: { fr: "Un accord international encadre la conservation et l’utilisation durable de la biodiversité marine au-delà des juridictions nationales.", en: "An international agreement governs conservation and sustainable use of marine biodiversity beyond national jurisdiction." },
    institution: { fr: "Conférence intergouvernementale sous l’égide des Nations unies", en: "Intergovernmental Conference under the auspices of the United Nations" },
    themes: [{ fr: "Océans et biodiversité", en: "Oceans and biodiversity" }],
    decisionDate: { value: "2023-06-19", precision: "day" },
    applicationDate: { value: "2026-01-17", precision: "day" },
    milestoneOverrides: [{ id: "un-bbnj-agreement-entry", kind: "entry_into_force", label: { fr: "Entrée en vigueur", en: "Entry into force" }, date: { value: "2026-01-17", precision: "day" }, note: { fr: "La vue BBNJ couvre uniquement les États parties, pas les signataires qui ne sont pas parties.", en: "The BBNJ view covers States parties only, not signatories that are not parties." } }],
    legalStatus: "in_force",
    territory: { scope: "international", label: { fr: "États parties au BBNJ", en: "BBNJ States parties" }, countryCode: null, membership: "parties_only" },
    officialSource: { name: { fr: "Nations unies — Recueil des traités, BBNJ", en: "United Nations Treaty Collection — BBNJ" }, url: "https://treaties.un.org/Pages/ViewDetails.aspx?chapter=21&clang=_fr&mtdsg_no=XXI-10&src=TREATY" },
    detail: { fr: "L’accord a été adopté le 19 juin 2023 et est entré en vigueur le 17 janvier 2026, après le dépôt du nombre requis d’instruments.", en: "The agreement was adopted on 19 June 2023 and entered into force on 17 January 2026 after the required instruments were deposited." },
    validation: reviewPending("un-bbnj-agreement", source("Nations unies — Recueil des traités, BBNJ", "https://treaties.un.org/Pages/ViewDetails.aspx?chapter=21&clang=_fr&mtdsg_no=XXI-10&src=TREATY", "2023-06-19", "day"), [claim("adoption", "L’accord a été adopté le 19 juin 2023.", "The agreement was adopted on 19 June 2023.")]),
  }),
  policy({
    id: "eu-carbon-border-adjustment-mechanism",
    title: { fr: "Mécanisme carbone aux frontières de l’Union européenne", en: "European Union Carbon Border Adjustment Mechanism" },
    summary: { fr: "Le mécanisme introduit une tarification carbone liée aux émissions incorporées de certaines importations.", en: "The mechanism introduces carbon pricing linked to embedded emissions in selected imports." },
    institution: { fr: "Union européenne", en: "European Union" },
    themes: [{ fr: "Climat et industrie", en: "Climate and industry" }],
    territory: { scope: "international", label: { fr: "Union européenne et importations concernées", en: "European Union and covered imports" }, countryCode: null },
    decisionDate: { value: "2023", precision: "year" },
    applicationDate: { value: "2026-01-01", precision: "day" },
    legalStatus: "in_force",
    officialSource: { name: { fr: "Conseil de l’Union européenne — CBAM", en: "Council of the European Union — CBAM" }, url: "https://www.consilium.europa.eu/fr/policies/carbon-border-adjustment-mechanism/" },
    detail: { fr: "Une période transitoire a couru de 2023 à 2025 ; le régime définitif s’applique depuis le 1er janvier 2026. La date de décision est conservée avec une précision annuelle dans ce registre.", en: "A transitional period ran from 2023 to 2025; the definitive regime applies from 1 January 2026. The decision date is kept at year precision in this registry." },
    validation: reviewPending("eu-carbon-border-adjustment-mechanism", source("Conseil de l’Union européenne — CBAM", "https://www.consilium.europa.eu/fr/policies/carbon-border-adjustment-mechanism/", "2023", "year"), [claim("regime", "Le régime définitif du CBAM s’applique depuis le 1er janvier 2026.", "The definitive CBAM regime applies from 1 January 2026.")]),
  }),
  policy({
    id: "uk-single-use-vapes-ban",
    title: { fr: "Interdiction britannique des cigarettes électroniques jetables", en: "UK Single-use Vape Ban" },
    summary: { fr: "La vente et la fourniture de cigarettes électroniques à usage unique sont interdites au Royaume-Uni.", en: "The sale and supply of single-use vapes are banned across the United Kingdom." },
    institution: { fr: "Gouvernement du Royaume-Uni", en: "UK Government" },
    themes: [{ fr: "Déchets et pollution", en: "Waste and pollution" }],
    territory: { scope: "international", label: { fr: "Royaume-Uni", en: "United Kingdom" }, countryCode: "GB" },
    decisionDate: { value: "2024-11-25", precision: "day" },
    applicationDate: { value: "2025-06-01", precision: "day" },
    legalStatus: "in_force",
    officialSource: { name: { fr: "GOV.UK — interdiction des vapes à usage unique", en: "GOV.UK — single-use vapes ban" }, url: "https://www.gov.uk/guidance/single-use-vapes-ban" },
    detail: { fr: "Les règlements ont été pris le 25 novembre 2024 et sont entrés en vigueur le 1er juin 2025. Ils s’appliquent aux entreprises et organisations qui vendent ou fournissent ces produits.", en: "The regulations were made on 25 November 2024 and came into force on 1 June 2025. They apply to businesses and organizations selling or supplying these products." },
    validation: reviewPending("uk-single-use-vapes-ban", source("GOV.UK — single-use vapes ban", "https://www.gov.uk/guidance/single-use-vapes-ban", "2024-11-25", "day"), [claim("commencement", "Les règlements sont entrés en vigueur le 1er juin 2025.", "The regulations came into force on 1 June 2025.")]),
  }),
  policy({
    id: "china-national-carbon-market-expansion",
    title: { fr: "Extension du marché carbone national chinois", en: "Expansion of China's National Carbon Market" },
    summary: { fr: "Le marché national chinois a étendu son périmètre à l’acier, au ciment et à l’aluminium primaire.", en: "China's national market expanded its coverage to steel, cement and primary aluminum." },
    institution: { fr: "Conseil des affaires d’État et ministère chinois de l’Écologie et de l’Environnement", en: "State Council and China's Ministry of Ecology and Environment" },
    themes: [{ fr: "Climat et industrie", en: "Climate and industry" }],
    territory: { scope: "national", label: { fr: "Chine", en: "China" }, countryCode: "CN" },
    decisionDate: { value: "2025-03-20", precision: "day" },
    applicationDate: null,
    legalStatus: "implementation",
    officialSource: { name: { fr: "Ministère chinois — avis du 26 mars 2025", en: "China MEE — 26 March 2025 notice" }, url: "https://www.mee.gov.cn/xxgk2018/xxgk/xxgk03/202503/t20250326_1104736.html" },
    detail: { fr: "Le rapport officiel indique qu’en mars 2025 le Conseil des affaires d’État a approuvé l’inclusion de l’acier, du ciment et de l’aluminium primaire. La mise en œuvre sectorielle est décrite séparément de la décision d’extension.", en: "The official report says that in March 2025 the State Council approved including steel, cement and primary aluminum. Sector implementation is described separately from the expansion decision." },
    validation: reviewPending("china-national-carbon-market-expansion", source("Ministère chinois — avis du 26 mars 2025", "https://www.mee.gov.cn/xxgk2018/xxgk/xxgk03/202503/t20250326_1104736.html", "2025-03-20", "day"), [claim("expansion", "L’extension décidée le 20 mars 2025 concerne l’acier, le ciment et l’aluminium primaire.", "The expansion decided on 20 March 2025 covers steel, cement and primary aluminum.")]),
  }),
  policy({
    id: "australia-new-vehicle-efficiency-standard",
    title: { fr: "Norme australienne sur l’efficacité des véhicules neufs", en: "Australian New Vehicle Efficiency Standard" },
    summary: { fr: "Une norme nationale encadre progressivement l’efficacité moyenne des véhicules neufs vendus en Australie.", en: "A national standard progressively regulates the average efficiency of new vehicles sold in Australia." },
    institution: { fr: "Gouvernement australien", en: "Australian Government" },
    themes: [{ fr: "Mobilité et climat", en: "Mobility and climate" }],
    territory: { scope: "national", label: { fr: "Australie", en: "Australia" }, countryCode: "AU" },
    decisionDate: { value: "2024", precision: "year" },
    applicationDate: { value: "2025-01-01", precision: "day" },
    milestoneOverrides: [{ id: "australia-new-vehicle-efficiency-standard-compliance", kind: "application", label: { fr: "Début de la conformité", en: "Compliance begins" }, date: { value: "2025-07-01", precision: "day" }, note: { fr: "La date de commencement du standard et le début de la conformité sont deux jalons distincts.", en: "The standard's commencement and the start of compliance are distinct milestones." } }],
    legalStatus: "in_force",
    officialSource: { name: { fr: "Infrastructure Australia — FAQ NVES", en: "Australian Infrastructure — NVES FAQ" }, url: "https://www.infrastructure.gov.au/infrastructure-transport-vehicles/vehicles/new-vehicle-efficiency-standard/australias-new-vehicle-efficiency-standard-frequently-asked-questions" },
    detail: { fr: "Le standard a commencé le 1er janvier 2025 et la conformité a commencé le 1er juillet 2025. Le registre conserve ces étapes distinctement.", en: "The standard commenced on 1 January 2025 and compliance began on 1 July 2025. The registry keeps these steps distinct." },
    validation: reviewPending("australia-new-vehicle-efficiency-standard", source("Infrastructure Australia — FAQ NVES", "https://www.infrastructure.gov.au/infrastructure-transport-vehicles/vehicles/new-vehicle-efficiency-standard/australias-new-vehicle-efficiency-standard-frequently-asked-questions", "2024", "year"), [claim("commencement", "Le standard a commencé le 1er janvier 2025.", "The standard commenced on 1 January 2025.")]),
  }),
  policy({
    id: "brazil-regulated-carbon-market",
    title: { fr: "Marché carbone brésilien", en: "Brazilian Regulated Carbon Market" },
    summary: { fr: "Une loi institue le système brésilien de commerce des émissions et son cadre de gouvernance.", en: "A law establishes Brazil's emissions trading system and its governance framework." },
    institution: { fr: "Congrès national et gouvernement du Brésil", en: "Brazilian National Congress and Government" },
    themes: [{ fr: "Climat et industrie", en: "Climate and industry" }],
    territory: { scope: "national", label: { fr: "Brésil", en: "Brazil" }, countryCode: "BR" },
    decisionDate: { value: "2024-12-11", precision: "day" },
    applicationDate: null,
    legalStatus: "implementation",
    officialSource: { name: { fr: "Sénat brésilien — loi n° 15.042/2024", en: "Brazilian Senate — Law No. 15,042/2024" }, url: "https://legis.senado.gov.br/norma/39923461/publicacao/39925974" },
    detail: { fr: "La loi n° 15.042 du 11 décembre 2024 institue le SBCE. Le ministère précise que sa mise en œuvre est progressive et que le système n’est pas encore totalement opérationnel.", en: "Law No. 15,042 of 11 December 2024 establishes the SBCE. The ministry says implementation is gradual and the system is not yet fully operational." },
    validation: reviewPending("brazil-regulated-carbon-market", source("Sénat brésilien — loi n° 15.042/2024", "https://legis.senado.gov.br/norma/39923461/publicacao/39925974", "2024-12-11", "day"), [claim("law", "La loi n° 15.042 du 11 décembre 2024 institue le SBCE.", "Law No. 15,042 of 11 December 2024 establishes the SBCE.")]),
  }),
  policy({
    id: "india-pm-e-drive",
    title: { fr: "Programme indien PM E-DRIVE", en: "India's PM E-DRIVE Scheme" },
    summary: { fr: "Un programme indien soutient l’adoption de véhicules électriques, les infrastructures de recharge et l’écosystème industriel.", en: "An Indian scheme supports electric vehicles, charging infrastructure and the industrial ecosystem." },
    institution: { fr: "Ministère indien des Industries lourdes", en: "India's Ministry of Heavy Industries" },
    themes: [{ fr: "Mobilité et qualité de l’air", en: "Mobility and air quality" }],
    territory: { scope: "national", label: { fr: "Inde", en: "India" }, countryCode: "IN" },
    decisionDate: { value: "2024-09-29", precision: "day" },
    applicationDate: { value: "2024-10-01", precision: "day" },
    legalStatus: "implementation",
    officialSource: { name: { fr: "Portail officiel PM E-DRIVE", en: "Official PM E-DRIVE portal" }, url: "https://pmedrive.heavyindustries.gov.in/" },
    detail: { fr: "La notification du 29 septembre 2024 prévoyait une mise en œuvre à partir du 1er octobre 2024. Le portail officiel indique des extensions ultérieures : le calendrier doit donc rester distingué de la décision initiale.", en: "The 29 September 2024 notification provided for implementation from 1 October 2024. The official portal indicates later extensions, so the initial decision must remain distinct from the current schedule." },
    validation: reviewPending("india-pm-e-drive", source("Portail officiel PM E-DRIVE", "https://pmedrive.heavyindustries.gov.in/", "2024-09-29", "day"), [claim("launch", "Le programme a été notifié le 29 septembre 2024.", "The scheme was notified on 29 September 2024.")]),
  }),
  policy({
    id: "eu-nature-restoration-regulation",
    title: { fr: "Règlement européen sur la restauration de la nature", en: "European Nature Restoration Regulation" },
    summary: { fr: "Le règlement fixe des objectifs contraignants de restauration des écosystèmes dégradés dans l’Union européenne.", en: "The regulation sets binding targets to restore degraded ecosystems across the European Union." },
    institution: { fr: "Parlement européen et Conseil de l’Union européenne", en: "European Parliament and Council of the European Union" },
    themes: [{ fr: "Biodiversité et adaptation", en: "Biodiversity and adaptation" }],
    territory: { scope: "international", label: { fr: "Union européenne", en: "European Union" }, countryCode: null },
    decisionDate: { value: "2024-06-24", precision: "day" },
    applicationDate: { value: "2024-08-18", precision: "day" },
    milestoneOverrides: [{ id: "eu-nature-restoration-regulation-2030", kind: "application", label: { fr: "Objectif 2030", en: "2030 target" }, date: { value: "2030", precision: "year" }, note: { fr: "Le règlement fixe notamment un objectif de restauration couvrant au moins 20 % des terres et des mers de l’Union d’ici 2030.", en: "The regulation includes a target to cover at least 20% of the Union's land and sea areas with restoration measures by 2030." } }],
    legalStatus: "in_force",
    officialSource: { name: { fr: "Commission européenne — règlement restauration de la nature", en: "European Commission — Nature Restoration Regulation" }, url: "https://environment.ec.europa.eu/topics/nature-and-biodiversity/nature-restoration-regulation_en" },
    detail: { fr: "Le règlement est entré en vigueur le 18 août 2024. L’entrée en vigueur ne constitue pas à elle seule la preuve de résultats de restauration déjà mesurés.", en: "The regulation entered into force on 18 August 2024. Entry into force alone is not evidence of restoration results already measured." },
    validation: reviewPending("eu-nature-restoration-regulation", source("Commission européenne — règlement restauration de la nature", "https://environment.ec.europa.eu/topics/nature-and-biodiversity/nature-restoration-regulation_en", "2024-06-24", "day"), [claim("entry", "Le règlement est entré en vigueur le 18 août 2024.", "The regulation entered into force on 18 August 2024.")]),
  }),
  policy({
    id: "fr-agec-law",
    title: { fr: "Loi AGEC", en: "French AGEC Law" },
    summary: { fr: "La loi française relative à la lutte contre le gaspillage et à l’économie circulaire structure des obligations de prévention, d’information et de responsabilité des producteurs.", en: "France's anti-waste and circular economy law structures prevention, information and producer responsibility obligations." },
    institution: { fr: "Parlement français", en: "French Parliament" },
    themes: [{ fr: "Déchets et économie circulaire", en: "Waste and circular economy" }],
    territory: { scope: "national", label: { fr: "France entière", en: "All of France" }, countryCode: "FR" },
    decisionDate: { value: "2020-02-10", precision: "day" },
    applicationDate: null,
    legalStatus: "in_force",
    lifecycleStatus: "modified",
    implementationStatus: "partially_documented",
    milestoneOverrides: [{ id: "fr-agec-law-publication", kind: "publication", label: { fr: "Publication au Journal officiel", en: "Publication in the Official Journal" }, date: { value: "2020-02-11", precision: "day" }, note: { fr: "La publication est distincte de la promulgation du 10 février 2020.", en: "Publication is distinct from promulgation on 10 February 2020." } }, { id: "fr-agec-law-deployment", kind: "administrative_deployment", label: { fr: "Déploiement par disposition", en: "Provision-level deployment" }, date: { value: null, precision: "unknown" }, note: { fr: "Les mesures ont des calendriers et textes d’application distincts ; aucun déploiement global n’est déduit ici.", en: "Measures have separate schedules and implementing texts; no global deployment is inferred here." } }],
    limitations: [{ fr: "Les obligations, décrets et calendriers d’application varient selon les dispositions. La fiche ne présente aucun résultat environnemental mesuré comme acquis.", en: "Obligations, decrees and application schedules vary by provision. This record presents no environmental result as established." }],
    versionOverrides: [{ id: "fr-agec-law-original", recordedAt: { value: "2020-02-10", precision: "day" }, note: { fr: "Version initiale de la loi n° 2020-105.", en: "Initial version of Law No. 2020-105." } }, { id: "fr-agec-law-current-consultation", recordedAt: { value: "2026-11-13", precision: "day" }, note: { fr: "Version en vigueur consultée sur Légifrance ; cette date est une consultation, pas une date d’amendement.", en: "Version in force consulted on Légifrance; this is a consultation date, not an amendment date." } }],
    officialSource: { name: { fr: "Légifrance — loi n° 2020-105", en: "Légifrance — Law No. 2020-105" }, url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000041553759/" },
    detail: { fr: "La loi est en vigueur avec des dispositions et calendriers d’application différenciés. Le registre ne réduit pas ces échéanciers à une date unique.", en: "The law is in force with differentiated provisions and implementation schedules. The registry does not reduce these schedules to a single date." },
    validation: reviewPending("fr-agec-law", source("Légifrance", "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000041553759/", "2020-02-10", "day"), [claim("promulgation", "La loi a été promulguée le 10 février 2020.", "The law was enacted on 10 February 2020.")]),
  }),
  policy({
    id: "fr-biodechets-source-separation",
    title: { fr: "Généralisation du tri à la source des biodéchets", en: "Nationwide Source Separation of Biowaste" },
    summary: { fr: "Depuis le 1er janvier 2024, tous les producteurs de biodéchets sont concernés par le tri à la source ; les solutions concrètes relèvent notamment des collectivités compétentes.", en: "Since 1 January 2024, all biowaste producers are covered by source separation; concrete solutions are notably organized by competent local authorities." },
    institution: { fr: "État et collectivités compétentes en matière de déchets", en: "The State and local authorities competent for waste management" },
    themes: [{ fr: "Déchets et économie circulaire", en: "Waste and circular economy" }],
    territory: { scope: "national", label: { fr: "France entière", en: "All of France" }, countryCode: "FR" },
    decisionDate: { value: null, precision: "unknown" },
    applicationDate: { value: "2024-01-01", precision: "day" },
    legalStatus: "in_force",
    lifecycleStatus: "current",
    implementationStatus: "partially_documented",
    milestoneOverrides: [{ id: "fr-biodechets-source-separation-objective", kind: "objective", label: { fr: "Objectif de solution pour chaque citoyen", en: "Objective of a solution for every citizen" }, date: { value: "2024-01-01", precision: "day" }, note: { fr: "L’objectif concerne la mise à disposition d’une solution de tri à la source ; il ne prouve pas qu’un service identique est disponible dans chaque commune.", en: "The objective concerns making a source-separation solution available; it does not prove that an identical service is available in every municipality." } }, { id: "fr-biodechets-source-separation-deployment", kind: "administrative_deployment", label: { fr: "Déploiement local", en: "Local deployment" }, date: { value: null, precision: "unknown" }, note: { fr: "La collectivité compétente organise la solution selon son territoire ; la disponibilité effective locale n’est pas documentée par cette fiche.", en: "The competent local authority organizes the solution for its territory; effective local availability is not documented by this record." } }],
    limitations: [{ fr: "L’obligation juridique et l’objectif de service ne valent pas preuve d’une collecte ou d’un compostage effectivement disponible dans chaque commune. Aucun résultat de valorisation n’est mesuré ici.", en: "The legal obligation and service objective do not prove that collection or composting is available in every municipality. No recovery result is measured here." }],
    versionOverrides: [{ id: "fr-biodechets-source-separation-current", recordedAt: { value: "2026-09-15", precision: "day" }, note: { fr: "Page ministérielle mise à jour le 15 septembre 2026, utilisée pour le suivi éditorial ; ce n’est pas une date d’entrée en vigueur.", en: "Ministry page updated on 15 September 2026, used for editorial tracking; this is not an effective date." } }],
    officialSource: { name: { fr: "Ministère de la Transition écologique — biodéchets", en: "Ministry for Ecological Transition — biowaste" }, url: "https://www.ecologie.gouv.fr/politiques-publiques/biodechets" },
    detail: { fr: "Depuis le 1er janvier 2024, le tri à la source est généralisé pour tous les producteurs de biodéchets. Les collectivités doivent proposer des solutions adaptées, sans que cette fiche ne conclue à leur disponibilité effective commune par commune.", en: "Since 1 January 2024, source separation has been generalized for all biowaste producers. Local authorities must offer suitable solutions, without this record concluding that they are effectively available in every municipality." },
    validation: reviewPending("fr-biodechets-source-separation", source("Ministère de la Transition écologique — biodéchets", "https://www.ecologie.gouv.fr/politiques-publiques/biodechets", null, "unknown"), [claim("obligation", "Depuis le 1er janvier 2024, le tri à la source des biodéchets est généralisé pour tous les producteurs.", "Since 1 January 2024, source separation of biowaste has been generalized for all producers.")]),
  }),
  policy({
    id: "fr-climate-resilience-law",
    title: { fr: "Loi Climat et Résilience", en: "French Climate and Resilience Law" },
    summary: { fr: "La loi française rassemble des mesures relatives à la consommation, la production, les mobilités, le logement, l’adaptation et la protection des écosystèmes.", en: "France's law covers consumption, production, mobility, housing, adaptation and ecosystem protection." },
    institution: { fr: "Parlement français", en: "French Parliament" },
    themes: [{ fr: "Climat et adaptation", en: "Climate and adaptation" }],
    territory: { scope: "national", label: { fr: "France entière", en: "All of France" }, countryCode: "FR" },
    decisionDate: { value: "2021-08-22", precision: "day" },
    applicationDate: null,
    legalStatus: "in_force",
    lifecycleStatus: "modified",
    implementationStatus: "partially_documented",
    milestoneOverrides: [{ id: "fr-climate-resilience-law-publication", kind: "publication", label: { fr: "Publication au Journal officiel", en: "Publication in the Official Journal" }, date: { value: "2021-08-24", precision: "day" }, note: { fr: "La publication du 24 août 2021 est distincte de la promulgation du 22 août 2021.", en: "Publication on 24 August 2021 is distinct from promulgation on 22 August 2021." } }, { id: "fr-climate-resilience-law-g-rental", kind: "application", label: { fr: "Décence énergétique — logements classés G", en: "Energy decency — G-rated homes" }, date: { value: "2025-01-01", precision: "day" }, note: { fr: "Concerne les contrats de location signés, renouvelés ou reconduits tacitement selon les conditions applicables ; la métropole et les collectivités d’outre-mer ont des calendriers distincts.", en: "Applies to leases signed, renewed or tacitly extended under the applicable conditions; metropolitan France and overseas territories have different schedules." } }, { id: "fr-climate-resilience-law-f-rental", kind: "application", label: { fr: "Décence énergétique — logements classés F", en: "Energy decency — F-rated homes" }, date: { value: "2028-01-01", precision: "day" }, note: { fr: "Échéance annoncée pour la métropole selon les conditions de décence et de location applicables.", en: "Scheduled for metropolitan France under the applicable rental and decency conditions." } }, { id: "fr-climate-resilience-law-e-rental", kind: "application", label: { fr: "Décence énergétique — logements classés E", en: "Energy decency — E-rated homes" }, date: { value: "2034-01-01", precision: "day" }, note: { fr: "Échéance annoncée pour la métropole selon les conditions applicables.", en: "Scheduled for metropolitan France under the applicable conditions." } }],
    limitations: [{ fr: "Les échéances DPE concernent ici l’exemple de décence énergétique et ses conditions de location ; elles ne constituent ni un calendrier unique de toute la loi ni un résultat de rénovation observé. Les outre-mer ont des échéances distinctes.", en: "The EPC dates are shown here as an example of energy decency and rental conditions; they are neither a single timetable for the whole law nor an observed renovation result. Overseas territories have separate dates." }],
    sourceOverrides: [{ name: { fr: "Service-Public.fr — logements classés G, F et E", en: "Service-Public.fr — G, F and E-rated homes" }, url: "https://www.service-public.gouv.fr/particuliers/actualites/A17975", consultedAt: "2026-11-13", date: { value: "2025-01-03", precision: "day" } }],
    versionOverrides: [{ id: "fr-climate-resilience-law-original", recordedAt: { value: "2021-08-22", precision: "day" }, note: { fr: "Version initiale de la loi n° 2021-1104.", en: "Initial version of Law No. 2021-1104." } }, { id: "fr-climate-resilience-law-current-consultation", recordedAt: { value: "2026-11-13", precision: "day" }, note: { fr: "Version et échéances vérifiées dans les sources officielles consultées ; les modifications ultérieures doivent être réexaminées avant publication.", en: "Version and dates checked against consulted official sources; later amendments must be rechecked before publication." } }],
    officialSource: { name: { fr: "Légifrance — loi n° 2021-1104", en: "Légifrance — Law No. 2021-1104" }, url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000043956924" },
    detail: { fr: "Le texte a été promulgué le 22 août 2021 et comporte de nombreux calendriers d’application. Les dispositions territoriales ne sont pas présentées comme une rubrique parisienne autonome.", en: "The text was enacted on 22 August 2021 and contains many implementation schedules. Territorial provisions are not presented as a separate Paris section." },
    validation: reviewPending("fr-climate-resilience-law", source("Légifrance", "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000043956924", "2021-08-22", "day"), [claim("promulgation", "La loi a été promulguée le 22 août 2021.", "The law was enacted on 22 August 2021.")]),
  }),
  policy({
    id: "fr-renewable-energy-acceleration-law",
    title: { fr: "Loi d’accélération des énergies renouvelables", en: "Renewable Energy Acceleration Law" },
    summary: { fr: "La loi organise la planification du développement des énergies renouvelables, les zones d’accélération et l’adaptation de certaines procédures.", en: "The law organizes renewable-energy planning, acceleration zones and adaptations to certain procedures." },
    institution: { fr: "Parlement français et autorités publiques compétentes", en: "French Parliament and competent public authorities" },
    themes: [{ fr: "Énergie et aménagement", en: "Energy and planning" }],
    territory: { scope: "national", label: { fr: "France entière", en: "All of France" }, countryCode: "FR" },
    decisionDate: { value: "2023-03-10", precision: "day" },
    applicationDate: null,
    legalStatus: "implementation",
    lifecycleStatus: "modified",
    implementationStatus: "execution_undocumented",
    milestoneOverrides: [{ id: "fr-renewable-energy-acceleration-law-publication", kind: "publication", label: { fr: "Publication", en: "Publication" }, date: { value: null, precision: "unknown" }, note: { fr: "La date de publication n’est pas retenue ici sans preuve primaire suffisamment précise dans la fiche ; elle reste inconnue.", en: "The publication date is not retained here without sufficiently precise primary evidence in the record; it remains unknown." } }, { id: "fr-renewable-energy-acceleration-law-deployment", kind: "administrative_deployment", label: { fr: "Procédures territoriales et textes d’exécution", en: "Territorial procedures and implementing texts" }, date: { value: null, precision: "unknown" }, note: { fr: "Une zone d’accélération identifiée n’est ni une installation construite ni une production énergétique mesurée.", en: "An identified acceleration zone is neither a built installation nor measured energy production." } }],
    limitations: [{ fr: "La loi prévoit des mécanismes de planification et de procédure ; cette fiche n’attribue aucune réduction d’émissions, installation construite ou production énergétique à la loi sans données indépendantes.", en: "The law provides planning and procedural mechanisms; this record attributes no emissions reduction, built installation or energy production to the law without independent data." }],
    versionOverrides: [{ id: "fr-renewable-energy-acceleration-law-original", recordedAt: { value: "2023-03-10", precision: "day" }, note: { fr: "Version initiale de la loi n° 2023-175.", en: "Initial version of Law No. 2023-175." } }, { id: "fr-renewable-energy-acceleration-law-current-consultation", recordedAt: { value: "2026-01-16", precision: "day" }, note: { fr: "Dernière modification affichée par le dossier législatif consulté ; les dispositions d’exécution restent à vérifier avant publication.", en: "Last modification displayed by the consulted legislative record; implementing provisions remain to be checked before publication." } }],
    officialSource: { name: { fr: "Légifrance — loi n° 2023-175", en: "Légifrance — Law No. 2023-175" }, url: "https://www.legifrance.gouv.fr/loda/id/LEGIARTI000047296655/" },
    detail: { fr: "La loi du 10 mars 2023 organise notamment les zones d’accélération et l’adaptation des procédures. Son application passe par des procédures territoriales et des textes d’exécution ; aucun résultat énergétique n’est déduit.", en: "The law of 10 March 2023 notably organizes acceleration zones and procedural adaptations. Its application relies on territorial procedures and implementing texts; no energy result is inferred." },
    validation: reviewPending("fr-renewable-energy-acceleration-law", source("Légifrance — loi n° 2023-175", "https://www.legifrance.gouv.fr/loda/id/LEGIARTI000047296655/", "2023-03-10", "day"), [claim("law", "La loi n° 2023-175 du 10 mars 2023 organise l’accélération de la production d’énergies renouvelables.", "Law No. 2023-175 of 10 March 2023 organizes the acceleration of renewable energy production.")]),
  }),
  policy({
    id: "fr-green-industry-law",
    title: { fr: "Loi Industrie verte", en: "French Green Industry Law" },
    summary: { fr: "La loi française vise notamment à accélérer les implantations industrielles, réhabiliter les friches et intégrer des critères environnementaux dans l’action publique.", en: "France's law aims to accelerate industrial projects, rehabilitate brownfields and integrate environmental criteria into public action." },
    institution: { fr: "Parlement français", en: "French Parliament" },
    themes: [{ fr: "Industrie et ressources", en: "Industry and resources" }],
    territory: { scope: "national", label: { fr: "France entière", en: "All of France" }, countryCode: "FR" },
    decisionDate: { value: "2023-10-23", precision: "day" },
    applicationDate: null,
    legalStatus: "in_force",
    lifecycleStatus: "modified",
    implementationStatus: "execution_undocumented",
    milestoneOverrides: [{ id: "fr-green-industry-law-publication", kind: "publication", label: { fr: "Publication au Journal officiel", en: "Publication in the Official Journal" }, date: { value: "2023-10-24", precision: "day" }, note: { fr: "La publication du 24 octobre 2023 est distincte de la promulgation du 23 octobre 2023.", en: "Publication on 24 October 2023 is distinct from promulgation on 23 October 2023." } }, { id: "fr-green-industry-law-deployment", kind: "administrative_deployment", label: { fr: "Décrets et procédures d’application", en: "Implementing decrees and procedures" }, date: { value: null, precision: "unknown" }, note: { fr: "L’application dépend des dispositions et de leurs textes d’exécution ; aucun résultat industriel ou climatique n’est mesuré dans la fiche.", en: "Application depends on provisions and their implementing texts; no industrial or climate result is measured in this record." } }],
    limitations: [{ fr: "La loi et ses textes d’exécution ne constituent pas une mesure d’émissions évitées. Aucun résultat environnemental n’est attribué automatiquement au dispositif.", en: "The law and its implementing texts are not a measure of avoided emissions. No environmental result is automatically attributed to the scheme." }],
    versionOverrides: [{ id: "fr-green-industry-law-original", recordedAt: { value: "2023-10-23", precision: "day" }, note: { fr: "Version initiale de la loi n° 2023-973.", en: "Initial version of Law No. 2023-973." } }, { id: "fr-green-industry-law-current-consultation", recordedAt: { value: "2026-11-13", precision: "day" }, note: { fr: "Version en vigueur consultée sur Légifrance ; la fiche ne déduit pas la totalité de l’exécution réglementaire.", en: "Version in force consulted on Légifrance; the record does not infer complete regulatory implementation." } }],
    officialSource: { name: { fr: "Légifrance — loi n° 2023-973", en: "Légifrance — Law No. 2023-973" }, url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000048242288" },
    detail: { fr: "La loi a été promulguée le 23 octobre 2023. Certaines mesures renvoient à des décrets et à des calendriers propres à chaque procédure.", en: "The law was enacted on 23 October 2023. Some measures refer to decrees and schedules specific to each procedure." },
    validation: reviewPending("fr-green-industry-law", source("Légifrance", "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000048242288", "2023-10-23", "day"), [claim("promulgation", "La loi a été promulguée le 23 octobre 2023.", "The law was enacted on 23 October 2023.")]),
  }),
];

const primaryMilestone = (record: EnvironmentalPolicyRecord): PolicyMilestone => record.milestones.find((milestone) => milestone.kind === "decision" && milestone.date.value) ?? record.milestones.find((milestone) => milestone.date.value) ?? record.milestones[0];

const dateValue = (date: PolicyDate): string => date.value ?? "";

export function getPublishedEnvironmentalPolicies(registry = ENVIRONMENTAL_POLICY_REGISTRY): EnvironmentalPolicyRecord[] {
  return registry.filter((record) => {
    try {
      assertPublishedContent(record.validation);
      return true;
    } catch {
      return false;
    }
  });
}

export function getInternationalEnvironmentalPolicies(registry = ENVIRONMENTAL_POLICY_REGISTRY): EnvironmentalPolicyRecord[] {
  return registry.filter((record) => record.collection === "international");
}

export type EnvironmentalPolicyFilters = {
  view: PolicyView;
  query: string;
  territory: PolicyTerritoryScope | "all";
  theme: string;
  year: string;
  legalStatus: PolicyLegalStatus | "all";
};

export function filterEnvironmentalPolicies(records: EnvironmentalPolicyRecord[], filters: EnvironmentalPolicyFilters): EnvironmentalPolicyRecord[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return [...records]
    .filter((record) => filters.view === "world" ? record.collection === "international" : record.collection === "france")
    .filter((record) => filters.territory === "all" || record.territory.scope === filters.territory)
    .filter((record) => filters.theme === "all" || record.themes.some((theme) => theme.fr === filters.theme || theme.en === filters.theme))
    .filter((record) => filters.year === "all" || primaryMilestone(record).date.value?.startsWith(filters.year))
    .filter((record) => filters.legalStatus === "all" || record.legalStatus === filters.legalStatus)
    .filter((record) => !query || [record.title.fr, record.title.en, record.measure.fr, record.measure.en, record.institution.fr, record.institution.en, ...record.territories.flatMap((territory) => [territory.label.fr, territory.label.en])].join(" ").toLocaleLowerCase().includes(query))
    .sort((a, b) => dateValue(primaryMilestone(b).date).localeCompare(dateValue(primaryMilestone(a).date)));
}

export function formatPolicyDate(date: PolicyDate | null, locale: "fr" | "en"): string {
  if (!date || !date.value || date.precision === "unknown") return locale === "fr" ? "Non précisée" : "Not specified";
  if (date.precision === "year") return date.value;
  if (date.precision === "month") {
    const [year, month] = date.value.split("-").map(Number);
    return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
  }
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date.value}T00:00:00Z`));
}
