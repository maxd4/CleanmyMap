import { Sparkles } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import type { AppProfile } from "@/lib/profiles";
import { getProfileLabel } from "@/lib/profiles";
import { AccountEvolutionStatusLink } from "./account-evolution-status-link";

type AccountEvolutionCtaProps = {
  currentRole?: AppProfile;
  pendingInitially?: boolean;
};

export function AccountEvolutionCta({
  currentRole,
  pendingInitially = false,
}: AccountEvolutionCtaProps) {
  return (
    <CmmCard tone="amber" variant="muted" className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
        <div>
          <h3 className="font-bold text-white">Faire évoluer mon compte</h3>
          <p className="mt-1 text-sm text-amber-50/72">
            Consultez votre niveau et votre demande depuis la page dédiée.
          </p>
          {currentRole ? (
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-100/70">
              Niveau actuel : {getProfileLabel(currentRole, "fr")}
            </p>
          ) : null}
        </div>
      </div>
      <AccountEvolutionStatusLink
        label="Évolution du compte"
        pendingLabel="Voir ma demande"
        pendingInitially={pendingInitially}
        className="shrink-0 border-amber-200/40 bg-amber-100/18 text-white hover:bg-amber-100/26"
      />
    </CmmCard>
  );
}
