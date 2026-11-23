export const PARIS_CLEANING_CONTACTS_VERIFIED_ON = "2026-11-23" as const;

export const PARIS_CLEANING_FORM_URL =
  "https://www.paris.fr/pages/nettoyages-participatifs-ensemble-rendons-paris-plus-propre-15425";

export const PARIS_CLEANING_DIRECTORY_SOURCE = {
  title: "Coordonnées des divisions de propreté — Ville de Paris",
  url: "https://www.paris.fr/pages/la-collecte-44/",
  verifiedOn: PARIS_CLEANING_CONTACTS_VERIFIED_ON,
} as const;

const PARIS_CLEANING_EMAIL_SOURCE = {
  title: "Annexe 3 — Coordonnées des services de la Ville de Paris",
  url: "https://cdn.paris.fr/paris/2024/09/26/annexe-3_coordonnees-ville-de-paris-new-0xoa.pdf",
  verifiedOn: PARIS_CLEANING_CONTACTS_VERIFIED_ON,
} as const;

export type ParisCleaningDivisionContact = {
  id: string;
  label: string;
  arrondissements: number[];
  phone: string;
  email?: string;
  emailArrondissements?: number[];
  phoneSource: typeof PARIS_CLEANING_DIRECTORY_SOURCE;
  emailSource?: typeof PARIS_CLEANING_EMAIL_SOURCE;
};

const DIVISIONS: Omit<ParisCleaningDivisionContact, "email" | "emailArrondissements" | "emailSource">[] = [
  { id: "paris-centre", label: "Division Paris-Centre (1er au 4e)", arrondissements: [1, 2, 3, 4], phone: "01 55 34 77 17", phoneSource: PARIS_CLEANING_DIRECTORY_SOURCE },
  { id: "paris-5-6", label: "Division 5e/6e", arrondissements: [5, 6], phone: "01 53 63 03 30", phoneSource: PARIS_CLEANING_DIRECTORY_SOURCE },
  { id: "paris-7-8", label: "Division 7e/8e", arrondissements: [7, 8], phone: "01 45 61 57 00", phoneSource: PARIS_CLEANING_DIRECTORY_SOURCE },
  { id: "paris-9-10", label: "Division 9e/10e", arrondissements: [9, 10], phone: "01 53 34 11 11", phoneSource: PARIS_CLEANING_DIRECTORY_SOURCE },
  { id: "paris-11", label: "Division du 11e", arrondissements: [11], phone: "01 55 28 36 60", phoneSource: PARIS_CLEANING_DIRECTORY_SOURCE },
  { id: "paris-12", label: "Division du 12e", arrondissements: [12], phone: "01 43 41 74 44", phoneSource: PARIS_CLEANING_DIRECTORY_SOURCE },
  { id: "paris-13", label: "Division du 13e", arrondissements: [13], phone: "01 53 94 15 30", phoneSource: PARIS_CLEANING_DIRECTORY_SOURCE },
  { id: "paris-14", label: "Division du 14e", arrondissements: [14], phone: "01 56 53 10 20", phoneSource: PARIS_CLEANING_DIRECTORY_SOURCE },
  { id: "paris-15", label: "Division du 15e", arrondissements: [15], phone: "01 45 45 86 00", phoneSource: PARIS_CLEANING_DIRECTORY_SOURCE },
  { id: "paris-16", label: "Division du 16e", arrondissements: [16], phone: "01 55 74 44 60", phoneSource: PARIS_CLEANING_DIRECTORY_SOURCE },
  { id: "paris-17", label: "Division du 17e", arrondissements: [17], phone: "01 45 61 57 17", phoneSource: PARIS_CLEANING_DIRECTORY_SOURCE },
  { id: "paris-18", label: "Division du 18e", arrondissements: [18], phone: "01 53 09 22 60", phoneSource: PARIS_CLEANING_DIRECTORY_SOURCE },
  { id: "paris-19", label: "Division du 19e", arrondissements: [19], phone: "01 53 72 54 00", phoneSource: PARIS_CLEANING_DIRECTORY_SOURCE },
  { id: "paris-20", label: "Division du 20e", arrondissements: [20], phone: "01 40 33 83 33", phoneSource: PARIS_CLEANING_DIRECTORY_SOURCE },
];

export function parseParisArrondissementCode(code: string | null | undefined): number | null {
  if (!code || !/^751(?:0[1-9]|1[0-9]|20)$/.test(code)) return null;
  const arrondissement = Number(code.slice(-2));
  return arrondissement >= 1 && arrondissement <= 20 ? arrondissement : null;
}

export function resolveParisCleaningDivisionContacts(
  arrondissementNumbers: readonly number[],
): ParisCleaningDivisionContact[] {
  const selected = new Set(arrondissementNumbers.filter((number) => Number.isInteger(number) && number >= 1 && number <= 20));
  if (selected.size === 0) return [];

  return DIVISIONS.flatMap((division) => {
    const relevantArrondissements = division.arrondissements.filter((number) => selected.has(number));
    if (relevantArrondissements.length === 0) return [];
    if (!selected.has(7)) return [{ ...division }];
    return [{
      ...division,
      email: "DPE-STPP-7/8e-Exploitation7e@paris.fr",
      emailArrondissements: [7],
      emailSource: PARIS_CLEANING_EMAIL_SOURCE,
    }];
  });
}
