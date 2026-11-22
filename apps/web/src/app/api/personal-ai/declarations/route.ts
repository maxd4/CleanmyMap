import { requireAuthenticatedAccess } from "@/lib/authz";
import { PersonalAiDeclarationInputError } from "@/lib/environmental-impact-estimator/personal-ai-declaration-http";
import { PersonalAiActivityOverlapError, personalAiJson, listPersonalAiDeclarations, createPersonalAiDeclaration, parseRequestJson } from "./route.shared";

export async function GET(request: Request) {
  // API_AUTHORIZATION_CONTRACT: private rows are always scoped to the Clerk session owner.
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return personalAiJson({ error: "Connexion requise" }, 401);
  const search = new URL(request.url).searchParams;
  const limit = Number(search.get("limit") ?? 20);
  const offset = Number(search.get("offset") ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isInteger(offset) || offset < 0 || offset > 5000) {
    return personalAiJson({ error: "Pagination invalide" }, 400);
  }
  try {
    return personalAiJson(await listPersonalAiDeclarations({ userId: access.userId, limit, offset }));
  } catch {
    return personalAiJson({ error: "Lecture indisponible" }, 503);
  }
}

export async function POST(request: Request) {
  // API_AUTHORIZATION_CONTRACT: ownership is assigned from the authenticated Clerk identity.
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return personalAiJson({ error: "Connexion requise" }, 401);
  const parsed = await parseRequestJson(request);
  if (!parsed.ok) return personalAiJson({ error: parsed.error }, parsed.status);
  try {
    return personalAiJson({ item: await createPersonalAiDeclaration(access.userId, parsed.value) }, 201);
  } catch (error) {
    if (error instanceof PersonalAiDeclarationInputError) return personalAiJson({ error: error.message }, 400);
    if (error instanceof PersonalAiActivityOverlapError) return personalAiJson({ error: error.message }, 409);
    return personalAiJson({ error: "Enregistrement indisponible" }, 503);
  }
}
