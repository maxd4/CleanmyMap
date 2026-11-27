export const DILA_SOURCE = "https://www.data.gouv.fr/dataservices/api-annuaire-de-ladministration-competence-geographique-des-services-locaux";
export const DILA_DIRECTORY = "https://lannuaire.service-public.gouv.fr/";
export const SERVICE_TYPES = ["mairie","epci","prefecture","sous_pref","gendarmerie","commissariat_police","ddt","ddtm","dreal","sdis"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];
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
};

export function isMetropolitanCommune(code: unknown): code is string {
  return typeof code === "string" && /^(?:0[1-9]|[1-8][0-9]|9[0-5]|2[AB])[0-9]{3}$/.test(code) && !code.startsWith("20");
}
export function isMetropolitanDepartment(code: unknown): code is string {
  return typeof code === "string" && /^(?:0[1-9]|[1-8][0-9]|9[0-5]|2[AB])$/.test(code) && code !== "20";
}
