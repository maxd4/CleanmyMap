import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { Star, MapPin, ArrowRight, Quote } from "lucide-react";
import {
  formatAnnuaireCoverage,
  hasPreciseAnnuaireCoordinates,
  type EnrichedAnnuaireEntry,
} from "./annuaire-helpers";
import { motion } from "framer-motion";

interface AnnuaireFeaturedSectionProps {
  fr: boolean;
  entries: EnrichedAnnuaireEntry[];
  onFocusMap: (id: string) => void;
}

export function AnnuaireFeaturedSection({ entries, onFocusMap, fr }: AnnuaireFeaturedSectionProps) {
  if (entries.length === 0) return null;

  return (
    <div>
      <div className="grid grid-cols-1 gap-[var(--cmm-section-gap)] md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 1, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            viewport={{ once: true }}
          >
            <CmmCard 
              variant="default"
              tone="family"
              className="group flex h-full min-w-0 flex-col gap-4"
            >
              {/* Premium Glass Badge */}
              <div className="flex justify-end">
                <div className="relative">
                  <span className="relative inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold cmm-text-primary">
                    <Star size={10} className="fill-current text-amber-400" />
                    {fr ? "À LA UNE" : "FEATURED"}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-1 w-6 rounded-full bg-violet-500" />
                    <p className="text-xs font-semibold cmm-text-secondary">
                      {entry.tags?.[0] || (entry.provenance === "editorial_seed" ? "RESSOURCE" : "THÉMATIQUE")}
                    </p>
                  </div>
                  <h3 className="text-xl font-semibold leading-snug cmm-text-primary">
                    {entry.name}
                  </h3>
                </div>

                {entry.featuredReason && (
                  <div className="relative overflow-hidden rounded-2xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] p-4">
                    <Quote size={32} className="absolute -top-1 -right-1 text-violet-400 opacity-10" />
                    <p className="text-sm italic leading-relaxed cmm-text-primary">
                      « {entry.featuredReason} »
                    </p>
                  </div>
                )}

                <p className="text-sm leading-relaxed cmm-text-primary line-clamp-3">
                  {entry.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {entry.tags?.slice(1, 4).map(tag => (
                  <span key={tag} className="rounded-xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] px-3 py-1.5 text-xs font-medium cmm-text-secondary">
                      {tag.toUpperCase()}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[var(--cmm-surface-border)]">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[var(--cmm-surface-background-muted)] p-2.5 border border-[var(--cmm-surface-border)] cmm-text-secondary">
                      <MapPin size={14} />
                    </div>
                    <span className="text-sm font-medium cmm-text-primary">{formatAnnuaireCoverage(entry)}</span>
                  </div>
                  {entry.distanceKm !== null && hasPreciseAnnuaireCoordinates(entry) && (
                    <div className="flex items-center gap-2 rounded-xl bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 cmm-text-primary">
                      <span className="h-1 w-1 rounded-full bg-violet-500" />
                      <span className="text-[10px] font-black tracking-tighter">
                        {entry.distanceKm.toFixed(1)} KM
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto">
                <CmmButton 
                  tone="primary"
                  variant="default"
                  ariaLabel={hasPreciseAnnuaireCoordinates(entry)
                    ? (fr ? `Voir ${entry.name} sur la carte` : `View ${entry.name} on the map`)
                    : (fr ? `Position indisponible pour ${entry.name}` : `Location unavailable for ${entry.name}`)}
                  disabled={!hasPreciseAnnuaireCoordinates(entry)}
                  className="group/btn w-full"
                  onClick={() => onFocusMap(entry.id)}
                >
                  <span>{hasPreciseAnnuaireCoordinates(entry)
                    ? (fr ? "Voir sur la carte" : "View on map")
                    : (fr ? "Position indisponible" : "Location unavailable")}</span>
                  <ArrowRight size={16} className="ml-3 group-hover/btn:translate-x-2 transition-transform duration-500" />
                </CmmButton>
              </div>
            </CmmCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
