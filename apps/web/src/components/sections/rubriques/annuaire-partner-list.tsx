import { motion } from "framer-motion";
import { AnnuaireActorCard } from "./annuaire-actor-card";
import { CmmButton } from "@/components/ui/cmm-button";
import type { EnrichedAnnuaireEntry } from "./annuaire-helpers";
import { cn } from "@/lib/utils";

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
    <div className="space-y-8">
      <motion.div 
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
      >
        {entries.map((actor) => (
          <motion.div 
            key={actor.id} 
            variants={{
              hidden: { opacity: 0, x: -30, filter: "blur(10px)" },
              visible: { 
                opacity: 1, 
                x: 0, 
                filter: "blur(0px)",
                transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] }
              }
            }}
          >
            <AnnuaireActorCard
              entry={actor}
              onFocusMap={() => onFocusMap(actor.id)}
            />
          </motion.div>
        ))}
      </motion.div>

      {totalPages > 1 ? (
        <div className="mt-12 flex items-center justify-center gap-4 border-t border-white/5 pt-8">
          <CmmButton
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            tone="tertiary"
            variant="pill"
            className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {fr ? "Précédent" : "Previous"}
          </CmmButton>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <CmmButton
                key={p}
                onClick={() => onPageChange(p)}
                tone={currentPage === p ? "primary" : "tertiary"}
                variant="pill"
                className={cn(
                  "w-10 h-10 rounded-xl text-[11px] font-black tracking-tighter transition-all",
                  currentPage === p ? "shadow-2xl scale-110" : "hover:shadow-md"
                )}
              >
                {p}
              </CmmButton>
            ))}
          </div>

          <CmmButton
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            tone="tertiary"
            variant="pill"
            className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {fr ? "Suivant" : "Next"}
          </CmmButton>
        </div>
      ) : null}
    </div>
  );
}
