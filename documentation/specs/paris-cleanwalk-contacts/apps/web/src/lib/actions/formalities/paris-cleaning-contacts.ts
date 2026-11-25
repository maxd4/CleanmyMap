export { PARIS_CLEANING_CONTACTS_VERIFIED_ON, PARIS_CLEANING_DIRECTORY_SOURCE, PARIS_CLEANING_FORM_URL, resolveParisCleaningDivisionContacts } from "../../partners/paris-cleanwalk-network.contacts";
export type { ParisCleaningDivisionContact } from "../../partners/paris-cleanwalk-network.contacts";

export function parseParisArrondissementCode(code: string | null | undefined): number | null {
  if (!code || !/^751(?:0[1-9]|1[0-9]|20)$/.test(code)) return null;
  const arrondissement = Number(code.slice(-2));
  return arrondissement >= 1 && arrondissement <= 20 ? arrondissement : null;
}
