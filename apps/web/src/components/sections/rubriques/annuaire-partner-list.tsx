import React from "react";
import { AnnuaireActorCard } from "./annuaire-actor-card";
import { CmmButton } from "@/components/ui/cmm-button";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";

interface AnnuairePartnerListProps {
  fr: boolean;
  entries: EnrichedAnnuaireEntry[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onFocusMap: (id: string) => void;
}

export function AnnuairePartnerList({
  fr,
  entries,
  currentPage,
  totalPages,
  onPageChange,
  onFocusMap,
}: AnnuairePartnerListProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {entries.map((actor) => (
          <div 
            key={actor.id} 
            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <AnnuaireActorCard
              entry={actor}
              onFocusMap={() => onFocusMap(actor.id)}
              showInternalContact={false}
            />
          </div>
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-2 pt-4 border-t border-slate-100">
          <CmmButton
            variant="ghost"
            tone="slate"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            {fr ? "Précédent" : "Previous"}
          </CmmButton>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-lg cmm-text-caption font-bold transition-all ${
                  currentPage === p
                    ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                    : "bg-white border border-slate-200 cmm-text-secondary hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <CmmButton
            variant="ghost"
            tone="slate"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            {fr ? "Suivant" : "Next"}
          </CmmButton>
        </div>
      ) : null}
    </div>
  );
}
