import { extractArrondissementFromLabel } from "@/lib/geo/paris-arrondissements";
import type { ActionDataContract } from "@/lib/actions/data-contract";
import type { CommunityEventItem } from "@/lib/community/http";

export type ReportScopeKind =
  | "global"
  | "account"
  | "association"
  | "arrondissement";

export type ReportScope = {
  kind: ReportScopeKind;
  value: string | null;
};

export type ReportScopeChoice = {
  value: string;
  label: string;
  count: number;
};

export type ReportScopeOptions = {
  accounts: ReportScopeChoice[];
  associations: ReportScopeChoice[];
  arrondissements: ReportScopeChoice[];
};

export type ReportScopeSource = {
  created_by_clerk_id?: string | null;
  actor_name?: string | null;
  association_name?: string | null;
  location_label?: string | null;
  contract?: {
    createdByClerkId?: string | null;
    location?: {
      label?: string | null;
    } | null;
    metadata?: {
      actorName?: string | null;
      associationName?: string | null;
    } | null;
  } | null;
};

export const DEFAULT_REPORT_SCOPE: ReportScope = {
  kind: "global",
  value: null,
};

function trimValue(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function getScopeAccountId(item: ReportScopeSource): string | null {
  const value =
    trimValue(item.created_by_clerk_id) ||
    trimValue(item.contract?.createdByClerkId ?? null);
  return value.length > 0 ? value : null;
}

function getScopeActorName(item: ReportScopeSource): string | null {
  const value =
    trimValue(item.actor_name) ||
    trimValue(item.contract?.metadata?.actorName ?? null);
  return value.length > 0 ? value : null;
}

function getScopeAssociationName(item: ReportScopeSource): string | null {
  const value =
    trimValue(item.association_name) ||
    trimValue(item.contract?.metadata?.associationName ?? null);
  return value.length > 0 ? value : null;
}

function getScopeLocationLabel(item: ReportScopeSource): string | null {
  const value =
    trimValue(item.location_label) ||
    trimValue(item.contract?.location?.label ?? null);
  return value.length > 0 ? value : null;
}

export function normalizeReportScope(
  input: Partial<ReportScope> | null | undefined,
): ReportScope {
  if (!input || !input.kind || input.kind === "global") {
    return DEFAULT_REPORT_SCOPE;
  }
  const value = trimValue(input.value ?? null);
  return value.length > 0
    ? { kind: input.kind, value }
    : DEFAULT_REPORT_SCOPE;
}

export function formatReportScopeLabel(
  scope: ReportScope,
  options?: ReportScopeOptions,
): string {
  if (scope.kind === "global" || !scope.value) {
    return "Global";
  }
  if (scope.kind === "account") {
    const option = options?.accounts.find((item) => item.value === scope.value);
    return option?.label ?? `Compte ${scope.value.slice(0, 8)}`;
  }
  if (scope.kind === "association") {
    const option = options?.associations.find((item) => item.value === scope.value);
    return option?.label ?? scope.value;
  }
  const option = options?.arrondissements.find((item) => item.value === scope.value);
  return option?.label ?? `Paris ${scope.value}e`;
}

function countByValue<T>(
  items: T[],
  getKey: (item: T) => string | null,
  getLabel: (item: T) => string,
): ReportScopeChoice[] {
  const grouped = new Map<string, { label: string; count: number }>();
  for (const item of items) {
    const key = trimValue(getKey(item));
    if (!key) {
      continue;
    }
    const existing = grouped.get(key);
    grouped.set(key, {
      label: existing?.label ?? getLabel(item),
      count: (existing?.count ?? 0) + 1,
    });
  }
  return [...grouped.entries()]
    .map(([value, entry]) => ({
      value,
      label: entry.label,
      count: entry.count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"));
}

export function buildReportScopeOptions(
  items: ReportScopeSource[],
): ReportScopeOptions {
  return {
    accounts: countByValue(
      items,
      getScopeAccountId,
      (item) => getScopeActorName(item) ?? `Compte ${getScopeAccountId(item)?.slice(0, 8) ?? "inconnu"}`,
    ),
    associations: countByValue(
      items,
      getScopeAssociationName,
      (item) => getScopeAssociationName(item) ?? "Sans association",
    ),
    arrondissements: countByValue(
      items,
      (item) => {
        const arrondissement = extractArrondissementFromLabel(
          getScopeLocationLabel(item) ?? "",
        );
        return arrondissement ? String(arrondissement) : null;
      },
      (item) => {
        const arrondissement = extractArrondissementFromLabel(
          getScopeLocationLabel(item) ?? "",
        );
        return arrondissement ? `Paris ${arrondissement}e` : "Hors arrondissement";
      },
    ),
  };
}

function matchesAssociationScope(
  item: ReportScopeSource,
  target: string,
): boolean {
  const association = getScopeAssociationName(item);
  if (!association) {
    return false;
  }
  return association.trim().toLowerCase() === target.trim().toLowerCase();
}

function matchesAccountScope(item: ReportScopeSource, target: string): boolean {
  const accountId = getScopeAccountId(item);
  if (!accountId) {
    return false;
  }
  return accountId.trim().toLowerCase() === target.trim().toLowerCase();
}

function matchesArrondissementScope(
  item: ReportScopeSource,
  target: string,
): boolean {
  const label = getScopeLocationLabel(item);
  if (!label) {
    return false;
  }
  const arrondissement = extractArrondissementFromLabel(label);
  return arrondissement !== null && String(arrondissement) === target.trim();
}

export function matchesReportScope(
  item: ReportScopeSource,
  scope: ReportScope,
): boolean {
  if (scope.kind === "global" || !scope.value) {
    return true;
  }
  if (scope.kind === "account") {
    return matchesAccountScope(item, scope.value);
  }
  if (scope.kind === "association") {
    return matchesAssociationScope(item, scope.value);
  }
  return matchesArrondissementScope(item, scope.value);
}

export function filterReportScopeItems<T extends ReportScopeSource>(
  items: T[],
  scope: ReportScope,
): T[] {
  if (scope.kind === "global" || !scope.value) {
    return items;
  }
  return items.filter((item) => matchesReportScope(item, scope));
}

export function filterActionContractsByScope(
  items: ActionDataContract[],
  scope: ReportScope,
): ActionDataContract[] {
  if (scope.kind === "global" || !scope.value) {
    return items;
  }
  return items.filter((contract) =>
    matchesReportScope(contractToScopeSource(contract), scope),
  );
}

function matchesCommunityAssociationFallback(
  item: CommunityEventItem,
  target: string,
): boolean {
  const haystack = [
    item.organizer?.displayName,
    item.title,
    item.description,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();
  return haystack.includes(target.trim().toLowerCase());
}

export function filterCommunityEventsByScope(
  items: CommunityEventItem[],
  scope: ReportScope,
): CommunityEventItem[] {
  if (scope.kind === "global" || !scope.value) {
    return items;
  }
  if (scope.kind === "account") {
    return items.filter((item) => item.organizerClerkId === scope.value);
  }
  if (scope.kind === "arrondissement") {
    return items.filter((item) => {
      const arrondissement = extractArrondissementFromLabel(item.locationLabel);
      return arrondissement !== null && String(arrondissement) === scope.value;
    });
  }
  return items.filter((item) =>
    matchesCommunityAssociationFallback(item, scope.value ?? ""),
  );
}

export function contractToScopeSource(
  contract: ActionDataContract,
): ReportScopeSource {
  return {
    created_by_clerk_id: contract.createdByClerkId ?? null,
    actor_name: contract.metadata.actorName,
    association_name: contract.metadata.associationName,
    location_label: contract.location.label,
    contract,
  };
}
