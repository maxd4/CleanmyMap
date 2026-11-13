import { validateContentRecord, type ContentValidationRecord } from "@/lib/content/content-validation";

export type LocalizedText = { fr: string; en: string };
export type PolicyView = "world" | "france";
export type PolicyTerritoryScope = "international" | "national" | "regional" | "departmental" | "communal";
export type PolicyLegalStatus = "adopted" | "in_force" | "application_scheduled" | "transposition" | "implementation";

export type PolicyDate = {
  value: string;
  precision: "day" | "month" | "year";
};

export type EnvironmentalPolicyRecord = {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  institution: LocalizedText;
  themes: LocalizedText[];
  territory: {
    scope: PolicyTerritoryScope;
    label: LocalizedText;
    countryCode: string | null;
  };
  decisionDate: PolicyDate;
  applicationDate: PolicyDate | null;
  legalStatus: PolicyLegalStatus;
  officialSource: { name: LocalizedText; url: string };
  detail: LocalizedText;
  validation: ContentValidationRecord;
};

const source = (name: string, url: string, date: string, datePrecision: "day" | "month" | "year") => ({
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

const policy = (record: Omit<EnvironmentalPolicyRecord, "validation"> & { validation: ContentValidationRecord }) => record;

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
    legalStatus: "transposition",
    officialSource: { name: { fr: "Conseil de l’Union européenne — droit à la réparation", en: "Council of the EU — right to repair" }, url: "https://www.consilium.europa.eu/en/policies/right-to-repair-products/" },
    detail: { fr: "Le Conseil a donné son approbation finale le 30 mai 2024. La directive est entrée en vigueur le 30 juillet 2024 ; les États membres doivent la transposer et l’appliquer à partir du 31 juillet 2026.", en: "The Council gave final approval on 30 May 2024. The directive entered into force on 30 July 2024; Member States must transpose and apply it from 31 July 2026." },
    validation: reviewPending("eu-right-to-repair-directive", source("Conseil de l’Union européenne", "https://www.consilium.europa.eu/en/policies/right-to-repair-products/", "2024-05-30", "day"), [claim("adoption", "L’approbation finale du Conseil date du 30 mai 2024.", "The Council's final approval dates from 30 May 2024.")]),
  }),
  policy({
    id: "un-bbnj-agreement",
    title: { fr: "Accord BBNJ sur la haute mer", en: "BBNJ Agreement on the High Seas" },
    summary: { fr: "Un accord international encadre la conservation et l’utilisation durable de la biodiversité marine au-delà des juridictions nationales.", en: "An international agreement governs conservation and sustainable use of marine biodiversity beyond national jurisdiction." },
    institution: { fr: "Conférence intergouvernementale sous l’égide des Nations unies", en: "Intergovernmental Conference under the auspices of the United Nations" },
    themes: [{ fr: "Océans et biodiversité", en: "Oceans and biodiversity" }],
    territory: { scope: "international", label: { fr: "États parties et organisations régionales d’intégration économique", en: "States parties and regional economic integration organizations" }, countryCode: null },
    decisionDate: { value: "2023-06-19", precision: "day" },
    applicationDate: { value: "2026-01-17", precision: "day" },
    legalStatus: "in_force",
    officialSource: { name: { fr: "Nations unies — Accord BBNJ", en: "United Nations — BBNJ Agreement" }, url: "https://www.un.org/bbnjagreement/en" },
    detail: { fr: "L’accord a été adopté le 19 juin 2023 et est entré en vigueur le 17 janvier 2026, après le dépôt du nombre requis d’instruments.", en: "The agreement was adopted on 19 June 2023 and entered into force on 17 January 2026 after the required instruments were deposited." },
    validation: reviewPending("un-bbnj-agreement", source("Nations unies — Accord BBNJ", "https://www.un.org/bbnjagreement/en", "2023-06-19", "day"), [claim("adoption", "L’accord a été adopté le 19 juin 2023.", "The agreement was adopted on 19 June 2023.")]),
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
    officialSource: { name: { fr: "Commission européenne — CBAM", en: "European Commission — CBAM" }, url: "https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en" },
    detail: { fr: "Une période transitoire a couru de 2023 à 2025 ; le régime définitif s’applique depuis le 1er janvier 2026. La date de décision est conservée avec une précision annuelle dans ce registre.", en: "A transitional period ran from 2023 to 2025; the definitive regime applies from 1 January 2026. The decision date is kept at year precision in this registry." },
    validation: reviewPending("eu-carbon-border-adjustment-mechanism", source("Commission européenne — CBAM", "https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en", "2023", "year"), [claim("regime", "Le régime définitif du CBAM s’applique depuis le 1er janvier 2026.", "The definitive CBAM regime applies from 1 January 2026.")]),
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
    officialSource: { name: { fr: "GOV.UK — réglementation sur les vapes à usage unique", en: "GOV.UK — single-use vapes regulations" }, url: "https://www.legislation.gov.uk/uksi/2024/1216/2025-06-01" },
    detail: { fr: "Les règlements ont été pris le 25 novembre 2024 et sont entrés en vigueur le 1er juin 2025. Ils s’appliquent aux entreprises et organisations qui vendent ou fournissent ces produits.", en: "The regulations were made on 25 November 2024 and came into force on 1 June 2025. They apply to businesses and organizations selling or supplying these products." },
    validation: reviewPending("uk-single-use-vapes-ban", source("Environmental Protection (Single-use Vapes) Regulations", "https://www.legislation.gov.uk/uksi/2024/1216/2025-06-01", "2024-11-25", "day"), [claim("commencement", "Les règlements sont entrés en vigueur le 1er juin 2025.", "The regulations came into force on 1 June 2025.")]),
  }),
  policy({
    id: "china-national-carbon-market-expansion",
    title: { fr: "Extension du marché carbone national chinois", en: "Expansion of China's National Carbon Market" },
    summary: { fr: "Le marché national chinois a étendu son périmètre à l’acier, au ciment et à l’aluminium primaire.", en: "China's national market expanded its coverage to steel, cement and primary aluminum." },
    institution: { fr: "Conseil des affaires d’État et ministère chinois de l’Écologie et de l’Environnement", en: "State Council and China's Ministry of Ecology and Environment" },
    themes: [{ fr: "Climat et industrie", en: "Climate and industry" }],
    territory: { scope: "national", label: { fr: "Chine", en: "China" }, countryCode: "CN" },
    decisionDate: { value: "2025-03", precision: "month" },
    applicationDate: null,
    legalStatus: "implementation",
    officialSource: { name: { fr: "Ministère chinois — rapport du marché carbone 2025", en: "China MEE — 2025 carbon market progress report" }, url: "https://www.mee.gov.cn/ywgz/ydqhbh/wsqtkz/202509/W020250927515319387445.pdf" },
    detail: { fr: "Le rapport officiel indique qu’en mars 2025 le Conseil des affaires d’État a approuvé l’inclusion de l’acier, du ciment et de l’aluminium primaire. La mise en œuvre sectorielle est décrite séparément de la décision d’extension.", en: "The official report says that in March 2025 the State Council approved including steel, cement and primary aluminum. Sector implementation is described separately from the expansion decision." },
    validation: reviewPending("china-national-carbon-market-expansion", source("Ministère chinois de l’Écologie et de l’Environnement", "https://www.mee.gov.cn/ywgz/ydqhbh/wsqtkz/202509/W020250927515319387445.pdf", "2025-03", "month"), [claim("expansion", "L’extension approuvée en mars 2025 concerne l’acier, le ciment et l’aluminium primaire.", "The expansion approved in March 2025 covers steel, cement and primary aluminum.")]),
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
    legalStatus: "in_force",
    officialSource: { name: { fr: "DCCEEW — rapport annuel 2024–2025", en: "DCCEEW — 2024–25 annual report" }, url: "https://www.dcceew.gov.au/sites/default/files/documents/annual-report-2024-25.pdf" },
    detail: { fr: "Le standard a commencé le 1er janvier 2025 et la conformité a commencé le 1er juillet 2025. Le registre conserve ces étapes distinctement.", en: "The standard commenced on 1 January 2025 and compliance began on 1 July 2025. The registry keeps these steps distinct." },
    validation: reviewPending("australia-new-vehicle-efficiency-standard", source("DCCEEW — rapport annuel 2024–2025", "https://www.dcceew.gov.au/sites/default/files/documents/annual-report-2024-25.pdf", "2024", "year"), [claim("commencement", "Le standard a commencé le 1er janvier 2025.", "The standard commenced on 1 January 2025.")]),
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
    officialSource: { name: { fr: "Ministère brésilien des Finances — cadre légal", en: "Brazilian Ministry of Finance — legal framework" }, url: "https://www.gov.br/fazenda/pt-br/composicao/orgaos/mercado-de-carbono/entenda-o-sbce/marco-legal" },
    detail: { fr: "La loi n° 15.042 du 11 décembre 2024 institue le SBCE. Le ministère précise que sa mise en œuvre est progressive et que le système n’est pas encore totalement opérationnel.", en: "Law No. 15,042 of 11 December 2024 establishes the SBCE. The ministry says implementation is gradual and the system is not yet fully operational." },
    validation: reviewPending("brazil-regulated-carbon-market", source("Ministère brésilien des Finances", "https://www.gov.br/fazenda/pt-br/composicao/orgaos/mercado-de-carbono/entenda-o-sbce/marco-legal", "2024-12-11", "day"), [claim("law", "La loi n° 15.042 du 11 décembre 2024 institue le SBCE.", "Law No. 15,042 of 11 December 2024 establishes the SBCE.")]),
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
    legalStatus: "in_force",
    officialSource: { name: { fr: "Commission européenne — entrée en vigueur", en: "European Commission — entry into force" }, url: "https://environment.ec.europa.eu/news/nature-restoration-law-enters-force-2024-08-15_en" },
    detail: { fr: "Le règlement est entré en vigueur le 18 août 2024. L’entrée en vigueur ne constitue pas à elle seule la preuve de résultats de restauration déjà mesurés.", en: "The regulation entered into force on 18 August 2024. Entry into force alone is not evidence of restoration results already measured." },
    validation: reviewPending("eu-nature-restoration-regulation", source("Commission européenne", "https://environment.ec.europa.eu/news/nature-restoration-law-enters-force-2024-08-15_en", "2024-06-24", "day"), [claim("entry", "Le règlement est entré en vigueur le 18 août 2024.", "The regulation entered into force on 18 August 2024.")]),
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
    officialSource: { name: { fr: "Légifrance — loi n° 2020-105", en: "Légifrance — Law No. 2020-105" }, url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000041553759/" },
    detail: { fr: "La loi est en vigueur avec des dispositions et calendriers d’application différenciés. Le registre ne réduit pas ces échéanciers à une date unique.", en: "The law is in force with differentiated provisions and implementation schedules. The registry does not reduce these schedules to a single date." },
    validation: reviewPending("fr-agec-law", source("Légifrance", "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000041553759/", "2020-02-10", "day"), [claim("promulgation", "La loi a été promulguée le 10 février 2020.", "The law was enacted on 10 February 2020.")]),
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
    officialSource: { name: { fr: "Légifrance — loi n° 2021-1104", en: "Légifrance — Law No. 2021-1104" }, url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000043956924" },
    detail: { fr: "Le texte a été promulgué le 22 août 2021 et comporte de nombreux calendriers d’application. Les dispositions territoriales ne sont pas présentées comme une rubrique parisienne autonome.", en: "The text was enacted on 22 August 2021 and contains many implementation schedules. Territorial provisions are not presented as a separate Paris section." },
    validation: reviewPending("fr-climate-resilience-law", source("Légifrance", "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000043956924", "2021-08-22", "day"), [claim("promulgation", "La loi a été promulguée le 22 août 2021.", "The law was enacted on 22 August 2021.")]),
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
    officialSource: { name: { fr: "Légifrance — loi n° 2023-973", en: "Légifrance — Law No. 2023-973" }, url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000048242288" },
    detail: { fr: "La loi a été promulguée le 23 octobre 2023. Certaines mesures renvoient à des décrets et à des calendriers propres à chaque procédure.", en: "The law was enacted on 23 October 2023. Some measures refer to decrees and schedules specific to each procedure." },
    validation: reviewPending("fr-green-industry-law", source("Légifrance", "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000048242288", "2023-10-23", "day"), [claim("promulgation", "La loi a été promulguée le 23 octobre 2023.", "The law was enacted on 23 October 2023.")]),
  }),
];

const dateValue = (date: PolicyDate) => date.value.padEnd(10, "-01").slice(0, 10);

export function getPublishedEnvironmentalPolicies(registry = ENVIRONMENTAL_POLICY_REGISTRY): EnvironmentalPolicyRecord[] {
  return registry.filter((record) => validateContentRecord(record.validation).readyForPublication);
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
    .filter((record) => filters.view === "world" || record.territory.countryCode === "FR")
    .filter((record) => filters.territory === "all" || record.territory.scope === filters.territory)
    .filter((record) => filters.theme === "all" || record.themes.some((theme) => theme.fr === filters.theme || theme.en === filters.theme))
    .filter((record) => filters.year === "all" || record.decisionDate.value.startsWith(filters.year))
    .filter((record) => filters.legalStatus === "all" || record.legalStatus === filters.legalStatus)
    .filter((record) => !query || [record.title.fr, record.title.en, record.summary.fr, record.summary.en, record.institution.fr, record.institution.en, record.territory.label.fr, record.territory.label.en].join(" ").toLocaleLowerCase().includes(query))
    .sort((a, b) => dateValue(b.decisionDate).localeCompare(dateValue(a.decisionDate)));
}

export function formatPolicyDate(date: PolicyDate | null, locale: "fr" | "en"): string {
  if (!date) return locale === "fr" ? "Non précisée" : "Not specified";
  if (date.precision === "year") return date.value;
  if (date.precision === "month") {
    const [year, month] = date.value.split("-").map(Number);
    return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
  }
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date.value}T00:00:00Z`));
}
