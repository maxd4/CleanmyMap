export function buildContactMailtoHref(params: {
  to: string;
  requestTypeLabel: string;
  email: string;
  message: string;
  dateLabel?: string;
}): string {
  const subject = `Demande RGPD - ${params.requestTypeLabel}`;
  const bodyParts = [
    `Type de demande: ${params.requestTypeLabel}`,
    "",
    `Email: ${params.email}`,
    "",
    "Message:",
    params.message,
    "",
    "---",
    "Ce message a été préparé depuis le formulaire Contact de CleanMyMap.",
    `Date: ${params.dateLabel ?? new Date().toLocaleString("fr-FR")}`,
  ];

  return `mailto:${params.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    bodyParts.join("\n"),
  )}`;
}
