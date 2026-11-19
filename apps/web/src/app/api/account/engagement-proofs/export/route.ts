import { NextResponse } from "next/server";
import { z } from "zod";

import { renderEngagementDossierMarkdown } from "@/lib/actions/engagement-dossier-markdown";
import { loadPersonalEngagementProofProjection } from "@/lib/actions/engagement-proof-projection";
import { ACCOUNT_PRIVATE_RESPONSE_HEADERS } from "@/lib/auth/account-mutation";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Justification Vercel: personal volunteer dossier export is owner-scoped and regenerated live from canonical proofs; no-store prevents shared-cache disclosure.
export const dynamic = "force-dynamic";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

const exportSchema = z
  .object({
    holderName: z.string().trim().max(120).nullable().optional(),
    periodStart: z
      .string()
      .trim()
      .regex(isoDateRegex, "Date de début invalide (format AAAA-MM-JJ attendu).")
      .nullable()
      .optional(),
    periodEnd: z
      .string()
      .trim()
      .regex(isoDateRegex, "Date de fin invalide (format AAAA-MM-JJ attendu).")
      .nullable()
      .optional(),
    selectedActionIds: z.array(z.string().trim().min(1).max(120)).max(10_000).nullable().optional(),
    personalPresentation: z
      .object({
        motivations: z.string().trim().max(2000).nullable().optional(),
        perceivedSkills: z.string().trim().max(2000).nullable().optional(),
        observations: z.string().trim().max(2000).nullable().optional(),
      })
      .strict()
      .nullable()
      .optional(),
    complementaryDocuments: z
      .object({
        attestationReferences: z.string().trim().max(1000).nullable().optional(),
        publicLinks: z.string().trim().max(1000).nullable().optional(),
        otherDocuments: z.string().trim().max(1000).nullable().optional(),
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict();

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: ACCOUNT_PRIVATE_RESPONSE_HEADERS,
  });
}

export async function POST(request: Request) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  const requestedUserId = new URL(request.url).searchParams.get("userId")?.trim();
  if (requestedUserId && requestedUserId !== access.userId) {
    return noStoreJson(
      {
        status: "error",
        error: "L’export du dossier d’engagement est strictement limité au titulaire du compte.",
      },
      403,
    );
  }

  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(
    request,
    access.userId,
    { limit: 20, window: 60 },
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = exportSchema.safeParse(rawBody);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  if (
    parsed.data.periodStart &&
    parsed.data.periodEnd &&
    parsed.data.periodStart > parsed.data.periodEnd
  ) {
    return validationErrorResponse({
      periodEnd: ["La date de fin doit être postérieure ou égale à la date de début."],
    });
  }

  try {
    const supabase = getSupabaseServerClient(true);
    const projection = await loadPersonalEngagementProofProjection(supabase, access.userId);
    if (projection.status === "error") {
      return noStoreJson(
        {
          status: "error",
          error: "Les preuves d’engagement sont temporairement indisponibles.",
          reason: projection.errorReason,
        },
        503,
      );
    }

    const markdown = renderEngagementDossierMarkdown({
      projection,
      input: parsed.data,
    });
    const dateStamp = projection.generatedAt.slice(0, 10);

    return new Response(markdown, {
      status: 200,
      headers: {
        ...ACCOUNT_PRIVATE_RESPONSE_HEADERS,
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="dossier-benevolat-${dateStamp}.md"`,
      },
    });
  } catch (error) {
    return handleApiError(error, "POST /api/account/engagement-proofs/export");
  }
}
