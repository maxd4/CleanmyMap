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

export function ActionStoriesCarousel({ items }: ActionStoriesCarouselProps) {
  const [index, setIndex] = useState(0);

  if (!items.length) return null;

  return (
    <div className="relative w-full py-8">
      <div className="mb-6 flex items-center justify-between px-4">
        <div>
          <h3 className="text-lg font-black tracking-tight text-white">Dernières actions</h3>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-100/50">
            Flux temps réel • {items.length} incidents
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-300/14 bg-[rgba(16,40,64,0.82)] text-sky-100/74 transition hover:border-sky-300/26 hover:bg-[rgba(18,47,74,0.92)]"
          >
            ←
          </button>
          <button
            onClick={() => setIndex((prev) => prev + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-300/14 bg-[rgba(16,40,64,0.82)] text-sky-100/74 transition hover:border-sky-300/26 hover:bg-[rgba(18,47,74,0.92)]"
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
                <CmmCard className="pointer-events-auto h-full w-full max-w-sm overflow-hidden border border-sky-300/14 bg-[rgba(10,31,50,0.88)] shadow-[0_24px_56px_-32px_rgba(56,189,248,0.28)] backdrop-blur-3xl group">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800&auto=format&fit=crop)` }}
                  />

                  <div className="relative z-20 flex h-full flex-col justify-end p-6">
                    <div className="mb-4">
                      <span className="inline-flex rounded-full border border-sky-300/24 bg-sky-400/16 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-50 backdrop-blur-md">
                        Action urgente
                      </span>
                    </div>

                    <h4 className="mb-2 text-xl font-black text-white line-clamp-2">
                      {formatStoryTitle(item)}
                    </h4>

                    <div className="mb-6 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sky-100/72">
                        <MapPin size={14} className="text-sky-300" />
                        <span className="line-clamp-1 text-xs font-medium">{mapItemLocationLabel(item)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sky-100/72">
                        <Calendar size={14} className="text-cyan-300" />
                        <span className="text-xs font-medium">{formatStoryDate(mapItemObservedAt(item))}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sky-100/72">
                        <Trash2 size={14} className="text-rose-300" />
                        <span className="text-xs font-medium">
                          {wasteKg.toFixed(1)}kg · {Math.round(butts)} mégots
                        </span>
                      </div>
                    </div>

                    <CmmButton variant="default" tone="secondary" className="w-full py-3">
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
