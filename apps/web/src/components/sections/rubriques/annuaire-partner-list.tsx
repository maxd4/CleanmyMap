import { motion } from "framer-motion";
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
      <motion.div 
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        {entries.map((actor) => (
          <motion.div 
            key={actor.id} 
            variants={{
              hidden: { opacity: 0, x: -20, filter: "blur(5px)" },
              visible: { 
                opacity: 1, 
                x: 0, 
                filter: "blur(0px)",
                transition: { duration: 0.5, ease: "easeOut" }
              }
            }}
          >
            <AnnuaireActorCard
              entry={actor}
              onFocusMap={() => onFocusMap(actor.id)}
              showInternalContact={false}
            />
          </motion.div>
        ))}
      </motion.div>

      {totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-2 pt-4 border-t border-slate-800/60">
          <CmmButton
            variant="ghost"
            tone="secondary"
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
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                    : "bg-slate-900/60 border border-slate-800 cmm-text-secondary hover:bg-slate-800 hover:cmm-text-primary"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <CmmButton
            variant="ghost"
            tone="secondary"
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
