import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { buildSpogomiVolunteerSourceFingerprint, loadSpogomiVolunteerEventForUser, resolveSpogomiVolunteerContributionStatus } from "@/lib/spogomi/volunteer";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();
  try {
    const supabase = getSupabaseServerClient(true);
    const eventId = (await context.params).eventId;
    const event = await loadSpogomiVolunteerEventForUser(supabase, userId, eventId);
    if (!event) return NextResponse.json({ status: "identity_unlinked" }, { headers: { "Cache-Control": "private, no-store" } });
    const certificatesResult = await supabase.from("spogomi_volunteer_certificates")
      .select("certificate_reference, status, source_fingerprint, issued_at, revoked_at").eq("user_id", userId).eq("event_id", eventId).order("issued_at", { ascending: false });
    if (certificatesResult.error) throw certificatesResult.error;
    const latestCertificate = certificatesResult.data?.[0] ?? null;
    const certifiedMissions = event.missions.filter((mission) => mission.status === "certified" && mission.evidenceReference.trim().length > 0);
    const currentFingerprint = certifiedMissions.length ? buildSpogomiVolunteerSourceFingerprint(event, certifiedMissions) : null;
    const status = resolveSpogomiVolunteerContributionStatus({ event, certifiedMissions, currentFingerprint, latestCertificate });
    return NextResponse.json({ status, event: { eventName: event.eventName, eventDate: event.eventDate, locationLabel: event.locationLabel, missions: certifiedMissions }, certificate: latestCertificate }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "GET /api/spogomi/events/:eventId/contributions");
  }
}
