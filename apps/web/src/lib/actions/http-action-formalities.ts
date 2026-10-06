import { AppError } from "@/lib/errors/app-errors";
import type {
  AdministrativeRequirementsRead,
  AdministrativeRequirementsStatus,
} from "./administrative-requirements";
import type {
  ActionFormalitiesFacts,
  ActionFormalitiesQualification,
} from "./formalities-qualification";
import type {
  ActionFormalitiesWorkflowState,
  FormalitiesWorkflowTransition,
} from "./formalities-workflow";
import { createActionError, parseErrorMessage, parseJsonSafely } from "./http-errors";

export type ActionAdministrativeRequirementsResponse = AdministrativeRequirementsRead & {
  canValidate: boolean;
};

export type ActionFormalitiesResponse = {
  status: "ok";
  actionId: string;
  facts: ActionFormalitiesFacts;
  qualification: ActionFormalitiesQualification;
  workflow: ActionFormalitiesWorkflowState;
};

function parseActionFormalitiesResponse(
  body: unknown,
  incompleteMessage: string,
): ActionFormalitiesResponse {
  if (
    !body ||
    typeof body !== "object" ||
    (body as { status?: unknown }).status !== "ok" ||
    typeof (body as { actionId?: unknown }).actionId !== "string" ||
    !(body as { facts?: unknown }).facts ||
    !(body as { qualification?: unknown }).qualification ||
    !(body as { workflow?: unknown }).workflow
  ) {
    throw new AppError({
      kind: "server",
      message: incompleteMessage,
    });
  }
  return body as ActionFormalitiesResponse;
}

export async function fetchActionFormalities(
  actionId: string,
): Promise<ActionFormalitiesResponse> {
  const response = await fetch(
    `/api/actions/${encodeURIComponent(actionId)}/formalities`,
    { method: "GET", cache: "no-store" },
  );
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw createActionError(
      response,
      body,
      parseErrorMessage(body, "Impossible de charger les formalités de l'action."),
    );
  }
  return parseActionFormalitiesResponse(
    body,
    "La réponse du service est incomplète pour les formalités.",
  );
}

export async function updateActionFormalities(
  actionId: string,
  payload: {
    facts?: ActionFormalitiesFacts;
    transition?: FormalitiesWorkflowTransition;
  },
): Promise<ActionFormalitiesResponse> {
  const response = await fetch(
    `/api/actions/${encodeURIComponent(actionId)}/formalities`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw createActionError(
      response,
      body,
      parseErrorMessage(body, "Impossible d'enregistrer les formalités de l'action."),
    );
  }
  return parseActionFormalitiesResponse(
    body,
    "La réponse du service est incomplète après la mise à jour des formalités.",
  );
}

export async function fetchActionAdministrativeRequirements(
  actionId: string,
): Promise<ActionAdministrativeRequirementsResponse> {
  const response = await fetch(
    `/api/actions/${encodeURIComponent(actionId)}/administrative-requirements`,
    { method: "GET", cache: "no-store" },
  );
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw createActionError(
      response,
      body,
      parseErrorMessage(body, "Impossible de charger l'état des démarches administratives."),
    );
  }
  const candidate = body as {
    status?: unknown;
    validatedAt?: unknown;
    canValidate?: unknown;
  } | null;
  if (
    !candidate ||
    !["pending", "validated"].includes(candidate.status as AdministrativeRequirementsStatus) ||
    (candidate.validatedAt !== null && typeof candidate.validatedAt !== "string") ||
    typeof candidate.canValidate !== "boolean"
  ) {
    throw new AppError({
      kind: "server",
      message: "La réponse du service est incomplète pour les démarches administratives.",
    });
  }
  return candidate as ActionAdministrativeRequirementsResponse;
}

export type ValidateAdministrativeRequirementsResponse = {
  status: "ok";
  actionId: string;
  administrativeRequirements: {
    status: "validated";
    validatedAt: string;
  };
};

export async function validateActionAdministrativeRequirements(
  actionId: string,
): Promise<ValidateAdministrativeRequirementsResponse> {
  const response = await fetch(
    `/api/actions/${encodeURIComponent(actionId)}/administrative-requirements`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw createActionError(
      response,
      body,
      parseErrorMessage(body, "Impossible de valider les démarches administratives."),
    );
  }
  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { actionId?: unknown }).actionId !== "string" ||
    typeof (body as { administrativeRequirements?: unknown }).administrativeRequirements !== "object"
  ) {
    throw new AppError({
      kind: "server",
      message: "La réponse du service est incomplète pour les démarches administratives.",
    });
  }
  return body as ValidateAdministrativeRequirementsResponse;
}
