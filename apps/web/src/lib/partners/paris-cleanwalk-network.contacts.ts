// CANDIDATE: move to apps/web/src/lib/partners/paris-cleanwalk-network.contacts.ts after integration review.
export const PARIS_CLEANING_CONTACTS_VERIFIED_ON = "2026-11-25" as const;
export type ParisContactSource = { title: string; url: string; verifiedOn: string };
export const PARIS_CLEANING_DIRECTORY_SOURCE = {
  "title": "Coordonnées des divisions de propreté",
  "url": "https://www.paris.fr/pages/la-collecte-44/",
  "verifiedOn": "2026-11-25"
} as const;
export const PARIS_CLEANING_EMAIL_SOURCE = {
  "title": "Annexe 3, pages 2 et 3",
  "url": "https://cdn.paris.fr/paris/2024/09/26/annexe-3_coordonnees-ville-de-paris-new-0xoa.pdf",
  "verifiedOn": "2026-11-25"
} as const;
export const PARIS_CLEANING_FORM_SOURCE = {
  "title": "Nettoyages participatifs",
  "url": "https://www.paris.fr/pages/nettoyages-participatifs-ensemble-rendons-paris-plus-propre-15425",
  "verifiedOn": "2026-11-25"
} as const;
export const PARIS_CLEANING_FORM_URL = PARIS_CLEANING_FORM_SOURCE.url;
export const PARIS_TOWN_HALL_DIRECTORY_SOURCE = {
  "title": "Mairies d’arrondissement",
  "url": "https://www.paris.fr/lieux/mairies-d-arrondissement/tous-les-horaires",
  "verifiedOn": "2026-11-25"
} as const;
export const PARIS_DPE_CONTACT = {
  actorId: "evt-paris-nettoyages", organizationNodeId: "dpe",
  arrondissements: Array.from({ length: 20 }, (_, i) => i + 1),
  administrativeAddress: "103 avenue de France, 75013 Paris",
  addressSource: { title: "Ville de Paris, appel à projets TLC 2026 (adresse administrative uniquement)", url: "https://paris-v4.paris.fr/pages/paris-lance-un-appel-a-projets-pour-la-collecte-des-textiles-linges-de-maison-et-chaussures-36995", verifiedOn: PARIS_CLEANING_CONTACTS_VERIFIED_ON },
  officialChannel: PARIS_CLEANING_FORM_SOURCE,
  logistics: { offeredOnRequest: ["Gants", "Sacs"], subjectToAvailability: ["Cendriers de poche"], stockConfirmed: false, pickupAddress: null, authorizedCollectionAddress: null, source: PARIS_CLEANING_FORM_SOURCE },
} as const;

export type ParisCleaningDivisionContact = {
  id: string; organizationNodeId: string; label: string; arrondissements: number[];
  administrativeAddress: string; phone: string; email?: string; emailArrondissements?: number[];
  phoneSource: ParisContactSource; addressSource: ParisContactSource; emailSource?: ParisContactSource;
  officialChannel: ParisContactSource;
};
type PublishedDivision = ParisCleaningDivisionContact & Required<Pick<ParisCleaningDivisionContact, "email" | "emailArrondissements" | "emailSource">>;
type DivisionRow = [string, string, string, number[], string, string, string];
const divisionRows: DivisionRow[] = [
  [
    "paris-centre",
    "division-01-04",
    "Division Paris-Centre (1er au 4e)",
    [
      1,
      2,
      3,
      4
    ],
    "2 rue des Quatre-Fils, 75003 Paris",
    "01 55 34 77 17",
    "DPE-STPP-1234e-Exploitation@paris.fr"
  ],
  [
    "paris-5-6",
    "division-05-06",
    "Division 5e/6e",
    [
      5,
      6
    ],
    "100 bis rue du Cherche Midi, 75006 Paris",
    "01 53 63 03 30",
    "DPE-STPP-5-6e-Exploitation@paris.fr"
  ],
  [
    "paris-7-8",
    "division-07-08",
    "Division 7e/8e",
    [
      7,
      8
    ],
    "7 rue Maleville, 75008 Paris",
    "01 45 61 57 00",
    "DPE-STPP-7/8e-Exploitation7e@paris.fr"
  ],
  [
    "paris-9-10",
    "division-09-10",
    "Division 9e/10e",
    [
      9,
      10
    ],
    "75 rue du Faubourg Poissonnière, 75009 Paris",
    "01 53 34 11 11",
    "DPE-STPP-9/10e-Exploitation@paris.fr"
  ],
  [
    "paris-11",
    "division-11",
    "Division du 11e",
    [
      11
    ],
    "40 rue Pétion, 75011 Paris",
    "01 55 28 36 60",
    "DPE-STPP-11e-Exploitation@paris.fr"
  ],
  [
    "paris-12",
    "division-12",
    "Division du 12e",
    [
      12
    ],
    "37-39 avenue Ledru-Rollin, 75012 Paris",
    "01 43 41 74 44",
    "DPE-STPP-12e-Exploitation@paris.fr"
  ],
  [
    "paris-13",
    "division-13",
    "Division du 13e",
    [
      13
    ],
    "6/8 rue Albert Bayet, 75013 Paris",
    "01 53 94 15 30",
    "DPE-STPP-13e-Exploitation@paris.fr"
  ],
  [
    "paris-14",
    "division-14",
    "Division du 14e",
    [
      14
    ],
    "140 bis rue du Château, 75014 Paris",
    "01 56 53 10 20",
    "DPE-STPP-14e-Exploitation@paris.fr"
  ],
  [
    "paris-15",
    "division-15",
    "Division du 15e",
    [
      15
    ],
    "52 rue Dombasle, 75015 Paris",
    "01 45 45 86 00",
    "DPE-STPP-15e-Exploitation@paris.fr"
  ],
  [
    "paris-16",
    "division-16",
    "Division du 16e",
    [
      16
    ],
    "9 ter rue des Boulainvilliers, 75016 Paris",
    "01 55 74 44 60",
    "DPE-STPP-16e-Exploitation@paris.fr"
  ],
  [
    "paris-17",
    "division-17",
    "Division du 17e",
    [
      17
    ],
    "7 rue Maleville, 75008 Paris",
    "01 45 61 57 17",
    "DPE-STPP-17e-Exploitation@paris.fr"
  ],
  [
    "paris-18",
    "division-18",
    "Division du 18e",
    [
      18
    ],
    "17 bis rue Joseph de Maistre, 75018 Paris",
    "01 53 09 22 60",
    "DPE-STPP-18e-Exploitation@paris.fr"
  ],
  [
    "paris-19",
    "division-19",
    "Division du 19e",
    [
      19
    ],
    "66 rue de Meaux, 75019 Paris",
    "01 53 72 54 00",
    "DPE-STPP-19e-Exploitation@paris.fr"
  ],
  [
    "paris-20",
    "division-20",
    "Division du 20e",
    [
      20
    ],
    "14/18 rue des Prairies, 75020 Paris",
    "01 40 33 83 33",
    "DPE-STPP-20e-Exploitation@paris.fr"
  ]
];
// The annex inverts the 18e and 19e sector labels; the current municipal directory matches the address, phone and email local part. The 17e office is in the 8e.
export const PARIS_CLEANING_DIVISIONS: readonly PublishedDivision[] = divisionRows.map(([id, organizationNodeId, label, arrondissements, administrativeAddress, phone, email]) => ({
  id, organizationNodeId, label, arrondissements, administrativeAddress, phone, email,
  emailArrondissements: id === "paris-7-8" ? [7] : [...arrondissements],
  phoneSource: PARIS_CLEANING_DIRECTORY_SOURCE, addressSource: PARIS_CLEANING_DIRECTORY_SOURCE,
  emailSource: PARIS_CLEANING_EMAIL_SOURCE, officialChannel: PARIS_CLEANING_FORM_SOURCE,
}));

type TownHallRow = [string, number[], string, string, string, string];
const hallRows: TownHallRow[] = [
  [
    "centre",
    [
      1,
      2,
      3,
      4
    ],
    "2 rue Eugène Spuller, Paris 3e",
    "01 87 02 61 00",
    "mairie-de-paris-centre-3716",
    "mairiepariscentre"
  ],
  [
    "5",
    [
      5
    ],
    "21 place du Panthéon, Paris 5e",
    "01 56 81 75 05",
    "mairie-du-5e-arrondissement-3717",
    "mairie05"
  ],
  [
    "6",
    [
      6
    ],
    "78 rue Bonaparte, Paris 6e",
    "01 40 46 75 06",
    "mairie-du-6e-arrondissement-3718",
    "mairie06"
  ],
  [
    "7",
    [
      7
    ],
    "116 rue de Grenelle, Paris 7e",
    "01 53 58 75 07",
    "mairie-du-7e-arrondissement-3719",
    "mairie07"
  ],
  [
    "8",
    [
      8
    ],
    "3 rue de Lisbonne, Paris 8e",
    "01 44 90 75 08",
    "mairie-du-8e-arrondissement-3856",
    "mairie08"
  ],
  [
    "9",
    [
      9
    ],
    "6 rue Drouot, Paris 9e",
    "01 71 37 75 09",
    "mairie-du-9e-arrondissement-3859",
    "mairie09"
  ],
  [
    "10",
    [
      10
    ],
    "72 rue du Faubourg Saint-Martin, Paris 10e",
    "01 53 72 10 10",
    "mairie-du-10e-arrondissement-3860",
    "mairie10"
  ],
  [
    "11",
    [
      11
    ],
    "12 place Léon Blum, Paris 11e",
    "01 53 27 11 11",
    "mairie-du-11e-arrondissement-3861",
    "mairie11"
  ],
  [
    "12",
    [
      12
    ],
    "22 rue Gabriel Lamé, Paris 12e",
    "01 44 68 12 12",
    "mairie-du-12e-arrondissement-3857",
    "mairie12"
  ],
  [
    "13",
    [
      13
    ],
    "1 place d’Italie, Paris 13e",
    "01 44 08 13 13",
    "mairie-du-13e-arrondissement-3862",
    "mairie13"
  ],
  [
    "14",
    [
      14
    ],
    "2 place Ferdinand Brunot, Paris 14e",
    "01 53 90 67 14",
    "mairie-du-14e-arrondissement-3863",
    "mairie14"
  ],
  [
    "15",
    [
      15
    ],
    "31 rue Péclet, Paris 15e",
    "01 55 76 75 15",
    "mairie-du-15e-arrondissement-3720",
    "mairie15"
  ],
  [
    "16",
    [
      16
    ],
    "71 avenue Henri Martin, Paris 16e",
    "01 40 72 16 16",
    "mairie-du-16e-arrondissement-3254",
    "mairie16"
  ],
  [
    "17",
    [
      17
    ],
    "16-20 rue des Batignolles, Paris 17e",
    "01 44 69 17 17",
    "mairie-du-17e-arrondissement-3866",
    "mairie17"
  ],
  [
    "18",
    [
      18
    ],
    "1 place Jules Joffrin, Paris 18e",
    "01 53 41 18 18",
    "mairie-du-18e-arrondissement-3255",
    "mairie18"
  ],
  [
    "19",
    [
      19
    ],
    "5-7 place Roger Madec, Paris 19e",
    "01 44 52 29 19",
    "mairie-du-19e-arrondissement-3858",
    "mairie19"
  ],
  [
    "20",
    [
      20
    ],
    "6 place Gambetta, Paris 20e",
    "01 43 15 20 20",
    "mairie-du-20e-arrondissement-3259",
    "mairie20"
  ]
];
export const PARIS_MUNICIPAL_TOWN_HALLS = hallRows.map(([suffix, arrondissements, administrativeAddress, phone, slug, host]) => ({
  id: `mairie-paris-${suffix}`, organizationNodeId: `town-hall-${suffix === "centre" ? suffix : suffix.padStart(2, "0")}`,
  label: suffix === "centre" ? "Mairie de Paris Centre" : `Mairie du ${suffix}e arrondissement`,
  arrondissements, administrativeAddress, phone, officialChannel: `https://${host}.paris.fr`,
  source: { title: suffix === "centre" ? "Mairie de Paris Centre" : `Mairie du ${suffix}e arrondissement`, url: `https://www.paris.fr/lieux/${slug}`, verifiedOn: PARIS_CLEANING_CONTACTS_VERIFIED_ON },
}));

export type ParisAssociationContact = { actorId: string; organizerDirectoryId?: string; label: string; url: string; email?: string; source: ParisContactSource; equipmentNote?: string };
export const PARIS_ASSOCIATION_PUBLIC_CONTACTS: readonly ParisAssociationContact[] = [
  {
    "actorId": "asso-featured-1",
    "organizerDirectoryId": "association-brigade-verte-paris",
    "label": "Contact Brigade Verte Paris",
    "url": "https://www.brigadeverteparis.fr/",
    "email": "brigadeverteparis20@gmail.com",
    "source": {
      "title": "Fondation de la Mer, fiche Brigade Verte",
      "url": "https://www.fondationdelamer.org/nos-programmes/un-geste-pour-la-mer/associations/birgade-verte/",
      "verifiedOn": "2026-11-25"
    }
  },
  {
    "actorId": "asso-surfrider-paris",
    "organizerDirectoryId": "association-surfrider",
    "label": "Antenne Surfrider Paris",
    "url": "https://retrace.surfrider.eu/collecte/retrace-by-surfrider-foundation-paris-mai-2026/",
    "email": "antenne75@surfrider.eu",
    "source": {
      "title": "Retrace! collecte parisienne du 31 mai 2026",
      "url": "https://retrace.surfrider.eu/collecte/retrace-by-surfrider-foundation-paris-mai-2026/",
      "verifiedOn": "2026-11-25"
    },
    "equipmentNote": "Matériel annoncé sur place pour la collecte du 31 mai 2026 uniquement. Ni prêt permanent ni disponibilité actuelle établis."
  },
  {
    "actorId": "asso-zerowaste-paris",
    "label": "Contact Zero Waste Paris",
    "url": "https://zerowasteparis.fr/contact/",
    "email": "contact@zerowasteparis.fr",
    "source": {
      "title": "Zero Waste Paris, nous rejoindre",
      "url": "https://zerowasteparis.fr/sengager/nous-rejoindre/",
      "verifiedOn": "2026-11-25"
    }
  },
  {
    "actorId": "cleanwalker-paris",
    "organizerDirectoryId": "association-cleanwalker",
    "label": "Formulaire de l’antenne Paris",
    "url": "https://cleanwalker.fr/antennes/paris/",
    "source": {
      "title": "Cleanwalker, antenne Paris",
      "url": "https://cleanwalker.fr/antennes/paris/",
      "verifiedOn": "2026-11-25"
    }
  }
];

export function resolveParisCleaningDivisionContacts(arrondissementNumbers: readonly number[]): ParisCleaningDivisionContact[] {
  const selected = new Set(arrondissementNumbers.filter(n => Number.isInteger(n) && n >= 1 && n <= 20));
  return PARIS_CLEANING_DIVISIONS.flatMap(division => {
    if (!division.arrondissements.some(n => selected.has(n))) return [];
    const { email, emailArrondissements, emailSource, ...base } = division;
    const contact = { ...base, arrondissements: [...base.arrondissements] };
    const matching = emailArrondissements.filter(n => selected.has(n));
    return matching.length ? [{ ...contact, email, emailArrondissements: matching, emailSource }] : [contact];
  });
}

export function resolveParisTownHallContacts(arrondissementNumbers: readonly number[]) {
  const selected = new Set(arrondissementNumbers.filter(n => Number.isInteger(n) && n >= 1 && n <= 20));
  return PARIS_MUNICIPAL_TOWN_HALLS.filter(hall => hall.arrondissements.some(n => selected.has(n)));
}

export function getParisAssociationContact(actorId: string): ParisAssociationContact | undefined {
  return PARIS_ASSOCIATION_PUBLIC_CONTACTS.find(contact => contact.actorId === actorId);
}
