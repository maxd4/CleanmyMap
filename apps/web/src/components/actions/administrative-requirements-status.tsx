"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  fetchActionAdministrativeRequirements,
  validateActionAdministrativeRequirements,
  type ActionEditorRecord,
} from "@/lib/actions/http";
import { normalizeAdministrativeRequirements } from "@/lib/actions/administrative-requirements";

type AdministrativeRequirementsStatusProps = {
  actionId: string | null | undefined;
  initialAction?: ActionEditorRecord | null;
  surface: "summary" | "formalities";
  initialCanValidate?: boolean;
};

export function AdministrativeRequirementsStatus({
  actionId,
  initialAction = null,
  surface,
  initialCanValidate = false,
}: AdministrativeRequirementsStatusProps) {
  const [requirements, setRequirements] = useState(() =>
    initialAction
      ? {
          ...normalizeAdministrativeRequirements(
            initialAction.preparationData?.administrativeRequirements,
          ),
          canValidate: initialCanValidate,
        }
      : null,
  );
  const [isLoading, setIsLoading] = useState(!initialAction && Boolean(actionId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!actionId) {
      return;
    }

    let active = true;
    fetchActionAdministrativeRequirements(actionId)
      .then((nextRequirements) => {
        if (active) setRequirements(nextRequirements);
      })
      .catch(() => {
        if (active && !initialAction) {
          setError("Impossible de charger l'état des démarches administratives.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [actionId, initialAction]);

  if (!actionId || isLoading) {
    return null;
  }

  if (error) {
    return <p className="text-xs text-rose-700">{error}</p>;
  }

  if (!requirements) {
    return null;
  }

  if (requirements.status === "validated") {
    return (
      <p
        className="flex items-center gap-2 text-sm font-semibold text-emerald-800"
        data-testid="administrative-requirements-validated"
      >
        <Check size={16} aria-hidden="true" />
        Démarches administratives validées
        {requirements.validatedAt ? (
          <time dateTime={requirements.validatedAt} className="text-xs font-normal text-emerald-900/60">
            ({new Date(requirements.validatedAt).toLocaleDateString("fr-FR")})
          </time>
        ) : null}
      </p>
    );
  }

  const canValidate = requirements.canValidate;
  return (
    <div className="space-y-2" data-testid="administrative-requirements-pending">
      <p className="text-sm font-semibold text-amber-900">Démarches administratives non validées</p>
      {canValidate && surface === "summary" ? (
        <CmmButton
          href={`/actions/new?actionId=${encodeURIComponent(actionId)}&panel=formalites`}
          tone="critical"
          variant="pill"
          size="sm"
        >
          Démarches administratives
        </CmmButton>
      ) : null}
      {canValidate && surface === "formalities" ? (
        <CmmButton
          tone="critical"
          variant="pill"
          size="md"
          disabled={isSubmitting}
          onClick={() => {
            setIsSubmitting(true);
            setError(null);
            void validateActionAdministrativeRequirements(actionId)
              .then((result) => {
                setRequirements({
                  status: "validated",
                  validatedAt: result.administrativeRequirements.validatedAt,
                  canValidate: true,
                });
              })
              .catch((validationError: unknown) => {
                setError(
                  validationError instanceof Error
                    ? validationError.message
                    : "Impossible de valider les démarches administratives.",
                );
              })
              .finally(() => setIsSubmitting(false));
          }}
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
          Démarches administratives terminées
        </CmmButton>
      ) : null}
    </div>
  );
}
