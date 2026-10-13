import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { buildPdfReportLines, buildSimplePdf } from "@/lib/pdf-export/simple-pdf";
import { buildSpogomiVolunteerSourceFingerprint, loadSpogomiCertificateForUser, loadSpogomiVolunteerEventForUser, revokeSpogomiVolunteerCertificate } from "@/lib/spogomi/volunteer";

export const runtime = "nodejs";

function identityLabel(user: Awaited<ReturnType<typeof currentUser>>): string {
  if (!user) return "Membre CleanMyMap";
  return [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(" ") || user.username?.trim() || "Membre CleanMyMap";
}

export async function GET(_request: Request, context: { params: Promise<{ certificateReference: string }> }) {
  const { userId } = await auth();
  if (!userId) return unauthorizedJsonResponse();
  try {
    const reference = (await context.params).certificateReference;
    const supabase = getSupabaseServerClient(true);
    const certificate = await loadSpogomiCertificateForUser(supabase, userId, reference);
    if (!certificate) return NextResponse.json({ error: "Attestation introuvable." }, { status: 404 });
    if (certificate.status !== "active") return NextResponse.json({ status: "revoked", error: "Cette attestation n’est plus valide." }, { status: 410 });

    const currentEvent = await loadSpogomiVolunteerEventForUser(supabase, userId, certificate.eventId);
    const currentMissions = currentEvent?.missions.filter((mission) => mission.status === "certified" && mission.evidenceReference.trim().length > 0) ?? [];
    const currentFingerprint = currentEvent ? buildSpogomiVolunteerSourceFingerprint(currentEvent, currentMissions) : null;
    if (!currentEvent || currentEvent.eventState !== "certified" || !currentEvent.identityVerified || currentEvent.attendanceStatus !== "present" || !currentEvent.actionParticipationConfirmed || !currentMissions.length || !currentFingerprint || currentFingerprint !== certificate.sourceFingerprint) {
      await revokeSpogomiVolunteerCertificate(supabase, userId, certificate.eventId, "La source certifiée a été corrigée ou révoquée.");
      return NextResponse.json({ status: "revoked", error: "Cette attestation n’est plus valide." }, { status: 410 });
    }

    const user = await currentUser();
    const event = currentEvent;
    const missionLines = currentMissions.map((mission) => `${mission.kind} · certification ${mission.certificationVersion}`);
    const payload = {
      title: "Attestation de participation bénévole — CleanMyMap / SPOGOMI",
      rubrique: "SPOGOMI",
      periode: event.eventDate,
      organizationType: "CleanMyMap / SPOGOMI",
      organizationName: "CleanMyMap",
      data: {
        summary: [
          `Identité : ${identityLabel(user)}`,
          `Événement officiel : ${event.eventName}`,
          `Date : ${event.eventDate}`,
          `Lieu : ${event.locationLabel}`,
          `Mission(s) bénévole(s) certifiée(s) : ${missionLines.join(", ")}`,
          `Base de certification : attestations SPOGOMI versionnées (${currentMissions.map((mission) => mission.id).join(", ")}).`,
          `Référence unique : ${certificate.certificateReference}`,
          "Document émis par CleanMyMap à partir des contributions enregistrées et validées.",
          "Cette attestation ne constitue pas une validation fédérale, administrative ou une co-signature SPOGOMI France.",
        ] as string[],
        generatedAt: new Date().toISOString(),
      },
    };
    const bytes = buildSimplePdf(buildPdfReportLines(payload));
    return new NextResponse(bytes as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="attestation-spogomi-${certificate.certificateReference}.pdf"`,
        // Justification no-store: certificate validity can change after its source certification is corrected or revoked.
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error, "GET /api/spogomi/certificates/:certificateReference");
  }
}
