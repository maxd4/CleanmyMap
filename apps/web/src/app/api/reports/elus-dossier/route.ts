import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { parseElusDossierRequest } from "./route-scope";
import { executeDossierExport } from "./route-execution";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(
    request,
    access.userId,
    { limit: 5, window: 60 },
  );
  if (rateLimitResponse) return rateLimitResponse;

  const params = parseElusDossierRequest(new URL(request.url));
  return executeDossierExport(params);
}
