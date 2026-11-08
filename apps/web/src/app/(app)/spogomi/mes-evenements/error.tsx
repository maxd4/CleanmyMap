"use client";

import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { PageHeader } from "@/components/ui/page-header";
import { resolvePageFamily } from "@/lib/ui/page-families";

export default function SpogomiPersonalEventsError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50 px-4 py-10">
      <div className="cmm-page-width">
        <div role="alert">
          <CmmCard tone="slate" variant="glass" className="mx-auto max-w-2xl space-y-4 p-6">
            <PageHeader family={resolvePageFamily("/spogomi/mes-evenements")} tone="emerald" title="Compétitions indisponibles" subtitle="Votre catalogue privé n’a pas pu être chargé." />
            <p className="text-slate-800">Les relations et compétitions accessibles n’ont pas pu être chargées. Votre liste n’est pas un état vide.</p>
            <CmmButton type="button" tone="primary" onClick={reset}>Réessayer</CmmButton>
          </CmmCard>
        </div>
      </div>
    </main>
  );
}
