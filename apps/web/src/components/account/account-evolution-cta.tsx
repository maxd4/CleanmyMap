import { ArrowUpRight, Sparkles } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { ACCOUNT_EVOLUTION_ROUTE } from "@/lib/accueil-pilotage-routes";

export function AccountEvolutionCta() {
  return (
    <CmmCard tone="amber" variant="muted" className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
        <div>
          <h3 className="font-bold text-white">Faire évoluer mon compte</h3>
          <p className="mt-1 text-sm text-amber-50/72">
            Consultez votre niveau et votre demande depuis la page dédiée.
          </p>
        </div>
      </div>
      <CmmButton href={ACCOUNT_EVOLUTION_ROUTE} tone="primary" variant="pill" className="shrink-0">
        Ouvrir l&apos;évolution
        <ArrowUpRight className="ml-2 inline h-4 w-4" aria-hidden="true" />
      </CmmButton>
    </CmmCard>
  );
}
