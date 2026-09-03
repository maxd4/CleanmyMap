import { getEntryTrustState } from "@/components/sections/rubriques/annuaire/annuaire-helpers";
import type { AnnuaireEntry, EngagementType } from "@/lib/partners/annuaire-types";
import type { PartnerTrustState } from "@/lib/partners/onboarding-types";

export type Locale = "fr" | "en";
export type PartnerKindFilter = "all" | "association" | "collective" | "company" | "institution";
export type DomainFilter = "all" | EngagementType;
export type TerritoryFilter = "all" | "france" | "region" | "departement" | "ville";

export function formatCount(value: number): string {
  return value.toLocaleString("fr-FR");
}

export function localize(locale: Locale, value: { fr: string; en: string }): string {
  return value[locale];
}

export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function isInstitution(entry: AnnuaireEntry): boolean {
  const text = normalizeText([entry.name, entry.legalIdentity, entry.description].join(" "));
  return /mairie|ville de paris|ademe|gouv|universite|universite|minister|institution/.test(text);
}

export function getKindLabel(entry: AnnuaireEntry, fr: boolean): string {
  if (isInstitution(entry)) {
    return fr ? "Institution" : "Institution";
  }

  switch (entry.kind) {
    case "association":
      return fr ? "Association" : "Association";
    case "groupe_parole":
    case "evenement":
      return fr ? "Collectif" : "Collective";
    case "commerce":
      return fr ? "Entreprise" : "Company";
    case "entreprise":
      return fr ? "Entreprise" : "Company";
    default:
      return fr ? "Partenaire" : "Partner";
  }
}

export function getTrustLabel(state: PartnerTrustState, fr: boolean): string {
  switch (state) {
    case "trusted":
      return fr ? "Confirmée" : "Confirmed";
    case "pending":
      return fr ? "À confirmer" : "Pending";
    case "incomplete":
      return fr ? "À compléter" : "Incomplete";
    default:
      return fr ? "Partenaire" : "Partner";
  }
}

export function getTrustTone(state: PartnerTrustState): string {
  switch (state) {
    case "trusted":
      return "border-emerald-200 bg-emerald-50 text-emerald-600";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-600";
    case "incomplete":
      return "border-rose-200 bg-rose-50 text-rose-600";
    default:
      return "border-violet-200 bg-violet-50 text-violet-600";
  }
}

export function getKindTone(entry: AnnuaireEntry): string {
  if (isInstitution(entry)) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  switch (entry.kind) {
    case "association":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "groupe_parole":
    case "evenement":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "commerce":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "entreprise":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function getTerritoryLabel(entry: AnnuaireEntry): string {
  if (entry.scope === "national" || entry.scope === "france" || /france/i.test(entry.location)) {
    return "France entière";
  }

  if (entry.coveredArrondissements.length > 0) {
    return `${formatCount(entry.coveredArrondissements.length)} arrondissements`;
  }

  return entry.location;
}

export function getDomainLabel(entry: AnnuaireEntry, locale: Locale): string {
  const labels = entry.types.map((type) => {
    switch (type) {
      case "environnemental":
        return locale === "fr" ? "Environnement" : "Environment";
      case "social":
        return locale === "fr" ? "Social" : "Social";
      case "humanitaire":
        return locale === "fr" ? "Humanitaire" : "Humanitarian";
      default:
        return type;
    }
  });

  return labels.join(" • ");
}

export function matchesQuery(entry: AnnuaireEntry, query: string): boolean {
  if (!query.trim()) {
    return true;
  }

  const haystack = normalizeText(
    [
      entry.name,
      entry.description,
      entry.location,
      entry.legalIdentity,
      ...(entry.tags ?? []),
    ].join(" "),
  );

  return normalizeText(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export function matchesKind(entry: AnnuaireEntry, filter: PartnerKindFilter): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "institution") {
    return isInstitution(entry);
  }

  if (filter === "company") {
    return entry.kind === "entreprise" || entry.kind === "commerce";
  }

  if (filter === "collective") {
    return entry.kind === "groupe_parole" || entry.kind === "evenement";
  }

  return entry.kind === "association";
}

export function getTerritoryBucket(entry: AnnuaireEntry): Exclude<TerritoryFilter, "all"> {
  const text = normalizeText(
    [
      entry.name,
      entry.description,
      entry.location,
      entry.legalIdentity,
      ...(entry.tags ?? []),
    ].join(" "),
  );

  if (entry.scope === "national" || entry.scope === "france" || text.includes("france") || text.includes("national")) {
    return "france";
  }

  if (text.includes("region") || text.includes("regional") || text.includes("ile de france")) {
    return "region";
  }

  if (
    entry.coveredArrondissements.length > 0
    || /\b\d{1,2}e\b/.test(text)
    || text.includes("arrondissement")
    || text.includes("departement")
  ) {
    return "departement";
  }

  return "ville";
}

export function matchesTerritory(entry: AnnuaireEntry, filter: TerritoryFilter): boolean {
  if (filter === "all") {
    return true;
  }

  return getTerritoryBucket(entry) === filter;
}

export type PartnersNetworkEntriesModelInput = {
  entries: readonly AnnuaireEntry[];
  query: string;
  kindFilter: PartnerKindFilter;
  domainFilter: DomainFilter;
  territoryFilter: TerritoryFilter;
};

export type PartnersNetworkEntriesModel = {
  sortedEntries: AnnuaireEntry[];
  filteredEntries: AnnuaireEntry[];
  visibleEntries: AnnuaireEntry[];
};

export function buildPartnersNetworkEntriesModel({
  entries,
  query,
  kindFilter,
  domainFilter,
  territoryFilter,
}: PartnersNetworkEntriesModelInput): PartnersNetworkEntriesModel {
  const sortedEntries = [...entries].sort((left, right) => {
    const rightPriority = (right.isFeatured ? 3 : 0) + (getEntryTrustState(right) === "trusted" ? 2 : 0);
    const leftPriority = (left.isFeatured ? 3 : 0) + (getEntryTrustState(left) === "trusted" ? 2 : 0);
    return rightPriority - leftPriority || left.name.localeCompare(right.name, "fr");
  });

  const filteredEntries = sortedEntries.filter((entry) => {
    if (!matchesQuery(entry, query)) {
      return false;
    }

    if (!matchesKind(entry, kindFilter)) {
      return false;
    }

    if (domainFilter !== "all" && !entry.types.includes(domainFilter)) {
      return false;
    }

    if (!matchesTerritory(entry, territoryFilter)) {
      return false;
    }

    return true;
  });

  return {
    sortedEntries,
    filteredEntries,
    visibleEntries: filteredEntries.slice(0, 6),
  };
}
