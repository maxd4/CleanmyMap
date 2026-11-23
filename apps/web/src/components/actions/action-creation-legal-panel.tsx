import { FileWarning } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmPill } from "@/components/ui/cmm-pill";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { AdministrativeRequirementsStatus } from "./administrative-requirements-status";
import { ActionFormalitiesWorkflowPanel } from "./action-formalities-workflow-panel";
import type { ActionFormalitiesFacts } from "@/lib/actions/formalities/qualification";
import type { FormalitiesEmailActionData } from "@/lib/actions/formalities/email-draft";

export function ActionCreationLegalPanel({
  actionId,
  draftFacts,
  onDraftFactsChange,
  onReadinessChange,
  actionEmailData,
}: {
  actionId?: string | null;
  draftFacts?: ActionFormalitiesFacts | null;
  onDraftFactsChange?: (facts: ActionFormalitiesFacts) => void;
  onReadinessChange?: (readiness: { known: boolean; blocked: boolean }) => void;
  actionEmailData?: FormalitiesEmailActionData;
}) {
  return (
    <CmmCard tone="amber" variant="glass" size="lg">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50 text-amber-700">
            <FileWarning size={20} aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <CmmPill tone="amber" size="sm">À compléter</CmmPill>
            <h2 className="text-xl font-black tracking-tight text-emerald-950">
              Formalités locales
            </h2>
          </div>
        </div>
        <CmmDisclosure summary="Comment interpréter la qualification" tone="amber" size="sm">
          <div className="space-y-2 text-sm leading-5 text-emerald-950/75">
            <p>Le moteur sélectionne une règle territoriale lorsque les sources officielles le permettent ; sinon, il propose un cadre national à vérifier localement. Il retourne « inconnu » lorsque les preuves ne permettent pas de conclure.</p>
            <p>Aucune procédure n&apos;est envoyée par ce panneau. Une incertitude ne bloque pas automatiquement la publication ; seule une formalité démontrée comme requise peut la conditionner. Une simple cleanwalk sans installation ne vaut pas automatiquement AOT.</p>
          </div>
        </CmmDisclosure>
        <ActionFormalitiesWorkflowPanel actionId={actionId} draftFacts={draftFacts} onDraftFactsChange={onDraftFactsChange} onReadinessChange={onReadinessChange} actionEmailData={actionEmailData} />
        <div className="border-t border-amber-200/70 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800/70">
            État technique de la pré-action
          </p>
          <AdministrativeRequirementsStatus actionId={actionId} surface="formalities" />
        </div>
      </div>
    </CmmCard>
  );
}
