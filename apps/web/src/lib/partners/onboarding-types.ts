export const ORGANIZATION_TYPES = [
  "association",
  "commerce",
  "entreprise",
  "collectif",
] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const CONTRIBUTION_TYPES = [
  "materiel",
  "logistique",
  "accueil",
  "financement",
  "communication",
] as const;

export type ContributionType = (typeof CONTRIBUTION_TYPES)[number];

export const PARIS_ARRONDISSEMENTS = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
] as const;

export type ParisArrondissement = (typeof PARIS_ARRONDISSEMENTS)[number];

export const WEEKDAY_OPTIONS = [
  { value: "mon", label: "Lundi" },
  { value: "tue", label: "Mardi" },
  { value: "wed", label: "Mercredi" },
  { value: "thu", label: "Jeudi" },
  { value: "fri", label: "Vendredi" },
  { value: "sat", label: "Samedi" },
  { value: "sun", label: "Dimanche" },
] as const;

export type Weekday = (typeof WEEKDAY_OPTIONS)[number]["value"];

export type PartnerCoverage = {
  arrondissements: number[];
  quartiers: string[];
};

export type PartnerAvailabilitySlot = {
  day: Weekday;
  start: string;
  end: string;
};

export type PartnerAvailability = {
  slots: PartnerAvailabilitySlot[];
  note?: string;
};

export type PublicChannel = {
  platform: "site web" | "instagram" | "facebook" | "email" | "téléphone";
  label: string;
  url: string;
};

export type PartnerOnboardingRequestInput = {
  organizationName: string;
  organizationType: OrganizationType;
  legalIdentity: string;
  coverage: PartnerCoverage;
  contributionTypes: ContributionType[];
  availability: PartnerAvailability;
  contactName: string;
  contactChannel: string;
  contactDetails: string;
  motivation: string;
};

export type PartnerTrustState = "trusted" | "pending" | "incomplete";

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function formatParisArrondissementLabel(value: number): string {
  return value === 1 ? "1er" : `${value}e`;
}

function uniqueSortedArrondissements(values: number[]): number[] {
  const normalized = [...new Set(values)]
    .filter((value): value is ParisArrondissement =>
      PARIS_ARRONDISSEMENTS.includes(value as ParisArrondissement),
    )
    .sort((left, right) => left - right);
  return normalized;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function extractArrondissementsFromText(text: string): number[] {
  const matches = text.matchAll(/(?:Paris\s+)?(\d{1,2})(?:er|e)?\b/gi);
  const values: number[] = [];
  for (const match of matches) {
    const parsed = Number.parseInt(match[1] ?? "", 10);
    if (Number.isInteger(parsed)) {
      values.push(parsed);
    }
  }
  return uniqueSortedArrondissements(values);
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!TIME_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function isPlaceholderUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "example.com" ||
      host.endsWith(".example.com") ||
      host === "example.org" ||
      host.endsWith(".example.org") ||
      host === "example.net" ||
      host.endsWith(".example.net") ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1"
    );
  } catch {
    return false;
  }
}

export function normalizePublicChannelUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed) && trimmed.length < 2048) {
    return isPlaceholderUrl(trimmed) ? null : trimmed;
  }
  if (trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) {
    return trimmed;
  }
  return null;
}

export function normalizePartnerCoverage(value: unknown): PartnerCoverage {
  if (typeof value === "string") {
    return {
      arrondissements: extractArrondissementsFromText(value),
      quartiers: [],
    };
  }

  if (!value || typeof value !== "object") {
    return { arrondissements: [], quartiers: [] };
  }

  const candidate = value as {
    arrondissements?: unknown;
    quartiers?: unknown;
  };

  const arrondissements = Array.isArray(candidate.arrondissements)
    ? uniqueSortedArrondissements(
        candidate.arrondissements
          .map((item) => Number(item))
          .filter((item) => Number.isInteger(item)),
      )
    : [];

  const quartiers = Array.isArray(candidate.quartiers)
    ? uniqueStrings(
        candidate.quartiers.filter((item): item is string => typeof item === "string"),
      )
    : [];

  return {
    arrondissements,
    quartiers,
  };
}

export function normalizePartnerAvailability(value: unknown): PartnerAvailability {
  if (typeof value === "string") {
    return {
      slots: [],
      note: value.trim() || undefined,
    };
  }

  if (!value || typeof value !== "object") {
    return { slots: [] };
  }

  const candidate = value as {
    slots?: unknown;
    note?: unknown;
  };

  const slots = Array.isArray(candidate.slots)
    ? candidate.slots
        .map((slot) => {
          if (!slot || typeof slot !== "object") {
            return null;
          }
          const candidateSlot = slot as {
            day?: unknown;
            start?: unknown;
            end?: unknown;
          };
          const day = WEEKDAY_OPTIONS.find(
            (option) => option.value === candidateSlot.day,
          )?.value;
          const start = normalizeTime(candidateSlot.start);
          const end = normalizeTime(candidateSlot.end);
          if (!day || !start || !end) {
            return null;
          }
          if (start >= end) {
            return null;
          }
          return {
            day,
            start,
            end,
          };
        })
        .filter((slot): slot is PartnerAvailabilitySlot => Boolean(slot))
    : [];

  return {
    slots,
    note:
      typeof candidate.note === "string" && candidate.note.trim().length > 0
        ? candidate.note.trim()
        : undefined,
  };
}

export function formatCoverageSummary(coverage: PartnerCoverage): string {
  const arrondissements = coverage.arrondissements
    .map((value) => formatParisArrondissementLabel(value))
    .join(", ");
  const quartiers = coverage.quartiers.join(", ");
  const parts = [
    arrondissements ? `Paris ${arrondissements}` : "",
    quartiers,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Périmètre à confirmer";
}

export function formatAvailabilitySlot(slot: PartnerAvailabilitySlot): string {
  const dayLabel = WEEKDAY_OPTIONS.find((option) => option.value === slot.day)?.label ?? slot.day;
  return `${dayLabel} ${slot.start}-${slot.end}`;
}

export function formatAvailabilitySummary(availability: PartnerAvailability): string {
  const slots = availability.slots.map((slot) => formatAvailabilitySlot(slot));
  if (slots.length === 0) {
    return availability.note || "Disponibilité à confirmer";
  }
  if (availability.note) {
    return `${slots.join(" · ")} · ${availability.note}`;
  }
  return slots.join(" · ");
}

function diffInDays(dateValue: string): number | null {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const diffMs = Date.now() - parsed.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function hasRecentUpdate(dateValue: string, maxAgeDays = 90): boolean {
  const days = diffInDays(dateValue);
  return days !== null && days <= maxAgeDays;
}

export function hasPublicChannel(entry: {
  primaryChannel?: { url: string } | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}): boolean {
  return Boolean(
    normalizePublicChannelUrl(entry.primaryChannel?.url ?? null) ||
      normalizePublicChannelUrl(entry.websiteUrl ?? null) ||
      normalizePublicChannelUrl(entry.instagramUrl ?? null) ||
      normalizePublicChannelUrl(entry.facebookUrl ?? null),
  );
}

export function isCompletePartnerEntry(entry: {
  kind: string;
  coveredArrondissements: number[];
  lastUpdatedAt: string;
  primaryChannel?: { url: string } | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}): boolean {
  if (entry.kind !== "commerce" && entry.kind !== "entreprise") {
    return true;
  }
  return (
    entry.coveredArrondissements.length > 0 &&
    hasPublicChannel(entry) &&
    hasRecentUpdate(entry.lastUpdatedAt, 90)
  );
}

export function getPartnerTrustState(entry: {
  verificationStatus: "verifie" | "en_cours" | "a_revalider";
  kind: string;
  coveredArrondissements: number[];
  lastUpdatedAt: string;
  primaryChannel?: { url: string } | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}): PartnerTrustState {
  if (entry.verificationStatus !== "verifie") {
    return "pending";
  }
  return isCompletePartnerEntry(entry) ? "trusted" : "incomplete";
}

export function buildPartnerWhyThisStructureMatters(entry: {
  kind: string;
  name: string;
  coveredArrondissements: number[];
  contributionTypes: ContributionType[];
  location: string;
}): string {
  const coverage = formatCoverageSummary({
    arrondissements: entry.coveredArrondissements,
    quartiers: [],
  });
  const contributions = entry.contributionTypes
    .slice(0, 2)
    .map((item) => {
      if (item === "materiel") return "du matériel";
      if (item === "logistique") return "de la logistique";
      if (item === "accueil") return "de l’accueil";
      if (item === "financement") return "du financement";
      return "de la communication";
    })
    .join(" et ");
  const contributionText = contributions || "une aide concrète";

  if (entry.kind === "commerce") {
    return `Pourquoi cette structure compte: elle ancre un point de contact local sur ${coverage} et rend possible ${contributionText}.`;
  }
  if (entry.kind === "entreprise") {
    return `Pourquoi cette structure compte: elle permet de relayer des moyens concrets sur ${coverage} depuis un acteur économique identifié.`;
  }
  return `Pourquoi cette structure compte: elle relie ${entry.name} au terrain de ${coverage} depuis ${entry.location}.`;
}
