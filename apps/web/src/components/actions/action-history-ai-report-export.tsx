"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";

export function ActionHistoryAiReportExport({ actionId }: { actionId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/reports/ai-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { type: "single_action", actionId },
          detailLevel: "default",
          modules: {
            dataAndCartography: true,
            transparencyAndMethods: true,
            rawData: false,
            detailedFiles: true,
          },
          theme: "impact",
        }),
      });
      if (!response.ok) {
        setError(response.status === 413
          ? "Le fichier dépasse la taille maximale et n’a pas été tronqué."
          : response.status === 429
            ? "Trop de demandes. Réessayez dans un instant."
            : "Le brief Markdown n’a pas pu être généré.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "cleanmymap-rapport-ia.md";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Le brief Markdown n’a pas pu être généré.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <CmmButton onClick={download} disabled={loading} loading={loading} tone="primary" variant="pill" className="mt-3 min-h-11">
        Télécharger le brief Markdown pour IA
      </CmmButton>
      {error ? <p role="alert" className="mt-2 cmm-text-small text-red-800">{error}</p> : null}
    </div>
  );
}
