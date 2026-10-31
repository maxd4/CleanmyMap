import { AppError } from "@/lib/errors/app-errors";
import { createActionError, parseErrorMessage, parseJsonSafely } from "./http-errors";
import {
  isActionRetrospectiveEditor,
  type ActionRetrospectiveDraftInput,
  type ActionRetrospectiveEditor,
} from "./action-retrospective-contract";

type ActionRetrospectiveResponse = {
  retrospective: ActionRetrospectiveEditor | null;
};

async function readRetrospectiveResponse(
  response: Response,
  fallback: string,
): Promise<ActionRetrospectiveResponse> {
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw createActionError(response, body, parseErrorMessage(body, fallback));
  }
  if (!body || typeof body !== "object" || !("retrospective" in body)) {
    throw new AppError({ kind: "server", message: "La réponse du retour d'expérience est incomplète." });
  }
  const retrospective = (body as { retrospective?: unknown }).retrospective;
  if (retrospective !== null && !isActionRetrospectiveEditor(retrospective)) {
    throw new AppError({ kind: "server", message: "La réponse du retour d'expérience est invalide." });
  }
  return { retrospective: retrospective as ActionRetrospectiveEditor | null };
}

function retrospectiveUrl(actionId: string): string {
  return `/api/actions/${encodeURIComponent(actionId)}/retrospective`;
}

export async function fetchActionRetrospective(
  actionId: string,
): Promise<ActionRetrospectiveResponse> {
  return readRetrospectiveResponse(
    await fetch(retrospectiveUrl(actionId), { method: "GET", cache: "no-store" }),
    "Impossible de charger le retour d'expérience.",
  );
}

export async function saveActionRetrospectiveDraft(
  actionId: string,
  input: ActionRetrospectiveDraftInput,
): Promise<ActionRetrospectiveEditor> {
  const response = await fetch(retrospectiveUrl(actionId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await readRetrospectiveResponse(response, "Impossible d'enregistrer le brouillon.");
  if (!result.retrospective) {
    throw new AppError({ kind: "server", message: "Le brouillon enregistré est absent." });
  }
  return result.retrospective;
}

export async function publishActionRetrospectiveDraft(
  actionId: string,
): Promise<ActionRetrospectiveEditor> {
  const response = await fetch(retrospectiveUrl(actionId), { method: "POST" });
  const result = await readRetrospectiveResponse(response, "Impossible de publier le retour d'expérience.");
  if (!result.retrospective) {
    throw new AppError({ kind: "server", message: "Le retour publié est absent." });
  }
  return result.retrospective;
}
