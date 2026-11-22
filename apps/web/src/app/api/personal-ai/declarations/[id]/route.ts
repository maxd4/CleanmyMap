import { requireAuthenticatedAccess } from "@/lib/authz";
import { isPersonalAiId, PersonalAiDeclarationInputError } from "@/lib/environmental-impact-estimator/personal-ai-declaration-http";
import { deletePersonalAiDeclaration, parseRequestJson, PersonalAiActivityOverlapError, PersonalAiDeclarationNotFoundError, personalAiJson, updatePersonalAiDeclaration } from "../route.shared";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  // API_AUTHORIZATION_CONTRACT: both UUID and Clerk owner are constrained at the database boundary.
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return personalAiJson({ error: "Connexion requise" }, 401);
  const { id } = await context.params;
  if (!isPersonalAiId(id)) return personalAiJson({ error: "Déclaration introuvable" }, 404);
  const parsed = await parseRequestJson(request);
  if (!parsed.ok) return personalAiJson({ error: parsed.error }, parsed.status);
  try {
    const item = await updatePersonalAiDeclaration({ userId: access.userId, id, payload: parsed.value });
    return item ? personalAiJson({ item }) : personalAiJson({ error: "Déclaration introuvable" }, 404);
  } catch (error) {
    if (error instanceof PersonalAiDeclarationInputError) return personalAiJson({ error: error.message }, 400);
    if (error instanceof PersonalAiActivityOverlapError) return personalAiJson({ error: error.message }, 409);
    if (error instanceof PersonalAiDeclarationNotFoundError) return personalAiJson({ error: error.message }, 404);
    return personalAiJson({ error: "Mise à jour indisponible" }, 503);
  }
}

export async function DELETE(_request: Request, context: Context) {
  // API_AUTHORIZATION_CONTRACT: deletes use the Clerk owner and addressed UUID together.
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return personalAiJson({ error: "Connexion requise" }, 401);
  const { id } = await context.params;
  if (!isPersonalAiId(id)) return personalAiJson({ error: "Déclaration introuvable" }, 404);
  try {
    const deleted = await deletePersonalAiDeclaration({ userId: access.userId, id });
    return deleted ? personalAiJson({ status: "deleted" }) : personalAiJson({ error: "Déclaration introuvable" }, 404);
  } catch {
    return personalAiJson({ error: "Suppression indisponible" }, 503);
  }
}
