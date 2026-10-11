import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMobileAuthenticatedAccess } from "@/lib/auth/mobile-bearer";
import { sendCreatorInboxEmail } from "@/lib/community/creator-inbox-email";
import { appendContactRequest, updateContactRequestStatus } from "@/lib/contact/contact-requests-store";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { logWarning } from "@/lib/logging/failure-log";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { parseJsonBodyWithSchema } from "@/lib/security/validation";

export const runtime = "nodejs";

const requestSchema = z.object({
  confirmation: z.literal("SUPPRIMER MON COMPTE"),
});

export async function POST(request: Request) {
  const access = await requireMobileAuthenticatedAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 1, window: 86400 });
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = await parseJsonBodyWithSchema(request, requestSchema);
  if (!parsed.ok) return validationErrorResponse({ confirmation: ["Confirmation de suppression invalide."] });

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(access.userId);
    const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: "Une adresse email est requise pour traiter cette demande." }, { status: 422 });
    }

    const created = await appendContactRequest({
      submittedByUserId: access.userId,
      input: {
        submittedByEmail: email.trim().toLowerCase(),
        requestType: "erasure",
        subject: "Demande de suppression du compte depuis l’application mobile",
        message:
          `L'utilisateur Clerk ${access.userId} confirme la demande de suppression complète de son compte et des données associées. ` +
          "Demande enregistrée : la suppression n’est pas automatique et doit être traitée selon le workflow RGPD.",
        pagePath: "/compte/suppression",
      },
    });

    try {
      await sendCreatorInboxEmail({
        actorUserId: access.userId,
        subject: `[CleanMyMap] Demande de suppression ${created.id}`,
        title: "Demande de suppression de compte",
        intro: "Une demande authentifiée de suppression de compte mobile doit être traitée.",
        lines: [
          { label: "Identifiant de demande", value: created.id },
          { label: "Compte Clerk", value: access.userId },
          { label: "Email de suivi", value: email.trim().toLowerCase() },
          { label: "Page d’origine", value: "/compte/suppression" },
        ],
        footer: "La demande est enregistrée dans contact_requests. Aucune suppression automatique n’a été effectuée.",
        replyTo: email.trim().toLowerCase(),
      });
      const updated = await updateContactRequestStatus({ requestId: created.id, status: "sent" });
      return NextResponse.json({
        status: "queued",
        requestId: created.id,
        notificationStatus: "sent",
        deletionProcessed: false,
        message: "Demande enregistrée. La suppression sera traitée séparément.",
        item: updated ?? created,
      }, { status: 201 });
    } catch (notificationError) {
      const message = notificationError instanceof Error ? notificationError.message : String(notificationError);
      await updateContactRequestStatus({
        requestId: created.id,
        status: "failed",
        notificationError: message,
      }).catch(() => undefined);
      logWarning("Account deletion", "Notification failed", { requestId: created.id, reason: message });
      return NextResponse.json({
        status: "queued",
        requestId: created.id,
        notificationStatus: "failed",
        deletionProcessed: false,
        message: "Demande enregistrée, mais la notification a échoué et nécessite un traitement manuel.",
        item: created,
      }, { status: 201 });
    }
  } catch (error) {
    return handleApiError(error, "POST /api/mobile/account/deletion-request");
  }
}
