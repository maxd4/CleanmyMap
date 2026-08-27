import { sendEmail } from "@/lib/services/email";
import { sendCreatorInboxEmail } from "@/lib/community/creator-inbox-email";
import type { LegalContentReportRecord } from "./legal-content-report";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] ?? character,
  );
}

function reportLines(record: LegalContentReportRecord) {
  return [
    { label: "Identifiant de suivi", value: record.id },
    { label: "URL du contenu", value: record.contentUrl },
    { label: "Type de contenu", value: record.contentType ?? "non communiqué" },
    { label: "Identifiant technique", value: record.contentId ?? "non communiqué" },
    { label: "Déclarant", value: record.notifierName ?? "non identifié" },
    { label: "Email", value: record.notifierEmail ?? "non communiqué" },
    { label: "Exception d'identité", value: record.identityExceptionReason ? "invoquée" : "non" },
    { label: "Motif circonstancié", value: record.allegationReason },
    { label: "Bonne foi confirmée", value: "oui" },
  ];
}

export async function sendLegalContentReportAcknowledgement(
  record: LegalContentReportRecord,
) {
  if (!record.notifierEmail) {
    return null;
  }
  const lines = reportLines(record)
    .filter(({ label }) => label !== "Motif circonstancié")
    .map(({ label, value }) => `<li><strong>${escapeHtml(label)} :</strong> ${escapeHtml(value)}</li>`)
    .join("");
  return sendEmail({
    to: record.notifierEmail,
    subject: `[CleanMyMap] Notification de contenu reçue - ${record.id}`,
    actorUserId: record.submittedByUserId,
    meta: { source: "legal_content_report", notification: "acknowledgement" },
    html: `<p>Votre notification électronique a été reçue.</p><p>Elle sera examinée à partir des informations transmises. Vous n'avez pas à qualifier juridiquement les faits dans votre notification.</p><ul>${lines}</ul>`,
  });
}

export async function sendLegalContentReportCreatorNotification(
  record: LegalContentReportRecord,
) {
  return sendCreatorInboxEmail({
    actorUserId: record.submittedByUserId,
    replyTo: record.notifierEmail ?? undefined,
    subject: `[CleanMyMap] Notification de contenu - ${record.id}`,
    title: "Nouvelle notification de contenu illicite",
    intro: "Une notification électronique est disponible dans la file créateur.",
    lines: reportLines(record),
    footer: "Le signalement est conservé dans un domaine dédié et n'est pas exposé publiquement.",
  });
}
