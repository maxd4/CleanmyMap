export const ASSOCIATION_SELECTION_OPTIONS = [
  "Action spontanée",
  "Entreprise",
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

export type AssociationSelectionOption =
  (typeof ASSOCIATION_SELECTION_OPTIONS)[number];
export const ENTREPRISE_ASSOCIATION_OPTION = "Entreprise" as const;
export const ENTREPRISE_UNSPECIFIED_ASSOCIATION_LABEL =
  "Entreprise - Non precise" as const;
const ENTREPRISE_ASSOCIATION_PREFIX = `${ENTREPRISE_ASSOCIATION_OPTION} - `;

const ASSOCIATION_SELECTION_SET = new Set<string>(
  ASSOCIATION_SELECTION_OPTIONS,
);

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
  return extractEntrepriseName(trimmed) !== null;
}

export function normalizeAssociationSelectionForPrefill(
  value: string,
): string | null {
  const trimmed = value.trim();
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
