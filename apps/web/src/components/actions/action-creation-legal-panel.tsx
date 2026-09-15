import { FileWarning } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmPill } from "@/components/ui/cmm-pill";

export function ActionCreationLegalPanel() {
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
              Formalités juridiques
            </h2>
          </div>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-emerald-950/75">
          Le contenu juridique fiable de ce panneau reste à documenter à partir
          de sources officielles applicables au lieu et au type d&apos;action.
        </p>
        <p className="max-w-3xl text-xs leading-5 text-emerald-900/65">
          Aucun avis sur une obligation légale, une assurance, une autorisation
          municipale ou une responsabilité n&apos;est déduit par cette page.
        </p>
      </div>
    </CmmCard>
  );
}
