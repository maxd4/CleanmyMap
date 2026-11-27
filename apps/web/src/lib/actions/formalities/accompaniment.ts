import type { FormalitiesTerritory } from "./qualification";

export const SUPPORT_NEEDS = [
  { id: "notify", label: "Informer la collectivité" },
  { id: "equipment", label: "Demander du matériel" },
  { id: "pickup", label: "Organiser la reprise des déchets" },
  { id: "safety", label: "Demander un accompagnement de sécurité" },
  { id: "insurance", label: "Obtenir des informations sur les assurances" },
  { id: "association", label: "Contacter des associations partenaires" },
  { id: "communication", label: "Demander un relais de communication" },
] as const;
export type SupportNeed = (typeof SUPPORT_NEEDS)[number]["id"];
export const MUNICIPAL_CLEANING_NEEDS: readonly SupportNeed[] = ["notify", "equipment", "pickup"];

export function normalizeSupportNeeds(needs: readonly unknown[]): SupportNeed[] {
  return SUPPORT_NEEDS.map(item => item.id).filter(id => needs.includes(id));
}

type LocalSupportChannel = {
  id: string;
  label: string;
  url: string;
  email?: string;
  needs: readonly SupportNeed[];
  guidance: string;
  verifiedOn: string;
};

const LYON: LocalSupportChannel = {
  id: "lyon-8-cleanup", label: "Mairie du 8e arrondissement de Lyon",
  url: "https://mairie8.lyon.fr/vie-pratique/dechets-et-proprete/organiser-une-operation-de-nettoyage-citoyen",
  needs: ["notify", "equipment"],
  guidance: "Prêt de matériel sur demande. Confirmer la date, les quantités et les modalités directement avec la mairie.",
  verifiedOn: "2026-11-27",
};
const NANTES: LocalSupportChannel = {
  id: "nantes-metropole-cleanup", label: "Nantes Métropole",
  url: "https://metropole.nantes.fr/mes-services-mon-quotidien/organiser-un-ramassage-citoyen-des-dechets",
  needs: ["equipment"],
  guidance: "Demande de kit via le formulaire officiel, idéalement trois semaines avant. Quantités et retrait à confirmer.",
  verifiedOn: "2026-11-27",
};

const RENNES: LocalSupportChannel = {
  id: "rennes-cleanup", label: "Ville de Rennes, service propreté et directions de quartier",
  url: "https://dechets.metropole.rennes.fr/les-bons-gestes-pour-une-ville-plus-propre/",
  needs: ["equipment"], guidance: "Pinces de ramassage auprès des directions de quartier ou du service propreté ; disponibilité à vérifier.", verifiedOn: "2026-11-27",
};

export function resolveLocalSupport(
  territory: FormalitiesTerritory,
  areaMode: "single_location" | "route_or_area" | "unknown",
  needs: readonly SupportNeed[],
): LocalSupportChannel[] {
  // The anchor of an itinerary does not establish its complete coverage.
  if (areaMode !== "single_location") return [];
  const channels = [
    ...(territory.commune?.codeInsee === "69123" && territory.arrondissement?.code === "69388" ? [LYON] : []),
    ...(territory.epci?.code === "244400404" ? [NANTES] : []),
    ...(territory.commune?.codeInsee === "35238" ? [RENNES] : []),
  ];
  return channels.filter(channel => channel.needs.some(need => needs.includes(need)));
}

export function buildSupportRequestLines(needs: readonly SupportNeed[]): string[] {
  const selected = normalizeSupportNeeds(needs);
  return [
    ...(selected.includes("notify") ? ["Nous souhaitons vous informer de cette action."] : []),
    ...(selected.includes("equipment") ? ["Matériel et quantités souhaités : [à préciser]", "Merci de confirmer les disponibilités et modalités de retrait."] : []),
    ...(selected.includes("pickup") ? ["Flux et volumes prévus : [à préciser]", "Point et horaire de reprise souhaités : [à préciser]", "Merci de confirmer les flux acceptés, le tri et les modalités de reprise."] : []),
  ];
}
