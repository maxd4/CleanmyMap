import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { organizationCommandSchema } from "@/lib/organizations/contracts";
import { listOrganizations, readOrganization, mutateOrganization, OrganizationServiceError } from "@/lib/organizations/service";

export const runtime = "nodejs";
// Private organization projections are never eligible for a shared cache.
export const dynamic = "force-dynamic";
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
function unavailable(error: unknown) {
  const status = error instanceof OrganizationServiceError ? error.status : 503;
  return json({ error: status === 403 ? "Périmètre indisponible." : status === 409 ? "Demande invalide ou état modifié." : "Service temporairement indisponible." }, status);
}
const query = z.object({ organizationId: z.string().uuid().optional(), offset: z.coerce.number().int().min(0).max(10000).default(0) });
export async function GET(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return json({ error: "Connexion requise." }, 401);
  const rate = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 30, window: 60 });
  if (rate) { rate.headers.set("Cache-Control", "private, no-store"); return rate; }
  const params = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!params.success) return json({ error: "Paramètres invalides." }, 400);
  try {
    return params.data.organizationId
      ? json({ workspace: await readOrganization(access.userId, params.data.organizationId, params.data.offset) })
      : json({ memberships: await listOrganizations(access.userId) });
  } catch (error) { return unavailable(error); }
}
export async function POST(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return json({ error: "Connexion requise." }, 401);
  const rate = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 10, window: 60 });
  if (rate) { rate.headers.set("Cache-Control", "private, no-store"); return rate; }
  const command = organizationCommandSchema.safeParse(await request.json().catch(() => null));
  if (!command.success) return json({ error: "Paramètres invalides." }, 400);
  try { await mutateOrganization(access.userId, command.data); return json({ ok: true }); }
  catch (error) { return unavailable(error); }
}
