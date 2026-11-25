export type ParisSchoolCleanwalkStatus =
  | "realisee_attestee"
  | "annoncee_non_confirmee"
  | "participation_attestee";

export type ParisSchoolExternalSupportRole =
  | "appui_pedagogique_et_materiel"
  | "source_relais_information"
  | "plateforme_publication"
  | "coordinateur_dispositif";

export interface ParisSchoolExternalLink {
  readonly actorId?: string;
  readonly label: string;
  readonly role: ParisSchoolExternalSupportRole;
  readonly isCoOrganizer: false;
  readonly note: string;
}

export interface ParisSchoolOperationRecord {
  readonly id: string;
  readonly schoolId: string;
  readonly schoolName: string;
  readonly arrondissement: number;
  readonly address?: string;
  readonly title: string;
  readonly status: ParisSchoolCleanwalkStatus;
  readonly dateLabel: string;
  readonly uncorroboratedDateNote?: string;
  readonly locationLabel: string;
  readonly organizersLabel: string;
  readonly participantsSummary: string;
  readonly resultSummary?: string;
  readonly externalLinks: readonly ParisSchoolExternalLink[];
  readonly sources: readonly { readonly label: string; readonly url: string }[];
}

export const PARIS_SCHOOL_CLEANWALK_RECORDS: readonly ParisSchoolOperationRecord[] = [
  {
    id: "op-college-antoine-coysevox-2023-2024",
    schoolId: "college-antoine-coysevox",
    schoolName: "Collège Antoine Coysevox",
    arrondissement: 18,
    title: "Cleanwalk dans l'établissement",
    status: "realisee_attestee",
    dateLabel: "Année scolaire 2023-2024",
    locationLabel: "Dans l'établissement (Paris 18e)",
    organizersLabel: "16 éco-délégués, accompagnés par la référente EDD",
    participantsSummary:
      "16 éco-délégués porteurs ; 400 bénéficiaires du projet global Cap Éco-délégués (sans preuve de participation de tous à la collecte).",
    externalLinks: [
      {
        label: "Surfrider (antenne non précisée dans la source)",
        role: "appui_pedagogique_et_materiel",
        isCoOrganizer: false,
        note: "Atelier sur les pollutions océaniques et fourniture du kit de collecte/sensibilisation.",
      },
      {
        label: "Fondation GoodPlanet (Cap Éco-délégués)",
        role: "appui_pedagogique_et_materiel",
        isCoOrganizer: false,
        note: "Atelier Fresque des déchets et publication du projet ; ne prouve pas une coorganisation de la collecte.",
      },
    ],
    sources: [
      {
        label: "Cap Éco-délégués — Organisation d'une cleanwalk",
        url: "https://capecodelegues.goodplanet.org/projects/organisation-dune-cleanwalk/",
      },
    ],
  },
  {
    id: "op-college-saint-exupery-2024-06-08",
    schoolId: "college-saint-exupery",
    schoolName: "Collège Saint-Exupéry",
    arrondissement: 14,
    title: "Cleanwalk de proximité",
    status: "realisee_attestee",
    dateLabel: "08/06/2024",
    locationLabel: "Rues proches du collège (Paris 14e)",
    organizersLabel: "Éco-délégués, portée par Mme Fontenoy (enseignante de SVT)",
    participantsSummary: "Environ 60 volontaires répartis en 5 groupes",
    resultSummary: "Une douzaine de sacs collectés et triés en un peu plus d'une heure",
    externalLinks: [
      {
        label: "AIP Paris 14 (association de parents)",
        role: "source_relais_information",
        isCoOrganizer: false,
        note: "Source et relais d'information ; aucune coorganisation attestée.",
      },
    ],
    sources: [
      {
        label: "AIP Paris 14",
        url: "https://www.aip14.fr/page/6/",
      },
    ],
  },
  {
    id: "op-college-la-grange-aux-belles-2024-04-29",
    schoolId: "college-la-grange-aux-belles",
    schoolName: "Collège La Grange aux Belles",
    arrondissement: 10,
    address: "158 quai de Jemmapes, 75010 Paris",
    title: "Cleanwalk annoncée (6e et 5e)",
    status: "annoncee_non_confirmee",
    dateLabel: "29/04/2024, 15h30–17h (annoncée)",
    locationLabel: "158 quai de Jemmapes (Paris 10e)",
    organizersLabel: "Éco-délégués",
    participantsSummary: "Élèves de 6e et 5e prévus (réalisation non confirmée par un bilan)",
    externalLinks: [],
    sources: [
      {
        label: "Collège La Grange aux Belles — annonce officielle",
        url: "https://www.collegelagrangeauxbelles.fr/index.php?id_menu=56&page=10",
      },
    ],
  },
  {
    id: "op-college-condorcet-2026-09",
    schoolId: "college-condorcet",
    schoolName: "Collège Condorcet",
    arrondissement: 8,
    title: "Participation à « Ménage ton Voisinage »",
    status: "participation_attestee",
    dateLabel: "Septembre 2026",
    uncorroboratedDateNote: "Date du 12/09/2026 évoquée dans la communication municipale, non recoupée par un compte rendu d'action.",
    locationLabel: "Autour du parc Monceau (Paris 8e)",
    organizersLabel: "Participation du collège Condorcet (non organisateur principal)",
    participantsSummary: "Participation attestée dans le cadre du dispositif L'Heure Civique 8e et mairie du 8e",
    externalLinks: [
      {
        label: "L'Heure Civique 8e & Mairie du 8e",
        role: "coordinateur_dispositif",
        isCoOrganizer: false,
        note: "Dispositif municipal coordinateur ; le collège intervient en participation.",
      },
    ],
    sources: [
      {
        label: "Mairie du 8e — L'Heure Civique",
        url: "https://mairie08.paris.fr/pages/l-heure-civique-arrive-dans-le-8e-donnez-une-heure-par-mois-pour-votre-quartier-35904",
      },
      {
        label: "Ville de Paris — Collège Condorcet",
        url: "https://www.paris.fr/lieux/college-condorcet-653",
      },
    ],
  },
  {
    id: "op-college-georges-brassens-2025-09-16",
    schoolId: "college-georges-brassens",
    schoolName: "Collège Georges Brassens",
    arrondissement: 19,
    address: "4 rue Erik Satie, 75019 Paris",
    title: "World Cleanup Day – Collège Georges Brassens",
    status: "annoncee_non_confirmee",
    dateLabel: "16/09/2025 à 10h (annoncée)",
    locationLabel: "4 rue Erik Satie (Paris 19e)",
    organizersLabel: "Organisateur inscrit : Michael Combier",
    participantsSummary: "Annonce de participation d'autres écoles et collèges du 19e non nommés (réalisation non confirmée).",
    externalLinks: [
      {
        label: "Retrace! (Surfrider)",
        role: "plateforme_publication",
        isCoOrganizer: false,
        note: "Plateforme de publication uniquement ; ne prouve pas une coorganisation de Surfrider.",
      },
    ],
    sources: [
      {
        label: "Retrace! — Nettoyage Paris 106",
        url: "https://retrace.surfrider.eu/en/collecte/nettoyage-paris-106/",
      },
      {
        label: "Ville de Paris — Collège Georges Brassens",
        url: "https://www.paris.fr/lieux/college-georges-brassens-680",
      },
    ],
  },
];

export function getRealizedParisSchoolOperations(): readonly ParisSchoolOperationRecord[] {
  return PARIS_SCHOOL_CLEANWALK_RECORDS.filter(
    (record) => record.status === "realisee_attestee" || record.status === "participation_attestee",
  );
}
