"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CmmButton } from "@/components/ui/cmm-button";
import { InlineFieldError } from "@/components/ui/inline-field-error";

type DecisionFormProps = {
  actionId: string;
  isCurrentlyActive: boolean;
  qualificationId?: string;
  isEligible: boolean;
};

export function ActionDecisionForm({
  actionId,
  isCurrentlyActive,
  qualificationId,
  isEligible,
}: DecisionFormProps) {
  const router = useRouter();

  // Mode de formulaire : "qualify" ou "revoke"
  const [justificationUrl, setJustificationUrl] = useState("");
  const [qualificationReason, setQualificationReason] = useState("");
  const [revocationReason, setRevocationReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleQualify(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!justificationUrl.startsWith("https://")) {
      setErrorMessage("L'URL justificative doit commencer par https://.");
      return;
    }
    if (qualificationReason.trim().length < 5) {
      setErrorMessage("Le motif de qualification doit comporter au moins 5 caractères.");
      return;
    }
    if (!confirmed) {
      setErrorMessage("Veuillez cocher la confirmation explicite de vérification.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/brigade-verte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "qualify",
          actionId,
          justificationUrl: justificationUrl.trim(),
          qualificationReason: qualificationReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || "Erreur lors de la qualification.");
      } else {
        setSuccessMessage("Action qualifiée avec succès !");
        router.refresh();
      }
    } catch {
      setErrorMessage("Erreur réseau ou indisponibilité serveur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevoke(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!qualificationId) {
      setErrorMessage("Identifiant de qualification manquant.");
      return;
    }
    if (revocationReason.trim().length < 5) {
      setErrorMessage("Le motif de révocation doit comporter au moins 5 caractères.");
      return;
    }
    if (!confirmed) {
      setErrorMessage("Veuillez confirmer la révocation de cette qualification.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/brigade-verte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke",
          qualificationId,
          revocationReason: revocationReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || "Erreur lors de la révocation.");
      } else {
        setSuccessMessage("Qualification révoquée avec succès.");
        router.refresh();
      }
    } catch {
      setErrorMessage("Erreur réseau ou indisponibilité serveur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded text-sm text-rose-800 dark:text-rose-200">
          <InlineFieldError message={errorMessage} />
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded text-sm text-emerald-800 dark:text-emerald-200">
          {successMessage}
        </div>
      )}

      {!isCurrentlyActive ? (
        // Formulaire de Qualification / Requalification
        <form onSubmit={handleQualify} className="space-y-4">
          {!isEligible && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-200">
              ⚠️ Attention : cette action ne satisfait pas actuellement tous les critères d&apos;éligibilité automatique (date passée, phase terminée, publique, visible, approuvée). La qualification échouera côté serveur.
            </div>
          )}

          <div>
            <label htmlFor="justificationUrl" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              URL HTTPS justificative (page Brigade Verte, article, publication officielle)
            </label>
            <input
              type="url"
              id="justificationUrl"
              value={justificationUrl}
              onChange={(e) => setJustificationUrl(e.target.value)}
              placeholder="https://paris.fr/... ou https://brigadeverte.paris/..."
              required
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm"
            />
          </div>

          <div>
            <label htmlFor="qualificationReason" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Motif / contexte de qualification (minimum 5 caractères)
            </label>
            <textarea
              id="qualificationReason"
              value={qualificationReason}
              onChange={(e) => setQualificationReason(e.target.value)}
              placeholder="Ex: Co-organisation confirmée par la convention Brigade Verte Paris du 12/10/2026."
              required
              rows={2}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="confirmQualify"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700"
            />
            <label htmlFor="confirmQualify" className="text-xs text-zinc-700 dark:text-zinc-300">
              Je confirme sous mon rôle IMU max avoir vérifié la co-organisation réelle par Brigade Verte Paris.
            </label>
          </div>

          <CmmButton
            type="submit"
            tone="primary"
            variant="default"
            disabled={isSubmitting || !confirmed || !isEligible}
            loading={isSubmitting}
          >
            {qualificationId ? "Requalifier l'action" : "Qualifier comme Quartier Propre Brigade Verte"}
          </CmmButton>
        </form>
      ) : (
        // Formulaire de Révocation
        <form onSubmit={handleRevoke} className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded text-xs text-rose-800 dark:text-rose-200">
            Cette action est actuellement activement qualifiée. La révocation retirera immédiatement cette action des preuves du parcours pour tous les participants.
          </div>

          <div>
            <label htmlFor="revocationReason" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Motif de révocation motivée (minimum 5 caractères)
            </label>
            <textarea
              id="revocationReason"
              value={revocationReason}
              onChange={(e) => setRevocationReason(e.target.value)}
              placeholder="Ex: Révocation suite à erreur de justificatif ou annulation du partenariat."
              required
              rows={2}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="confirmRevoke"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700"
            />
            <label htmlFor="confirmRevoke" className="text-xs text-rose-700 dark:text-rose-300">
              Je confirme vouloir révoquer cette qualification active.
            </label>
          </div>

          <CmmButton
            type="submit"
            tone="secondary"
            variant="default"
            disabled={isSubmitting || !confirmed}
            loading={isSubmitting}
            className="text-rose-600 hover:text-rose-700 border-rose-300"
          >
            Révoquer la qualification
          </CmmButton>
        </form>
      )}
    </div>
  );
}
