export type ActionCreationPanelId =
  | "pre-formulaire"
  | "itineraire"
  | "meteo"
  | "formalites";

export const ACTION_CREATION_ROUTE = "/actions/new";

export function normalizeActionCreationPanel(
  value: string | string[] | undefined,
): ActionCreationPanelId {
  const candidate = Array.isArray(value) ? value[0] : value;
  switch (candidate) {
    case "itineraire":
    case "meteo":
    case "formalites":
    case "pre-formulaire":
      return candidate;
    default:
      return "pre-formulaire";
  }
}

export function buildActionCreationPanelHref(
  panel: ActionCreationPanelId,
  searchParams: Record<string, string | string[] | undefined> = {},
): string {
  const params = new URLSearchParams();
  params.set("panel", panel);

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "panel" || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    } else {
      params.append(key, value);
    }
  }

  return `${ACTION_CREATION_ROUTE}?${params.toString()}`;
}
