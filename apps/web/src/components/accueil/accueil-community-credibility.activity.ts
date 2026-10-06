import type {
  HomeCommunityActivityResponse,
} from "@/lib/accueil/data";

export const HOMEPAGE_ACTIVITY_ENDPOINT = "/api/homepage/activity";
export const HOMEPAGE_ACTIVITY_UNAVAILABLE_MESSAGE =
  "Les actions vérifiées sont momentanément indisponibles.";

function isHomeCommunityActivityResponse(
  value: unknown,
): value is HomeCommunityActivityResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Record<string, unknown>;
  const activity = response.activity;
  if (!activity || typeof activity !== "object") {
    return false;
  }

  const summary = activity as Record<string, unknown>;
  return (
    typeof summary.visibleActions === "number" &&
    typeof summary.distinctLocations === "number" &&
    Array.isArray(summary.items) &&
    (response.errorMessage === null || typeof response.errorMessage === "string")
  );
}

export async function fetchHomepageActivity(
  endpoint: string,
): Promise<HomeCommunityActivityResponse> {
  let response: Response;
  let rawBody: string;

  try {
    response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
    });
    rawBody = await response.text();
  } catch {
    throw new Error(HOMEPAGE_ACTIVITY_UNAVAILABLE_MESSAGE);
  }

  if (!response.ok || !rawBody.trim()) {
    throw new Error(HOMEPAGE_ACTIVITY_UNAVAILABLE_MESSAGE);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new Error(HOMEPAGE_ACTIVITY_UNAVAILABLE_MESSAGE);
  }

  if (!isHomeCommunityActivityResponse(body)) {
    throw new Error(HOMEPAGE_ACTIVITY_UNAVAILABLE_MESSAGE);
  }

  return body;
}
