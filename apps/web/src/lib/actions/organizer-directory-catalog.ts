import {
  ORGANIZER_DIRECTORY_NATIONAL,
  ORGANIZER_DIRECTORY_VERIFIED_AT,
} from "./organizer-directory-catalog-national";
import type { OrganizerDirectoryEntry } from "./organizer-directory-contract";

export { ORGANIZER_DIRECTORY_VERIFIED_AT } from "./organizer-directory-catalog-national";

/**
 * Répertoire local de structures ayant une activité de dépollution documentée.
 *
 * Critère d'inclusion actuel :
 * - activité de ramassage / dépollution documentée au moins annuellement ;
 * - acteur actif en Île-de-France OU réseau / structure à portée nationale ;
 * - preuve publique suffisamment récente pour éviter les noms historiques non
 *   requalifiés.
 *
 * Invariants :
 * - aucune entrée pour `spontaneous` : une action spontanée n'a pas de structure ;
 * - pour une structure nationale, `city`, `region` et `isIleDeFrance` restent
 *   volontairement `null` afin de ne pas confondre siège et périmètre réel ;
 * - une présence ici ne signifie ni partenariat, ni affiliation, ni utilisation
 *   de CleanMyMap ;
 * - `value` reste compatible avec `associationName` tant que ce champ legacy
 *   existe.
 */
export const ORGANIZER_DIRECTORY = [
  ...ORGANIZER_DIRECTORY_NATIONAL,
  // ASSOCIATIONS — Île-de-France
  // ---------------------------------------------------------------------------
  {
    id: "association-ose",
    name: "OSE — Organe de Sauvetage Écologique",
    value: "OSE — Organe de Sauvetage Écologique",
    organizerType: "association",
    geographicScope: "regional",
    city: "Paris",
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: null,
    activityCadence: "monthly",
    activityRole: "direct_organizer",
    websiteUrl: "https://www.oseonline.fr/",
    activityEvidenceUrls: [
      "https://www.oseonline.fr/",
      "https://www.oseonline.fr/evenements/actions-realisees",
    ],
    activityEvidenceSummary:
      "L'association annonce des nettoyages mensuels de berges et milieux aquatiques en Île-de-France ; plusieurs opérations sont documentées en 2026.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-brigade-verte-paris",
    name: "Brigade Verte Paris",
    value: "Brigade Verte Paris",
    organizerType: "association",
    geographicScope: "local",
    city: "Paris",
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: null,
    activityCadence: "monthly",
    activityRole: "direct_organizer",
    websiteUrl: "https://www.brigadeverteparis.fr/",
    activityEvidenceUrls: [
      "https://www.brigadeverteparis.fr/",
      "https://www.fondationdelamer.org/nos-programmes/un-geste-pour-la-mer/associations/birgade-verte/",
    ],
    activityEvidenceSummary:
      "Opération Quartier Propre environ une fois par mois ; calendrier 2026 documenté dans les 11e et 20e arrondissements.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-pikpik",
    name: "PikPik Environnement",
    value: "PikPik Environnement",
    organizerType: "association",
    geographicScope: "local",
    city: "Paris",
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: null,
    activityCadence: "annual",
    activityRole: "direct_organizer",
    websiteUrl: "https://pikpik.org/",
    activityEvidenceUrls: [
      "https://pikpik.org/%C3%A9v%C3%A8nement/megothon-2025/",
      "https://www.jeveuxaider.gouv.fr/missions-benevolat/101949/benevolat-pikpik-environnement-26",
      "https://www.matmut.fr/groupe-matmut/lagenda/2026/cleanwalks-06-06-2026.html",
    ],
    activityEvidenceSummary:
      "Ramassage Mégothon organisé à Paris en 2025 puis 2026, avec participation également à la Cleanwalk Matmut de Paris en 2026.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-espoir-et-creation",
    name: "Espoir et Création",
    value: "Espoir et Création",
    organizerType: "association",
    geographicScope: "regional",
    city: "Garges-lès-Gonesse",
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: null,
    activityCadence: "multiple_per_year",
    activityRole: "direct_organizer",
    websiteUrl: "https://www.espoiretcreation.org/",
    activityEvidenceUrls: [
      "https://www.fondationdelamer.org/nos-programmes/un-geste-pour-la-mer/associations/espoir-et-creation/",
      "https://www.fondationdelamer.org/agenda/noel-clean-challenge-3/",
      "https://www.fondationdelamer.org/agenda/noel-clean-challenge-2/",
    ],
    activityEvidenceSummary:
      "Clean Challenge documentés en Île-de-France en 2024, 2025 et plusieurs fois en 2026, notamment Garges-lès-Gonesse, Montmorency et Villeparisis.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-run-eco-team-77",
    name: "Run Eco Team 77 — Longperrier",
    value: "Run Eco Team 77 — Longperrier",
    organizerType: "association",
    geographicScope: "local",
    city: "Longperrier",
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: "Run Eco Team",
    activityCadence: "annual",
    activityRole: "direct_organizer",
    websiteUrl:
      "https://www.seine-et-marne.fr/fr/fiche-evenement/18e-edition-run-eco-team-77-longperrier",
    activityEvidenceUrls: [
      "https://www.seine-et-marne.fr/fr/fiche-evenement/18e-edition-run-eco-team-77-longperrier",
    ],
    activityEvidenceSummary:
      "18e édition d'un événement sportif de ramassage de déchets à Longperrier en mars 2026.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },

  {
    id: "association-defi-77-environnement",
    name: "Défi 77 pour l’Environnement",
    value: "Défi 77 pour l’Environnement",
    organizerType: "association",
    geographicScope: "regional",
    city: "Meaux",
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: "Défi pour l’Environnement — Lions de France",
    activityCadence: "annual",
    activityRole: "direct_organizer",
    websiteUrl: "https://lions-seineetmarneenvironnement.myassoc.org/",
    activityEvidenceUrls: [
      "https://lions-seineetmarneenvironnement.myassoc.org/action-defi-77-pour-l-environnement-edition-2026-96203.html",
      "https://www.seine-et-marne.fr/fr/node?is_pdf=true&page=102",
    ],
    activityEvidenceSummary:
      "Opération annuelle de nettoyage de la nature en Seine-et-Marne depuis 2016 ; 11e édition organisée en 2026 après l'édition 2025.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-ffrandonnee-yvelines",
    name: "FFRandonnée Yvelines",
    value: "FFRandonnée Yvelines",
    organizerType: "association",
    geographicScope: "regional",
    city: "Versailles",
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: "FFRandonnée",
    activityCadence: "annual",
    activityRole: "both",
    websiteUrl: "https://yvelines.ffrandonnee.fr/",
    activityEvidenceUrls: [
      "https://www.ffrandonnee-idf.fr/randonner/environnement/",
      "https://yvelines.ffrandonnee.fr/wp-content/uploads/sites/116/2025/05/Mini-guide-du-randonneur-des-Yvelines-14_05_2025.pdf",
    ],
    activityEvidenceSummary:
      "Le comité départemental organise RandoNett' au mois d'avril de chaque année pour nettoyer les chemins de randonnée des Yvelines.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-ffrandonnee-val-doise",
    name: "FFRandonnée Val-d’Oise",
    value: "FFRandonnée Val-d’Oise",
    organizerType: "association",
    geographicScope: "regional",
    city: "Pontoise",
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: "FFRandonnée",
    activityCadence: "multiple_per_year",
    activityRole: "both",
    websiteUrl: "https://www.randovaldoise.com/",
    activityEvidenceUrls: [
      "https://www.ffrandonnee-idf.fr/randonner/environnement/",
      "https://www.randovaldoise.com/accueil/actus10/",
    ],
    activityEvidenceSummary:
      "Le comité anime les Marches Vertes toute l'année ; une marche verte avec ramassage de déchets est encore documentée en mars 2026 à Pierrelaye-Bessancourt.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },

  // ---------------------------------------------------------------------------
  // ASSOCIATIONS ÉTUDIANTES
  // ---------------------------------------------------------------------------
  {
    id: "student-green-team-pharma",
    name: "Green Team Pharma — Paris-Saclay",
    value: "Green Team Pharma — Paris-Saclay",
    organizerType: "student_association",
    geographicScope: "local",
    city: "Orsay",
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: "Université Paris-Saclay",
    activityCadence: "multiple_per_year",
    activityRole: "direct_organizer",
    websiteUrl:
      "https://www.pharmacie.universite-paris-saclay.fr/green-team-pharma",
    activityEvidenceUrls: [
      "https://www.pharmacie.universite-paris-saclay.fr/green-team-pharma",
    ],
    activityEvidenceSummary:
      "L'association indique organiser des cleanwalks autour de la Faculté de Pharmacie plusieurs fois dans l'année.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "student-sea-plastics",
    name: "SEA Plastics",
    value: "SEA Plastics",
    organizerType: "student_association",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "annual",
    activityRole: "direct_organizer",
    websiteUrl: "https://www.seaplastics.org/",
    activityEvidenceUrls: [
      "https://www.seaplastics.org/",
      "https://www.fondationdelamer.org/nos-programmes/un-geste-pour-la-mer/associations/sea-plastics/",
      "https://www.seaplastics.org/itin%C3%A9raire-2026",
    ],
    activityEvidenceSummary:
      "Association étudiante basée à Palaiseau renouvelant chaque année une expédition scientifique ; des collectes de déchets sont documentées en 2026.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },

  {
    id: "student-junior-isit-megogreen",
    name: "Junior ISIT — MeGoGreen",
    value: "Junior ISIT — MeGoGreen",
    organizerType: "student_association",
    geographicScope: "local",
    city: "Paris",
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: "ISIT",
    activityCadence: "annual",
    activityRole: "direct_organizer",
    websiteUrl: "https://www.isit-paris.fr/association-junior-isit/",
    activityEvidenceUrls: [
      "https://www.isit-paris.fr/association-junior-isit/",
    ],
    activityEvidenceSummary:
      "Junior ISIT organise depuis 2019 l'événement MeGoGreen, un défi citoyen comprenant une cleanwalk de collecte de mégots autour de Paris.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },

  // ---------------------------------------------------------------------------
  // COLLECTIFS / CAMPAGNES COLLECTIVES
  // ---------------------------------------------------------------------------
  {
    id: "collective-megothon",
    name: "Mégothon",
    value: "Mégothon",
    organizerType: "collective",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "annual",
    activityRole: "network_coordinator",
    websiteUrl: "https://www.lemegothon.fr/",
    activityEvidenceUrls: [
      "https://www.lemegothon.fr/",
      "https://www.lemegothon.fr/editions/",
      "https://lemegothon.fr/qui-sommes-nous/",
    ],
    activityEvidenceSummary:
      "Semaine nationale annuelle de ramassage de mégots ; 283 missions en 2025 et nouvelle édition nationale du 23 au 30 mai 2026.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },

  // ---------------------------------------------------------------------------
  // AUTRES ACTEURS : établissements publics, collectivités, institutions
  // ---------------------------------------------------------------------------
  {
    id: "other-paris-la-defense",
    name: "Paris La Défense",
    value: "Paris La Défense",
    organizerType: "other",
    geographicScope: "local",
    city: "Puteaux / Courbevoie",
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: null,
    activityCadence: "annual",
    activityRole: "direct_organizer",
    websiteUrl: "https://www.parisladefense.com/",
    activityEvidenceUrls: [
      "https://www.parisladefense.com/fr/programme/agenda/world-cleanup-day-2026",
      "https://www.parisladefense.com/fr/programme/agenda/world-cleanup-day-parvis",
    ],
    activityEvidenceSummary:
      "World Cleanup Day organisé chaque année sur le parvis : 5e édition en 2025 puis 6e édition en 2026.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "other-departement-essonne",
    name: "Département de l'Essonne — Essonne Verte Essonne Propre",
    value: "Département de l'Essonne — Essonne Verte Essonne Propre",
    organizerType: "other",
    geographicScope: "regional",
    city: null,
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: "Département de l'Essonne",
    activityCadence: "annual",
    activityRole: "network_coordinator",
    websiteUrl: "https://www.essonne.fr/",
    activityEvidenceUrls: [
      "https://www.essonne.fr/fileadmin/5-cadre_vie_environnement/developpement_durable/Rapport_developpement_durable_2025_CD91.pdf",
      "https://www.ville-bondoufle.fr/evenement/essonne-verte-essonne-propre-2026/",
    ],
    activityEvidenceSummary:
      "Opération Essonne Verte Essonne Propre lancée en 1995 et reconduite chaque année avec collectivités, associations, établissements, entreprises et citoyens.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "other-ligue-nationale-handball",
    name: "Ligue Nationale de Handball — programme Zone+",
    value: "Ligue Nationale de Handball — programme Zone+",
    organizerType: "other",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: "Ligue Nationale de Handball",
    activityCadence: "annual",
    activityRole: "network_coordinator",
    websiteUrl: "https://www.lnh.fr/",
    activityEvidenceUrls: [
      "https://www.lnh.fr/la-ligue/news/2026-05-19/plogging-clubs-lnh-continuent-de-se-mobiliser-pour-reduction-dechets",
    ],
    activityEvidenceSummary:
      "Opérations de plogging reconduites depuis plusieurs saisons ; 22 clubs et près de 3,5 tonnes de déchets recensées en 2026.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "other-polytech-paris-saclay",
    name: "Polytech Paris-Saclay",
    value: "Polytech Paris-Saclay",
    organizerType: "other",
    geographicScope: "local",
    city: "Orsay",
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: "Université Paris-Saclay",
    activityCadence: "annual",
    activityRole: "direct_organizer",
    websiteUrl: "https://www.universite-paris-saclay.fr/",
    activityEvidenceUrls: [
      "https://www.universite-paris-saclay.fr/evenements-polytech/world-clean-2026",
    ],
    activityEvidenceSummary:
      "World Clean Up du campus reconduit en 2026 ; la page officielle mentionne explicitement la collecte réalisée l'année précédente.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "other-ville-rueil-malmaison",
    name: "Ville de Rueil-Malmaison",
    value: "Ville de Rueil-Malmaison",
    organizerType: "other",
    geographicScope: "local",
    city: "Rueil-Malmaison",
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: null,
    activityCadence: "annual",
    activityRole: "direct_organizer",
    websiteUrl: "https://www.villederueil.fr/",
    activityEvidenceUrls: [
      "https://www.villederueil.fr/app/uploads/2026/04/Rapport-developpement-durable-2024-2025.pdf",
      "https://www.jagispourlanature.org/activite/world-clean-day-rueil-malmaison-place-marcel-noutary",
    ],
    activityEvidenceSummary:
      "La Ville mobilise ses conseils de village autour du World Cleanup Day de manière récurrente ; son rapport de développement durable documente cette mobilisation sur plusieurs années et sa poursuite en 2026.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "other-smictom-fontainebleau-foret-belle",
    name: "SMICTOM de la Région de Fontainebleau — Forêt Belle",
    value: "SMICTOM de la Région de Fontainebleau — Forêt Belle",
    organizerType: "other",
    geographicScope: "regional",
    city: "Fontainebleau",
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: null,
    activityCadence: "annual",
    activityRole: "both",
    websiteUrl: "https://www.smictom-fontainebleau.fr/",
    activityEvidenceUrls: [
      "https://www.smictom-fontainebleau.fr/foret-belle/",
    ],
    activityEvidenceSummary:
      "Le SMICTOM organise chaque année les journées citoyennes #ForêtBelle ; 8e édition annoncée les 26 et 27 septembre 2026.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "other-departement-seine-et-marne",
    name: "Département de Seine-et-Marne",
    value: "Département de Seine-et-Marne",
    organizerType: "other",
    geographicScope: "regional",
    city: "Melun",
    region: "Île-de-France",
    isIleDeFrance: true,
    parentOrganization: null,
    activityCadence: "annual",
    activityRole: "both",
    websiteUrl: "https://www.seine-et-marne.fr/",
    activityEvidenceUrls: [
      "https://www.seine-et-marne.fr/fr/fiche-evenement/mobilisation-pour-une-seine-et-marne-propre",
      "https://www.seine-et-marne.fr/fr/node?is_pdf=true&page=102",
    ],
    activityEvidenceSummary:
      "Le Département coordonne ou soutient chaque année plusieurs opérations citoyennes de ramassage, notamment en forêt et le long des routes départementales ; éditions 2025 et 2026 documentées.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
] as const satisfies readonly OrganizerDirectoryEntry[];
