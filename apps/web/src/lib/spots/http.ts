export type SpotType = "clean_place" | "spot";

export type CreateSpotPayload = {
  type: SpotType;
  label: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
};

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return fallback;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function createSpot(
  payload: CreateSpotPayload,
): Promise<{ id: string }> {
  const response = await fetch("/api/spots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw new Error(parseErrorMessage(body, "Impossible de creer le spot."));
  }

  if (!body || typeof body !== "object") {
    throw new Error("Reponse API invalide apres creation du spot.");
  }

  const item = (body as { item?: unknown }).item;
  if (
    !item ||
    typeof item !== "object" ||
    typeof (item as { id?: unknown }).id !== "string"
  ) {
    throw new Error("Reponse API incomplete apres creation du spot.");
  }

  return { id: (item as { id: string }).id };
}
