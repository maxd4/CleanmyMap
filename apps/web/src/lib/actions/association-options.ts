import type { OrganizerType } from "./organizer-type";
import {
  ORGANIZER_DIRECTORY,
  ORGANIZER_DIRECTORY_VERIFIED_AT,
} from "./organizer-directory-catalog";

export type {
  OrganizerActivityCadence,
  OrganizerActivityRole,
  OrganizerDirectoryEntry,
  OrganizerGeographicScope,
} from "./organizer-directory-contract";

export { ORGANIZER_DIRECTORY, ORGANIZER_DIRECTORY_VERIFIED_AT };

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
  organizerType: OrganizerType | "" | null | undefined,
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

export function getOrganizerDirectoryLocationLabel(
  entry: OrganizerDirectoryKnownEntry,
): string | null {
  if (entry.geographicScope === "national") {
    return null;
  }

  const location = [entry.city, entry.region]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(" · ");

  return location || null;
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

export function isOrganizerAssociationNameCompatible(
  organizerType: OrganizerType | "" | null | undefined,
  associationName: string | null | undefined,
): boolean {
  const normalizedType = organizerType ?? "";
  const normalizedName = associationName?.trim() ?? "";

  if (!normalizedType || !normalizedName) {
    return false;
  }

  if (normalizedType === "spontaneous") {
    return normalizedName === "Action spontanée";
  }

  const knownEntry = getOrganizerDirectoryEntryByValue(normalizedName);
  if (knownEntry) {
    return knownEntry.organizerType === normalizedType;
  }

  if (normalizedType === "company") {
    return (
      normalizedName === ENTREPRISE_ASSOCIATION_OPTION ||
      extractEntrepriseName(normalizedName) !== null
    );
  }

  return (
    normalizedType === "association" &&
    isAssociationSelectionOption(normalizedName) &&
    normalizedName !== "Action spontanée" &&
    normalizedName !== ENTREPRISE_ASSOCIATION_OPTION
  );
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
