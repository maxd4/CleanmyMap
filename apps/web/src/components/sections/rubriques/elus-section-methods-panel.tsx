"use client";

import { FileText } from "lucide-react";
import { KpiMethodBlock } from "@/components/pilotage/kpi-method-block";
import type { PilotageOverview } from "@/lib/pilotage/overview.types";

export function ElusSectionMethodsPanel({ data }: { data: PilotageOverview }) {
  return (
    <div className="space-y-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-violet-400">
            <FileText size={24} />
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase tracking-[0.1em]">Cadre Méthodologique</h2>
          </div>
          <p className="text-sm font-bold text-slate-500 italic">Transparence algorithmique et sources de données certifiées.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {data.methods.map((method) => (
          <KpiMethodBlock key={method.id} method={method} />
        ))}
      </div>
    </div>
  );
}
