"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  fetchActionById,
  validateActionAdministrativeRequirements,
  type ActionEditorRecord,
} from "@/lib/actions/http";
import { normalizeAdministrativeRequirements } from "@/lib/actions/administrative-requirements";

type AdministrativeRequirementsStatusProps = {
  actionId: string | null | undefined;
  initialAction?: ActionEditorRecord | null;
  surface: "summary" | "formalities";
};

export function AdministrativeRequirementsStatus({
  actionId,
  initialAction = null,
  surface,
}: AdministrativeRequirementsStatusProps) {
  const [action, setAction] = useState<ActionEditorRecord | null>(initialAction);
  const [isLoading, setIsLoading] = useState(!initialAction && Boolean(actionId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!actionId || initialAction) {
      return;
    }

    let active = true;
    fetchActionById(actionId)
      .then((nextAction) => {
        if (active) setAction(nextAction);
      })
      .catch(() => {
        if (active) setError("Impossible de charger l'état des démarches administratives.");
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

  const requirements = normalizeAdministrativeRequirements(
    action?.preparationData?.administrativeRequirements,
  );
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

  const canValidate = Boolean(action?.canValidateAdministrativeRequirements);
  return (
    <div className="space-y-2" data-testid="administrative-requirements-pending">
      <p className="text-sm font-semibold text-amber-900">Démarches administratives non validées</p>
      {canValidate && surface === "summary" ? (
        <CmmButton
          href={`/actions/new?actionId=${encodeURIComponent(actionId)}&panel=formalites`}
          tone="important"
          variant="pill"
          size="sm"
        >
          Démarches administratives
        </CmmButton>
      ) : null}
      {canValidate && surface === "formalities" ? (
        <CmmButton
          tone="important"
          variant="pill"
          size="md"
          disabled={isSubmitting}
          onClick={() => {
            setIsSubmitting(true);
            setError(null);
            void validateActionAdministrativeRequirements(actionId)
              .then((result) => {
                setAction((current) =>
                  current
                    ? {
                        ...current,
                        preparationData: {
                          ...(current.preparationData ?? {}),
                          administrativeRequirements: {
                            status: "validated",
                            validatedAt: result.administrativeRequirements.validatedAt,
                          },
                        },
                      }
                    : current,
                );
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
