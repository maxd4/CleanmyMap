import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { issueSpogomiVolunteerCertificate } from "@/lib/spogomi/volunteer";

export const runtime = "nodejs";
const inputSchema = z.object({ eventId: z.string().uuid() }).strict();

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();
  try {
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Événement SPOGOMI invalide." }, { status: 400 });
    const certificate = await issueSpogomiVolunteerCertificate(getSupabaseServerClient(true), userId, parsed.data.eventId);
    // Justification no-store: issued certificate state is private and must not be shared from cache.
    return NextResponse.json(
      { status: "ok", certificate: { certificateReference: certificate.certificateReference, eventId: certificate.eventId, issuedAt: certificate.issuedAt } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "POST /api/spogomi/certificates");
  }
}
