import { AppError } from "@/lib/errors/app-errors";
import type { ActionRouteVersioning } from "@/lib/route/route-active-version";
import type { OperationalRoute } from "@/lib/route/route-operational";
import type { RoutePlannerProof } from "@/lib/route/route-planner-proof-contract";
import type { RoutePlannerSnapshot } from "@/lib/route/route-calibration-types";
import { createActionError, parseErrorMessage, parseJsonSafely } from "./http-errors";

export type ActionRouteVersionResponse = {
  status: "unchanged" | "applied";
  actionId: string;
  activeRouteVersion: ActionRouteVersioning["active"];
  history: ActionRouteVersioning["history"];
};

export async function applyActionRouteVersion(
  actionId: string,
  payload: {
    operationalRoute: OperationalRoute;
    plannerSnapshot: RoutePlannerSnapshot;
    plannerProof: RoutePlannerProof;
  },
): Promise<ActionRouteVersionResponse> {
  const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/route-version`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw createActionError(
      response,
      body,
      parseErrorMessage(body, "Impossible d'appliquer le nouvel itinéraire."),
    );
  }
  if (
    !body ||
    typeof body !== "object" ||
    !["unchanged", "applied"].includes((body as { status?: unknown }).status as string) ||
    typeof (body as { actionId?: unknown }).actionId !== "string" ||
    !(body as { activeRouteVersion?: unknown }).activeRouteVersion ||
    !Array.isArray((body as { history?: unknown }).history)
  ) {
    throw new AppError({
      kind: "server",
      message: "La réponse du service est incomplète après l'application de l'itinéraire.",
    });
  }
  return body as ActionRouteVersionResponse;
}
