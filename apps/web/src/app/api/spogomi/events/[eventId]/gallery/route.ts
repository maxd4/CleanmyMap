import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { loadSpogomiGalleryEntries, upsertSpogomiGalleryPhoto, withdrawSpogomiGalleryPhoto } from "@/lib/spogomi/photo-gallery-service";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";

export const runtime = "nodejs";
// Justification Vercel: organizer gallery state and publication permissions are mutable and must be resolved dynamically.
export const dynamic = "force-dynamic";

const photoSchema = z.object({
  id: z.string().trim().min(1).max(120),
  url: z.string().url().refine((value) => value.startsWith("https://") || value.startsWith("http://")),
  alt: z.string().trim().min(1).max(300),
  caption: z.string().trim().max(500).nullable().optional(),
  credit: z.string().trim().max(300).nullable().optional(),
  sourceUrl: z.string().url().refine((value) => value.startsWith("https://") || value.startsWith("http://")),
  ownerName: z.string().trim().min(1).max(200),
  status: z.enum(["draft", "published"]),
  rightsStatus: z.enum(["pending", "authorized"]).nullable().optional(),
  approvedForPublication: z.boolean().optional(),
  subjectProtectionReviewed: z.boolean().optional(),
  minorProtectionReviewed: z.boolean().optional(),
}).strict().superRefine((photo, context) => {
  if (photo.status !== "published") return;
  if (photo.rightsStatus !== "authorized") context.addIssue({ code: "custom", path: ["rightsStatus"], message: "Les droits doivent être explicitement autorisés." });
  if (photo.approvedForPublication !== true) context.addIssue({ code: "custom", path: ["approvedForPublication"], message: "L'autorisation de diffusion est obligatoire." });
  if (photo.subjectProtectionReviewed !== true) context.addIssue({ code: "custom", path: ["subjectProtectionReviewed"], message: "La protection des sujets doit être explicitement revue." });
  if (photo.minorProtectionReviewed !== true) context.addIssue({ code: "custom", path: ["minorProtectionReviewed"], message: "La protection des mineurs doit être explicitement revue." });
});

export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent((await context.params).eventId, access.userId, "Événement SPOGOMI introuvable.");
    if ("response" in authorized) return authorized.response;
    const gallery = await loadSpogomiGalleryEntries({ supabase, actionId: authorized.event.action_id });
    return NextResponse.json({ gallery });
  } catch (error) {
    return handleApiError(error, "spogomi.gallery.read");
  }
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const parsed = photoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse({ body: ["La photo SPOGOMI est invalide ou incomplète."] });
  try {
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent((await context.params).eventId, access.userId, "Événement SPOGOMI introuvable.");
    if ("response" in authorized) return authorized.response;
    const photo = await upsertSpogomiGalleryPhoto({
      supabase,
      actionId: authorized.event.action_id,
      photo: parsed.data,
      actorUserId: access.userId,
    });
    return NextResponse.json({ photo });
  } catch (error) {
    return handleApiError(error, "spogomi.gallery.upsert");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const photoId = new URL(request.url).searchParams.get("photoId")?.trim();
  if (!photoId) return validationErrorResponse({ photoId: ["La référence de la photo est obligatoire."] });
  try {
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent((await context.params).eventId, access.userId, "Événement SPOGOMI introuvable.");
    if ("response" in authorized) return authorized.response;
    const withdrawn = await withdrawSpogomiGalleryPhoto({
      supabase,
      actionId: authorized.event.action_id,
      photoId,
      withdrawnAt: new Date().toISOString(),
    });
    return withdrawn ? NextResponse.json({ status: "withdrawn" }) : NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
  } catch (error) {
    return handleApiError(error, "spogomi.gallery.withdraw");
  }
}
