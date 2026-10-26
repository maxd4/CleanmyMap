import { z } from "zod";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { validationErrorResponse } from "@/lib/http/api-errors";

export async function requireAccountPatchBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  getAccess: (request: Request) => Promise<
    | { ok: true; userId: string }
    | { ok: false; status: number; error?: string }
  >,
  enforceRateLimit: (request: Request, userId: string, options: { limit: number; window: number }) => Promise<Response | null>,
): Promise<{ userId: string; data: T } | Response> {
  const access = await getAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  const rateLimitResponse = await enforceRateLimit(
    request,
    access.userId,
    { limit: 12, window: 60 },
  );
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return validationErrorResponse(
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    );
  }
  return { userId: access.userId, data: parsed.data };
}
