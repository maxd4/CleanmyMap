import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireAuthenticatedAccess } from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, parseJsonBodyWithValidation, validationErrorResponse } from "@/lib/http/api-errors";
import { adminAccessErrorJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { isOrganizerType } from "@/lib/actions/organizer-type";
import {
  createActionOrganizer,
  normalizeOrganizerName,
  searchOrganizerDirectory,
} from "@/lib/actions/organizer-directory-registry";

export const runtime = "nodejs";
// force-dynamic: authenticated directory suggestions must not be cached across users.
export const dynamic = "force-dynamic";

const createOrganizerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom de la structure est requis.")
    .max(120, "Le nom de la structure est trop long.")
    .refine((value) => normalizeOrganizerName(value).length > 0, "Le nom de la structure doit contenir des caractères lisibles."),
  organizerType: z.enum(["company", "association", "student_association", "collective", "other"]),
}).strict();

export async function GET(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const query = url.searchParams.get("q") ?? "";
  if (!isOrganizerType(type) || type === "spontaneous") {
    return validationErrorResponse({ type: ["Type d'organisateur invalide."] });
  }
  if (query.length > 120) {
    return validationErrorResponse({ q: ["La recherche est trop longue."] });
  }

  try {
    const items = await searchOrganizerDirectory({
      supabase: getSupabaseServerClient(true),
      organizerType: type,
      query,
    });
    return NextResponse.json({ status: "ok", items });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/organizers");
  }
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (!access.ok) return adminAccessErrorJsonResponse(access);

  const parsed = await parseJsonBodyWithValidation(request, createOrganizerSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const resolved = await createActionOrganizer({
      supabase: getSupabaseServerClient(true),
      organizerType: parsed.data.organizerType,
      organizerName: parsed.data.name,
      createdByClerkId: access.userId,
    });

    return NextResponse.json({
      status: "ok",
      organizer: {
        id: resolved.organizerId,
        name: resolved.organizerName,
        organizerType: parsed.data.organizerType,
      },
    });
  } catch (error) {
    return handleApiError(error, "POST /api/actions/organizers");
  }
}
