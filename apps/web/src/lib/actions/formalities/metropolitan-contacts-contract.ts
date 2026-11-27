export const DILA_SOURCE = "https://www.data.gouv.fr/dataservices/api-annuaire-de-ladministration-competence-geographique-des-services-locaux";
export const DILA_DIRECTORY = "https://lannuaire.service-public.gouv.fr/";
/** DILA owns this evolving taxonomy; preserve provider codes instead of freezing a shortlist. */
export type ServiceType = string;
export type DirectoryContact = {
  id: string;
  name: string;
  types: ServiceType[];
  communeCodes: string[];
  phones: string[];
  emails: string[];
  websites: string[];
  directoryUrl: string;
  formUrl: string | null;
  retrievedAt: string;
};
export type CommuneCoverage = {
  status: "resolved_point" | "intersections" | "partial" | "unknown";
  communeCodes: string[];
  reason?: string;
};
export type MetropolitanContacts = {
  coverage: CommuneCoverage;
  contacts: DirectoryContact[];
  unresolvedCommuneCodes: string[];
  status: "complete" | "partial" | "unavailable" | "not_applicable";
  resources?: Array<{ id: string; label: string; url: string; needs: string[]; guidance: string }>;
};

export function isMetropolitanCommune(code: unknown): code is string {
  return typeof code === "string" && /^(?:0[1-9]|[1-8][0-9]|9[0-5]|2[AB])[0-9]{3}$/.test(code) && !code.startsWith("20");
}
export function isMetropolitanDepartment(code: unknown): code is string {
  return typeof code === "string" && /^(?:0[1-9]|[1-8][0-9]|9[0-5]|2[AB])$/.test(code) && code !== "20";
}
