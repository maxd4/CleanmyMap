import { FileWarning } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmPill } from "@/components/ui/cmm-pill";
import { AdministrativeRequirementsStatus } from "./administrative-requirements-status";
import { ActionFormalitiesWorkflowPanel } from "./action-formalities-workflow-panel";

export function ActionCreationLegalPanel({ actionId }: { actionId?: string | null }) {
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
              Formalités & autorisations locales
            </h2>
          </div>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-emerald-950/75">
          Le moteur de qualification distingue désormais les formalités
          parisiennes selon le lieu, le gestionnaire et la forme de l&apos;action.
          Il reste explicable et retourne « inconnu » lorsque les faits ou la
          source officielle ne permettent pas de conclure.
        </p>
        <p className="max-w-3xl text-xs leading-5 text-emerald-900/65">
          Aucune procédure n&apos;est envoyée ou bloquée par ce panneau. Une simple
          cleanwalk sans installation ne vaut pas automatiquement AOT ; la
          Ville de Paris n&apos;est pas supposée compétente pour tous les lieux.
        </p>
        <ActionFormalitiesWorkflowPanel actionId={actionId} />
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
