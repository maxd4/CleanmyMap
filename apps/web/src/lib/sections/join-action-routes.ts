const CANONICAL_JOIN_ACTION_SECTION_ID = "rejoindre-une-action" as const;
export const CANONICAL_JOIN_ACTION_ROUTE = `/sections/${CANONICAL_JOIN_ACTION_SECTION_ID}` as const;
export const LEGACY_JOIN_FORM_ROUTE = "/sections/rejoindre-un-formulaire" as const;

export type QueryParamsInput =
  | URLSearchParams
  | string
  | Record<string, string | string[] | undefined>;

function appendQueryParams(
  target: URLSearchParams,
  input: QueryParamsInput | undefined,
  excludedKeys: ReadonlySet<string>,
): void {
  if (!input) return;

  if (input instanceof URLSearchParams || typeof input === "string") {
    for (const [key, value] of new URLSearchParams(input)) {
      if (!excludedKeys.has(key)) target.append(key, value);
    }
    return;
  }

  for (const [key, rawValue] of Object.entries(input)) {
    if (excludedKeys.has(key) || rawValue === undefined) continue;
    if (Array.isArray(rawValue)) {
      for (const value of rawValue) target.append(key, value);
    } else {
      target.append(key, rawValue);
    }
  }
}

export function buildJoinActionHref(actionId?: string | null): string {
  if (!actionId?.trim()) {
    return CANONICAL_JOIN_ACTION_ROUTE;
  }

  return `${CANONICAL_JOIN_ACTION_ROUTE}?actionId=${encodeURIComponent(actionId.trim())}`;
}

export function buildJoinActionTabHref(
  tab: "future" | "past",
  actionId?: string | null,
  searchParams?: QueryParamsInput,
): string {
  const params = new URLSearchParams({ tab });
  appendQueryParams(params, searchParams, new Set(["tab", "actionId"]));
  if (actionId?.trim()) {
    params.set("actionId", actionId.trim());
  }
  return `${CANONICAL_JOIN_ACTION_ROUTE}?${params.toString()}`;
}

export function buildLegacyJoinActionRedirect(
  query: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(query)) {
    if (Array.isArray(rawValue)) {
      for (const value of rawValue) params.append(key, value);
    } else if (typeof rawValue === "string") {
      params.set(key, rawValue);
    }
  }

  const queryString = params.toString();
  return `${CANONICAL_JOIN_ACTION_ROUTE}${queryString ? `?${queryString}` : ""}`;
}
