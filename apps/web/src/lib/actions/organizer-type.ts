export const ORGANIZER_TYPE_VALUES = [
  "spontaneous",
  "company",
  "association",
  "student_association",
  "collective",
  "other",
] as const;

export type OrganizerType = (typeof ORGANIZER_TYPE_VALUES)[number];

export const ORGANIZER_TYPE_OPTIONS = [
  { value: "spontaneous", label: "Action spontanée" },
  { value: "company", label: "Entreprise" },
  { value: "association", label: "Association" },
  { value: "student_association", label: "Association étudiante" },
  { value: "collective", label: "Collectif" },
  { value: "other", label: "Autre" },
] as const satisfies ReadonlyArray<{ value: OrganizerType; label: string }>;

const ORGANIZER_TYPE_SET = new Set<string>(ORGANIZER_TYPE_VALUES);

export function isOrganizerType(value: unknown): value is OrganizerType {
  return typeof value === "string" && ORGANIZER_TYPE_SET.has(value);
}

export function getOrganizerTypeLabel(
  value: OrganizerType | null | undefined,
): string {
  return (
    ORGANIZER_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
    "Non renseigné"
  );
}
