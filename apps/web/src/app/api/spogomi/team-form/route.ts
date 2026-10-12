import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { enforceServerRateLimit } from "@/lib/rate-limit/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiTeamResultForm, saveSpogomiTeamSubmission } from "@/lib/spogomi/result-service";
import { SPOGOMI_TEAM_SESSION_COOKIE } from "@/lib/spogomi/team-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const nullableNumber = z.number().finite().nonnegative().max(1_000_000_000_000).nullable();
const itemSchema = z.object({
  categoryRuleId: z.string().uuid(),
  measurementKind: z.enum(["mass", "count", "volume"]),
  unit: z.string().trim().min(1).max(40),
  quantity: nullableNumber,
  massGrams: z.number().finite().nonnegative().max(1_000_000_000).nullable(),
  objectCount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
  measurementMethod: z.string().trim().max(200).nullable(),
  provenance: z.string().max(400),
  arbitrationComment: z.string().trim().max(2000).nullable(),
}).strict();

const submissionSchema = z.object({
  submissionId: z.string().uuid().nullable(),
  idempotencyKey: z.string().min(16).max(160),
  status: z.enum(["draft", "submitted"]),
  correctionReason: z.string().trim().max(1000).nullable(),
  items: z.array(itemSchema).max(200),
}).strict();

async function getSessionToken() {
  return (await cookies()).get(SPOGOMI_TEAM_SESSION_COOKIE)?.value ?? null;
}

export async function GET(request: Request) {
  const rateLimitResponse = await enforceServerRateLimit(request, { limit: 60, window: 60 });
  if (rateLimitResponse) return rateLimitResponse;
  try {
    const form = await loadSpogomiTeamResultForm({ supabase: getSupabaseServerClient(true), sessionToken: await getSessionToken() });
    if (!form) return NextResponse.json({ error: "Session d’équipe expirée ou révoquée." }, { status: 401 });
    return NextResponse.json(form, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    return handleApiError(error, "spogomi.team-form.read");
  }
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceServerRateLimit(request, { limit: 20, window: 60 });
  if (rateLimitResponse) return rateLimitResponse;
  const body = await request.json().catch(() => null);
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse({ body: ["Les mesures saisies sont invalides."] });
  try {
    const result = await saveSpogomiTeamSubmission({
      supabase: getSupabaseServerClient(true),
      sessionToken: await getSessionToken(),
      input: parsed.data,
    });
    return NextResponse.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "spogomi.team-form.save");
  }
}
