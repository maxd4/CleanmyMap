import type { OrganizerType } from "./organizer-type";

export type OrganizerGeographicScope = "local" | "regional" | "national";
export type OrganizerActivityCadence =
  | "monthly"
  | "multiple_per_year"
  | "annual";
export type OrganizerActivityRole =
  | "direct_organizer"
  | "network_coordinator"
  | "both";

export type OrganizerDirectoryEntry = {
  id: string;
  name: string;
  value: string;
  organizerType: Exclude<OrganizerType, "spontaneous">;
  geographicScope: OrganizerGeographicScope;
  city: string | null;
  region: string | null;
  isIleDeFrance: boolean | null;
  parentOrganization: string | null;
  activityCadence: OrganizerActivityCadence;
  activityRole: OrganizerActivityRole;
  websiteUrl: string;
  activityEvidenceUrls: readonly string[];
  activityEvidenceSummary: string;
  lastVerifiedActivityYear: number;
  verifiedAt: string;
};

export const ORGANIZER_DIRECTORY_VERIFIED_AT = "2026-09-06" as const;

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
  // ---------------------------------------------------------------------------
  // ENTREPRISES — activité récurrente de cleanwalk documentée
  // ---------------------------------------------------------------------------
  {
    id: "company-matmut",
    name: "Groupe Matmut",
    value: "Entreprise - Groupe Matmut",
    organizerType: "company",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "annual",
    activityRole: "direct_organizer",
    websiteUrl:
      "https://www.matmut.fr/groupe-matmut/nos-engagements/cleanwalks-matmut.html",
    activityEvidenceUrls: [
      "https://www.matmut.fr/groupe-matmut/nos-engagements/cleanwalks-matmut.html",
      "https://www.matmut.fr/groupe-matmut/lagenda/2026/cleanwalks-06-06-2026.html",
    ],
    activityEvidenceSummary:
      "5e édition nationale des Cleanwalks Matmut en 2026, avec 10 villes dont Paris, après quatre éditions précédentes.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "company-decathlon",
    name: "Decathlon",
    value: "Entreprise - Decathlon",
    organizerType: "company",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "annual",
    activityRole: "direct_organizer",
    websiteUrl:
      "https://activites.decathlon.fr/fr-FR/d/world-clean-up-day-decathlon",
    activityEvidenceUrls: [
      "https://activites.decathlon.fr/fr-FR/d/world-clean-up-day-decathlon",
      "https://activites.decathlon.fr/fr-FR/activites-sportives/details/12911431",
      "https://activites.decathlon.fr/fr-FR/activites-sportives/details/6524242",
    ],
    activityEvidenceSummary:
      "World Cleanup Day organisé via plusieurs magasins en 2025 puis à nouveau en 2026 ; le dispositif est proposé à l'échelle nationale.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },

  {
    id: "company-eleclerc",
    name: "E.Leclerc — Nettoyons la Nature",
    value: "Entreprise - E.Leclerc",
    organizerType: "company",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: "Mouvement E.Leclerc",
    activityCadence: "annual",
    activityRole: "direct_organizer",
    websiteUrl: "https://www.mouvement.leclerc/nettoyons-la-nature",
    activityEvidenceUrls: [
      "https://www.mouvement.leclerc/nettoyons-la-nature",
      "https://mouvement.leclerc/espace-presse/eleclerc-lance-la-29eme-edition-de-loperation-nettoyons-la-nature-ouverture-des",
    ],
    activityEvidenceSummary:
      "29e édition nationale de Nettoyons la Nature en septembre 2026 ; l'opération est organisée chaque année par les Centres E.Leclerc partout en France.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },

  // ---------------------------------------------------------------------------
  // ASSOCIATIONS — portée nationale
  // ---------------------------------------------------------------------------
  {
    id: "association-world-cleanup-day-france",
    name: "World Cleanup Day France",
    value: "World Cleanup Day France",
    organizerType: "association",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "annual",
    activityRole: "both",
    websiteUrl: "https://www.worldcleanupday.fr/",
    activityEvidenceUrls: [
      "https://www.worldcleanupday.fr/",
      "https://www.worldcleanupday.fr/en-france/",
      "https://www.worldcleanupday.fr/foire-aux-questions/",
    ],
    activityEvidenceSummary:
      "Mobilisation nationale de ramassage fixée au 20 septembre chaque année, complétée par le Mégothon et un réseau d'ambassadeurs sur le territoire.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-surfrider",
    name: "Surfrider Foundation Europe / Surfrider France",
    value: "Surfrider Foundation Europe / Surfrider France",
    organizerType: "association",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "multiple_per_year",
    activityRole: "both",
    websiteUrl: "https://www.surfrider.fr/",
    activityEvidenceUrls: [
      "https://www.surfrider.fr/devenir-benevole/",
      "https://www.surfrider.fr/press/surfrider-lance-retrace-un-programme-de-sciences-participatives-sur-les-dechets/",
      "https://retrace.surfrider.eu/projet/",
    ],
    activityEvidenceSummary:
      "Collectes de déchets organisées depuis 1995 ; 17 172 participants en 2025 et poursuite du programme sous RETRACE en 2026.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-cleanwalker",
    name: "CleanWalker",
    value: "CleanWalker",
    organizerType: "association",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "multiple_per_year",
    activityRole: "direct_organizer",
    websiteUrl: "https://cleanwalker.fr/",
    activityEvidenceUrls: [
      "https://cleanwalker.fr/agenda/",
      "https://cleanwalker.fr/nos-antennes/",
      "https://cleanwalker.fr/association/",
    ],
    activityEvidenceSummary:
      "Cleanwalks organisées toute l'année via un réseau d'antennes ; agenda 2026 actif avec plusieurs opérations en Essonne et Seine-et-Marne.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-greenminded",
    name: "GreenMinded",
    value: "GreenMinded",
    organizerType: "association",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "multiple_per_year",
    activityRole: "both",
    websiteUrl: "https://www.greenminded.fr/",
    activityEvidenceUrls: [
      "https://www.greenminded.fr/ramassages-de-dechets/",
      "https://www.jeveuxaider.gouv.fr/missions-benevolat/20109/benevolat-greenminded",
      "https://www.jeveuxaider.gouv.fr/missions-benevolat/81710/benevolat-greenminded-104",
    ],
    activityEvidenceSummary:
      "Organisation et accompagnement de ramassages partout en France, avec opérations en Île-de-France et missions de coordination récurrentes.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-wings-of-the-ocean",
    name: "Wings of the Ocean",
    value: "Wings of the Ocean",
    organizerType: "association",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "multiple_per_year",
    activityRole: "direct_organizer",
    websiteUrl: "https://www.wingsoftheocean.com/",
    activityEvidenceUrls: [
      "https://www.wingsoftheocean.com/s-informer/nos-evenements/",
      "https://www.wingsoftheocean.com/nos-missions/",
      "https://donate.wingsoftheocean.com/",
    ],
    activityEvidenceSummary:
      "Nombreux ramassages documentés en 2026 dans plusieurs villes françaises, avec missions et collecte de données de déchets à l'échelle nationale.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-project-rescue-ocean",
    name: "Project Rescue Ocean",
    value: "Project Rescue Ocean",
    organizerType: "association",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "multiple_per_year",
    activityRole: "direct_organizer",
    websiteUrl: "https://projectrescueocean.org/",
    activityEvidenceUrls: [
      "https://projectrescueocean.org/",
      "https://projectrescueocean.org/actualites-project-rescue-ocean/",
    ],
    activityEvidenceSummary:
      "Réseau d'opérations éco-citoyennes avec plusieurs actions de dépollution programmées et réalisées en France en 2026.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-merterre",
    name: "MerTerre",
    value: "MerTerre",
    organizerType: "association",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "multiple_per_year",
    activityRole: "both",
    websiteUrl: "https://mer-terre.org/",
    activityEvidenceUrls: [
      "https://mer-terre.org/zero-dechet-sauvage/",
      "https://mer-terre.org/adopt1-spot/",
      "https://mer-terre.org/calanques-propres/",
    ],
    activityEvidenceSummary:
      "Coordination nationale de Zéro Déchet Sauvage ; le programme Adopt'1 Spot demande trois ramassages par an et MerTerre coordonne aussi des opérations de terrain.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-mountain-riders",
    name: "Mountain Riders",
    value: "Mountain Riders",
    organizerType: "association",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "annual",
    activityRole: "both",
    websiteUrl: "https://www.mountain-riders.org/",
    activityEvidenceUrls: [
      "https://www.mountain-riders.org/montagne-zero-dechet/les-premices/",
      "https://www.mountain-riders.org/montagne-zero-dechet/charte-mon/",
    ],
    activityEvidenceSummary:
      "Campagne nationale de ramassage en montagne reconduite chaque année ; 89 opérations caractérisées en 2025 et campagne 2026 active.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-team-river-clean",
    name: "Team River Clean",
    value: "Team River Clean",
    organizerType: "association",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "multiple_per_year",
    activityRole: "direct_organizer",
    websiteUrl: "https://teamriverclean.org/",
    activityEvidenceUrls: [
      "https://teamriverclean.org/",
      "https://teamriverclean.org/qui-sommes-nous/",
    ],
    activityEvidenceSummary:
      "Mouvement national de nettoyage des rivières, berges et lacs ; plus de 250 journées de ramassage annoncées depuis 2021.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-the-clean-project",
    name: "The Clean Project",
    value: "The Clean Project",
    organizerType: "association",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "annual",
    activityRole: "direct_organizer",
    websiteUrl: "https://www.thecleanproject.fr/",
    activityEvidenceUrls: [
      "https://www.thecleanproject.fr/",
      "https://thecleanproject.fr/",
    ],
    activityEvidenceSummary:
      "12 cleanups documentés en 2024, festival-cleanup à Paris en 2025 et nouvelle édition parisienne ainsi qu'une étape lyonnaise en 2026.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-lopp",
    name: "Ludovic Objectif Planète Propre (LOPP)",
    value: "Ludovic Objectif Planète Propre (LOPP)",
    organizerType: "association",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "annual",
    activityRole: "both",
    websiteUrl: "https://ludovicobjectifplanetepropre.org/",
    activityEvidenceUrls: [
      "https://ludovicobjectifplanetepropre.org/",
      "https://lemegothon.fr/cgu/",
      "https://alcome.eco/nos-associations-partenaires/",
    ],
    activityEvidenceSummary:
      "Association francilienne portant des défis de nettoyage itinérants et éditant la plateforme du Mégothon ; nouveau défi national annoncé à partir de 2026.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },

  {
    id: "association-fnc-jaime-la-nature-propre",
    name: "Fédération Nationale des Chasseurs — J’aime la Nature Propre",
    value: "Fédération Nationale des Chasseurs — J’aime la Nature Propre",
    organizerType: "association",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: "Fédération Nationale des Chasseurs",
    activityCadence: "annual",
    activityRole: "both",
    websiteUrl: "https://www.jaimelanaturepropre.fr/",
    activityEvidenceUrls: [
      "https://www.jaimelanaturepropre.fr/",
      "https://www.jaimelanaturepropre.fr/loperation/",
    ],
    activityEvidenceSummary:
      "J’aime la Nature Propre est une opération nationale annuelle portée par la Fédération Nationale des Chasseurs ; 6e édition en 2026 et édition 2027 déjà annoncée.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-no-plastic-in-my-sea",
    name: "No Plastic In My Sea",
    value: "No Plastic In My Sea",
    organizerType: "association",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: null,
    activityCadence: "annual",
    activityRole: "both",
    websiteUrl: "https://noplasticinmysea.org/",
    activityEvidenceUrls: [
      "https://noplasticinmysea.org/",
      "https://www.jeveuxaider.gouv.fr/missions-benevolat/101667/benevolat-no-plastic-in-my-sea-13",
      "https://www.fondationdelamer.org/nos-programmes/un-geste-pour-la-mer/associations/no-plastic-in-my-sea/",
    ],
    activityEvidenceSummary:
      "Le No Plastic Challenge est reconduit chaque année ; l'édition 2026 propose explicitement d'organiser des ramassages et plusieurs collectes 2026 sont documentées en France, dont à Paris.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },
  {
    id: "association-defi-environnement-lions-france",
    name: "Défi pour l’Environnement — Lions de France",
    value: "Défi pour l’Environnement — Lions de France",
    organizerType: "association",
    geographicScope: "national",
    city: null,
    region: null,
    isIleDeFrance: null,
    parentOrganization: "Lions de France",
    activityCadence: "multiple_per_year",
    activityRole: "both",
    websiteUrl: "https://defipourlenvironnement.org/",
    activityEvidenceUrls: [
      "https://defipourlenvironnement.org/about-us/?lang=en",
      "https://www.lions-france.org/wp-content/uploads/2025/02/guide-des-assos-2024.pdf",
      "https://lions-seineetmarneenvironnement.myassoc.org/action-defi-77-pour-l-environnement-edition-2026-96203.html",
    ],
    activityEvidenceSummary:
      "Association fédérative des Lions de France qui coordonne des actions de nettoyage de la nature en France ; Défi 77 est reconduit en 2026 pour sa 11e édition.",
    lastVerifiedActivityYear: 2026,
    verifiedAt: ORGANIZER_DIRECTORY_VERIFIED_AT,
  },

  // ---------------------------------------------------------------------------
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

export type OrganizerDirectoryKnownEntry =
  (typeof ORGANIZER_DIRECTORY)[number];

const ORGANIZER_DIRECTORY_VALUE_SET = new Set<string>(
  ORGANIZER_DIRECTORY.map((entry) => entry.value),
);

function organizerDirectoryScopeRank(
  entry: OrganizerDirectoryKnownEntry,
): number {
  if (entry.isIleDeFrance === true) {
    return 0;
  }
  if (entry.geographicScope === "national") {
    return 1;
  }
  return 2;
}

/**
 * Ordre d'usage dans l'UI : acteurs franciliens d'abord, puis acteurs nationaux.
 * Les acteurs purement locaux hors Île-de-France ne sont pas inclus dans le
 * répertoire courant.
 */
export function getOrganizerDirectoryEntries(
  organizerType: OrganizerType | null | undefined,
): readonly OrganizerDirectoryKnownEntry[] {
  if (!organizerType || organizerType === "spontaneous") {
    return [];
  }

  return ORGANIZER_DIRECTORY.filter(
    (entry) => entry.organizerType === organizerType,
  ).sort((a, b) => {
    const scopeDelta =
      organizerDirectoryScopeRank(a) - organizerDirectoryScopeRank(b);
    if (scopeDelta !== 0) {
      return scopeDelta;
    }
    return a.name.localeCompare(b.name, "fr");
  });
}

export function getOrganizerDirectoryEntryByValue(
  value: string | null | undefined,
): OrganizerDirectoryKnownEntry | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  return (
    ORGANIZER_DIRECTORY.find((entry) => entry.value === normalized) ?? null
  );
}

export function isKnownOrganizerDirectoryValue(value: string): boolean {
  return ORGANIZER_DIRECTORY_VALUE_SET.has(value.trim());
}

/**
 * Export historique encore consommé par plusieurs formulaires et routes.
 * Il reste volontairement limité au flux historique
 * "Action spontanée / Entreprise / Association" tant que tous les consommateurs
 * n'utilisent pas encore `organizerType` pour filtrer le répertoire structuré.
 */
export const ASSOCIATION_SELECTION_OPTIONS = [
  "Action spontanée",
  "Entreprise",
  ...ORGANIZER_DIRECTORY.filter(
    (entry) => entry.organizerType === "association",
  ).map((entry) => entry.value),
] as const;

export type AssociationSelectionOption =
  (typeof ASSOCIATION_SELECTION_OPTIONS)[number];

export const ENTREPRISE_ASSOCIATION_OPTION = "Entreprise" as const;
export const ENTREPRISE_UNSPECIFIED_ASSOCIATION_LABEL =
  "Entreprise - Non precise" as const;
const ENTREPRISE_ASSOCIATION_PREFIX = `${ENTREPRISE_ASSOCIATION_OPTION} - `;

/**
 * Valeurs historiques acceptées uniquement pour compatibilité avec des actions
 * déjà enregistrées / imports anciens. Elles ne sont plus proposées comme
 * catalogue canonique lorsqu'elles ne figurent pas dans `ORGANIZER_DIRECTORY`.
 */
const LEGACY_ASSOCIATION_SELECTION_OPTIONS = [
  "AEBCPEV",
  "Association Sans Murs Paris 15",
  "La Brigade Verte Paris",
  "Clean Walk Paris 10",
  "Collectif Nettoyons Paris",
  "Green Family",
  "Green Friday",
  "Green Wednesday",
  "Les Eco-puces",
  "Megothon",
  "Paris Clean Walk",
  "Paris Zero Dechet",
  "QNSCNT",
  "Senat Propre",
  "Etudiants pour la Planete",
  "Wings of the Ocean",
  "World Cleanup Day France",
] as const;

const ASSOCIATION_SELECTION_SET = new Set<string>([
  ...ASSOCIATION_SELECTION_OPTIONS,
  ...LEGACY_ASSOCIATION_SELECTION_OPTIONS,
]);

export function isAssociationSelectionOption(
  value: string,
): value is AssociationSelectionOption {
  return ASSOCIATION_SELECTION_SET.has(value);
}

export function buildEntrepriseAssociationName(enterpriseName: string): string {
  return `${ENTREPRISE_ASSOCIATION_PREFIX}${enterpriseName.trim().slice(0, 100)}`;
}

export function extractEntrepriseName(value: string): string | null {
  if (!value.startsWith(ENTREPRISE_ASSOCIATION_PREFIX)) {
    return null;
  }
  const enterpriseName = value
    .slice(ENTREPRISE_ASSOCIATION_PREFIX.length)
    .trim();
  return enterpriseName.length > 0 ? enterpriseName : null;
}

export function isValidAssociationName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) {
    return false;
  }
  if (isAssociationSelectionOption(trimmed)) {
    return true;
  }
  if (isKnownOrganizerDirectoryValue(trimmed)) {
    return true;
  }
  return extractEntrepriseName(trimmed) !== null;
}

export function normalizeAssociationSelectionForPrefill(
  value: string,
): string | null {
  const trimmed = value.trim();

  if (isKnownOrganizerDirectoryValue(trimmed)) {
    const known = getOrganizerDirectoryEntryByValue(trimmed);
    if (known?.organizerType === "company") {
      return ENTREPRISE_ASSOCIATION_OPTION;
    }
    return trimmed;
  }

  if (isAssociationSelectionOption(trimmed)) {
    return trimmed;
  }

  const enterpriseName = extractEntrepriseName(trimmed);
  if (enterpriseName) {
    return ENTREPRISE_ASSOCIATION_OPTION;
  }
  return null;
}

export function normalizeAssociationScopeValue(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  if (trimmed === ENTREPRISE_ASSOCIATION_OPTION) {
    return ENTREPRISE_UNSPECIFIED_ASSOCIATION_LABEL;
  }
  const enterpriseName = extractEntrepriseName(trimmed);
  if (enterpriseName) {
    return buildEntrepriseAssociationName(enterpriseName);
  }
  return trimmed;
}
