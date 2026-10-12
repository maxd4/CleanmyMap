import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";
import { loadSpogomiGalleryEntries, upsertSpogomiGalleryPhoto, withdrawSpogomiGalleryPhoto } from "@/lib/spogomi/photo-gallery-service";

export const runtime = "nodejs";
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
  approvedAt: z.string().trim().min(1).max(80),
  publishedAt: z.string().trim().max(80).nullable().optional(),
}).strict();

async function authorizedEvent(eventId: string, userId: string) {
  return loadSpogomiEventForOrganizer(getSupabaseServerClient(true), eventId, userId);
}

export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const event = await authorizedEvent((await context.params).eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement SPOGOMI introuvable." }, { status: 404 });
    const gallery = await loadSpogomiGalleryEntries({ supabase: getSupabaseServerClient(true), actionId: event.action_id });
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
    const event = await authorizedEvent((await context.params).eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement SPOGOMI introuvable." }, { status: 404 });
    const photo = await upsertSpogomiGalleryPhoto({
      supabase: getSupabaseServerClient(true),
      actionId: event.action_id,
      photo: parsed.data,
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
    const event = await authorizedEvent((await context.params).eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement SPOGOMI introuvable." }, { status: 404 });
    const withdrawn = await withdrawSpogomiGalleryPhoto({
      supabase: getSupabaseServerClient(true),
      actionId: event.action_id,
      photoId,
      withdrawnAt: new Date().toISOString(),
    });
    return withdrawn ? NextResponse.json({ status: "withdrawn" }) : NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
  } catch (error) {
    return handleApiError(error, "spogomi.gallery.withdraw");
  }
}
