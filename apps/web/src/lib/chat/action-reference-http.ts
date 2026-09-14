import type { PublicActionReference } from "./action-sharing";

export type { PublicActionReference } from "./action-sharing";

export async function fetchPublicActionReference(
  actionId: string,
): Promise<PublicActionReference> {
  const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/public`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Action indisponible");
  }
  const body = (await response.json()) as { reference?: PublicActionReference };
  if (!body.reference || body.reference.id !== actionId) {
    throw new Error("Référence d'action invalide");
  }
  return body.reference;
}
