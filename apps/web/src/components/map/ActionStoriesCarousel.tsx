"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, Calendar, MapPin, Trash2 } from "lucide-react";
import type { ActionMapItem } from "@/lib/actions/types";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  mapItemCigaretteButts,
  mapItemLocationLabel,
  mapItemObservedAt,
  mapItemType,
  mapItemWasteKg,
} from "@/lib/actions/data-contract";

interface ActionStoriesCarouselProps {
  items: ActionMapItem[];
  onOpenAction?: (actionId: string) => void;
}

function formatStoryDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(parsed);
}

function formatStoryTitle(item: ActionMapItem): string {
  const type = mapItemType(item);
  if (type === "clean_place") {
    return "Zone propre vérifiée";
  }
  if (type === "spot") {
    return "Signalement terrain";
  }
  return "Intervention terrain";
}

export function ActionStoriesCarousel({ items, onOpenAction }: ActionStoriesCarouselProps) {
  const [index, setIndex] = useState(0);

  if (!items.length) return null;

  return (
    <div className="relative w-full py-8">
      <div className="mb-6 flex items-center justify-between px-4">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">Dernières actions</h3>
          <p className="cmm-text-caption font-semibold tracking-[0.14em] text-slate-600">
            Flux temps réel • {items.length} incidents
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/80 bg-white text-slate-950 transition hover:border-cyan-300 hover:bg-cyan-100"
          >
            ←
          </button>
          <button
            onClick={() => setIndex((prev) => prev + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/80 bg-white text-slate-950 transition hover:border-cyan-300 hover:bg-cyan-100"
          >
            →
          </button>
        </div>
      </div>

      <div className="relative h-[400px] w-full perspective-1000">
        <AnimatePresence mode="popLayout">
          {items.slice(index % items.length, (index % items.length) + 3).map((item, i) => {
            const wasteKg = mapItemWasteKg(item) ?? 0;
            const butts = mapItemCigaretteButts(item) ?? 0;
            return (
              <motion.div
                key={item.id}
                initial={{ x: 300, opacity: 0, scale: 0.8 }}
                animate={{
                  x: i * 40,
                  z: -i * 50,
                  opacity: 1 - i * 0.2,
                  scale: 1 - i * 0.05,
                  zIndex: 10 - i,
                }}
                exit={{ x: -300, opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <CmmCard className="pointer-events-auto h-full w-full max-w-sm overflow-hidden border border-cyan-200/80 bg-cyan-50/95 shadow-[0_24px_56px_-32px_rgba(8,145,178,0.22)] backdrop-blur-3xl group">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/38 to-slate-950/10 z-10" />
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-55 transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800&auto=format&fit=crop)` }}
                  />

                  <div className="relative z-20 flex h-full flex-col justify-end p-6">
                    <div className="mb-4">
                      <span className="inline-flex rounded-full border border-cyan-200/80 bg-cyan-100 px-3 py-1 cmm-text-caption font-semibold tracking-[0.12em] text-slate-950 backdrop-blur-md">
                        Action urgente
                      </span>
                    </div>

                    <h4 className="mb-2 text-xl font-semibold text-white line-clamp-2">
                      {formatStoryTitle(item)}
                    </h4>

                    <div className="mb-6 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-white/90">
                        <MapPin size={14} className="text-cyan-200" />
                        <span className="line-clamp-1 text-xs font-medium">{mapItemLocationLabel(item)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/90">
                        <Calendar size={14} className="text-cyan-200" />
                        <span className="text-xs font-medium">{formatStoryDate(mapItemObservedAt(item))}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/90">
                        <Trash2 size={14} className="text-rose-500" />
                        <span className="text-xs font-medium">
                          {wasteKg.toFixed(1)}kg · {Math.round(butts)} mégots
                        </span>
                      </div>
                    </div>

                    <CmmButton
                      variant="default"
                      tone="secondary"
                      className="w-full border border-white/20 bg-white text-slate-950 py-3 shadow-lg shadow-slate-950/10 transition-colors hover:bg-cyan-100 active:bg-cyan-100 focus-visible:bg-cyan-100"
                      onClick={() => onOpenAction?.(item.id)}
                    >
                      Détails de l&apos;intervention <ArrowRight size={14} />
                    </CmmButton>
                  </div>
                </CmmCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
