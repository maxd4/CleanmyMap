import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { rejectPublicFormAbuse } from "@/lib/security/validation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  createSpogomiVolunteerHelpProposal,
  listSpogomiVolunteerHelpProposalsForRequester,
  SpogomiVolunteerHelpProposalError,
  transitionSpogomiVolunteerHelpProposal,
} from "@/lib/spogomi/volunteer-help-proposals";

export const runtime = "nodejs";
// Justification force-dynamic: authenticated requester projections are private and user-scoped.
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ eventId: z.string().uuid() });
const emailSchema = z.union([z.literal(""), z.string().trim().email().max(254)]).default("");
const phoneSchema = z.union([z.literal(""), z.string().trim().regex(/^\+?[0-9][0-9 .()\-]{6,38}$/)]).default("");
const proposalSchema = z.object({
  idempotencyKey: z.string().trim().min(16).max(160),
  contactFirstName: z.string().trim().min(1).max(80),
  contactLastName: z.string().trim().min(1).max(80),
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  helpType: z.string().trim().min(1).max(120),
  motivation: z.string().trim().min(10).max(4000),
  usefulSkills: z.string().trim().min(1).max(2000),
  cleanwalkExperience: z.string().trim().max(3000).default(""),
  honeypot: z.string().optional(),
  submittedAt: z.number().finite().optional(),
}).superRefine((value, context) => {
  const email = value.contactEmail.trim();
  const phone = value.contactPhone.trim();
  if (!email && !phone) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["contactEmail"], message: "Indiquez un e-mail ou un téléphone valide." });
  }
  if (phone && phone.replace(/\D/g, "").length < 7) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["contactPhone"], message: "Le téléphone doit contenir au moins 7 chiffres." });
  }
});
const withdrawSchema = z.object({ proposalId: z.string().uuid() });

function errorResponse(error: unknown) {
  if (error instanceof SpogomiVolunteerHelpProposalError) {
    const status = error.kind === "unavailable" ? 404 : error.kind === "conflict" ? 409 : error.kind === "forbidden" ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  return handleApiError(error, "spogomi.volunteer-help-proposals");
}
async function authenticate(request: Request, limit: number, window: number) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return { response: unauthorizedJsonResponse() } as const;
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit, window });
  if (rateLimited) return { response: rateLimited } as const;
  return { access } as const;
}

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const authentication = await authenticate(request, 20, 60);
  if ("response" in authentication) return authentication.response;
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return validationErrorResponse({ params: ["Événement invalide."] });
  try {
    const proposals = await listSpogomiVolunteerHelpProposalsForRequester(getSupabaseServerClient(true), { eventId: parsed.data.eventId, requesterClerkId: authentication.access.userId });
    // Justification no-store: the requester projection is private account data.
    return NextResponse.json({ status: "ok", proposals }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const authentication = await authenticate(request, 3, 300);
  if ("response" in authentication) return authentication.response;
  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) return validationErrorResponse({ params: ["Événement invalide."] });
  const payload = await request.json().catch(() => null);
  const abuse = rejectPublicFormAbuse(payload && typeof payload === "object" ? payload as { honeypot?: unknown; submittedAt?: unknown } : {});
  if (abuse) return abuse;
  const body = proposalSchema.safeParse(payload);
  if (!body.success) return validationErrorResponse(body.error.flatten().fieldErrors);
  try {
    const proposal = await createSpogomiVolunteerHelpProposal({
      supabase: getSupabaseServerClient(true),
      eventId: parsedParams.data.eventId,
      requesterClerkId: authentication.access.userId,
      clientRequestId: body.data.idempotencyKey,
      contactFirstName: body.data.contactFirstName,
      contactLastName: body.data.contactLastName,
      contactEmail: body.data.contactEmail || null,
      contactPhone: body.data.contactPhone || null,
      helpType: body.data.helpType,
      motivation: body.data.motivation,
      usefulSkills: body.data.usefulSkills,
      cleanwalkExperience: body.data.cleanwalkExperience,
    });
    // Justification no-store: contact details and motivations must not be cached by a shared intermediary.
    return NextResponse.json({ status: "ok", proposal }, { status: proposal.status === "pending" ? 201 : 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const authentication = await authenticate(request, 8, 60);
  if ("response" in authentication) return authentication.response;
  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) return validationErrorResponse({ params: ["Événement invalide."] });
  const body = withdrawSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return validationErrorResponse(body.error.flatten().fieldErrors);
  try {
    const proposal = await transitionSpogomiVolunteerHelpProposal({
      supabase: getSupabaseServerClient(true),
      proposalId: body.data.proposalId,
      eventId: parsedParams.data.eventId,
      targetStatus: "withdrawn",
      actorClerkId: authentication.access.userId,
    });
    // Justification no-store: the withdrawal response is an account-owned private projection.
    return NextResponse.json({ status: "ok", proposal }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
