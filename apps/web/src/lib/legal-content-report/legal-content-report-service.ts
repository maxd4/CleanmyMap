import { sendEmail } from "@/lib/services/email";
import { sendCreatorInboxEmail } from "@/lib/community/creator-inbox-email";
import {
  formatLegalContentReportExecutionStatus,
  type LegalContentReportDecisionRecord,
  type LegalContentReportRecord,
} from "./legal-content-report";

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

function decisionLabel(action: LegalContentReportDecisionRecord["action"]): string {
  return (
    {
      reviewing: "mise en examen",
      no_action: "aucune action",
      content_restricted: "contenu restreint",
      content_removed: "contenu retiré",
      closed: "dossier clôturé",
    } satisfies Record<LegalContentReportDecisionRecord["action"], string>
  )[action];
}

function executionSummary(decision: LegalContentReportDecisionRecord): string {
  const status = formatLegalContentReportExecutionStatus(decision.executionStatus);
  return decision.executionErrorCode
    ? `${status} (code : ${decision.executionErrorCode})`
    : status;
}

export async function sendLegalContentReportDecisionToNotifier(params: {
  record: LegalContentReportRecord;
  decision: LegalContentReportDecisionRecord;
  actorUserId: string;
}) {
  if (!params.record.notifierEmail) return null;
  const basis = params.decision.legalBasis
    ? `Fondement légal : ${params.decision.legalBasis}`
    : params.decision.termsBasis
      ? `Fondement contractuel : ${params.decision.termsBasis}`
      : "Aucun fondement de restriction n’a été retenu.";
  return sendEmail({
    to: params.record.notifierEmail,
    subject: `[CleanMyMap] Décision sur votre notification - ${params.record.id}`,
    actorUserId: params.actorUserId,
    meta: { source: "legal_content_report", notification: "decision_notifier" },
    html: `<p>Une décision a été prise concernant votre notification électronique.</p><ul><li><strong>Décision :</strong> ${escapeHtml(decisionLabel(params.decision.action))}</li><li><strong>État d'exécution :</strong> ${escapeHtml(executionSummary(params.decision))}</li><li><strong>Motif :</strong> ${escapeHtml(params.decision.reason)}</li><li><strong>URL concernée :</strong> ${escapeHtml(params.decision.contentUrl)}</li><li><strong>Moyens automatisés :</strong> ${params.decision.automatedMeansUsed ? "oui" : "non"}</li><li><strong>${escapeHtml(basis)}</strong></li></ul><p>Pour demander un réexamen ou exercer vos droits, utilisez le <a href="/contact">formulaire de contact</a> en rappelant l’identifiant ${escapeHtml(params.record.id)}.</p>`,
  });
}

export async function sendLegalContentReportDecisionToAuthor(params: {
  authorEmail: string | null;
  decision: LegalContentReportDecisionRecord;
  allegationReason: string;
  actorUserId: string;
}) {
  if (!params.authorEmail || params.decision.executionStatus !== "applied") return null;
  const basis = params.decision.legalBasis
    ? `Fondement légal : ${params.decision.legalBasis}`
    : params.decision.termsBasis
      ? `Fondement contractuel : ${params.decision.termsBasis}`
      : "Fondement : aucune restriction n’a été retenue.";
  return sendEmail({
    to: params.authorEmail,
    subject: `[CleanMyMap] Décision concernant un contenu - ${params.decision.contentId ?? params.decision.contentUrl}`,
    actorUserId: params.actorUserId,
    meta: { source: "legal_content_report", notification: "decision_author" },
    html: `<p>Une décision administrative concerne un contenu dont vous êtes l’auteur.</p><ul><li><strong>Nature de la mesure :</strong> ${escapeHtml(decisionLabel(params.decision.action))}</li><li><strong>État d'exécution :</strong> ${escapeHtml(executionSummary(params.decision))}</li><li><strong>Faits et circonstances examinés :</strong> ${escapeHtml(params.allegationReason)}</li><li><strong>Motif de la décision :</strong> ${escapeHtml(params.decision.reason)}</li><li><strong>Moyens automatisés :</strong> ${params.decision.automatedMeansUsed ? "oui" : "non"}</li><li><strong>${escapeHtml(basis)}</strong></li><li><strong>Contenu concerné :</strong> ${escapeHtml(params.decision.contentUrl)}${params.decision.contentId ? ` (${escapeHtml(params.decision.contentId)})` : ""}</li></ul><p>Pour demander un réexamen, utilisez le <a href="/contact">formulaire de contact</a> en rappelant l’URL ou l’identifiant du contenu.</p>`,
  });
}
