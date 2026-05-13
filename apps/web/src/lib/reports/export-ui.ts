export type ExportUiFormat = "csv" | "pdf" | "json";

export function buildExportUiCopy(params: {
  format: ExportUiFormat;
  subject: string;
}) {
  const formatLabel = params.format.toUpperCase();
  const subject = params.subject.trim();
  const lowerSubject = subject ? subject.charAt(0).toLowerCase() + subject.slice(1) : "";

  return {
    triggerLabel: `Exporter ${formatLabel}`,
    pendingLabel: `Preparation ${formatLabel}...`,
    successMessage: subject ? `${subject} ${formatLabel} genere.` : `Export ${formatLabel} genere.`,
    errorMessage: subject
      ? `Impossible de generer l'export ${formatLabel} ${lowerSubject}. Verifiez les donnees puis reessayez.`
      : `Impossible de generer l'export ${formatLabel}. Verifiez les donnees puis reessayez.`,
  };
}
