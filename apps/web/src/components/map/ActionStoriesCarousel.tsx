"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ActionMapItem } from "@/lib/actions/types";
import { CmmCard } from "@/components/ui/cmm-card";
import { MapPin, Calendar, Trash2, ArrowRight } from "lucide-react";

interface ActionStoriesCarouselProps {
  items: ActionMapItem[];
}

export function ActionStoriesCarousel({ items }: ActionStoriesCarouselProps) {
  const [index, setIndex] = useState(0);

  if (!items.length) return null;

  const current = items[index % items.length];

  return (
    <div className="relative w-full py-8">
      <div className="flex items-center justify-between mb-6 px-4">
        <div>
          <h3 className="cmm-text-h3 cmm-text-primary">Dernières Actions</h3>
          <p className="cmm-text-caption text-slate-400 font-bold uppercase tracking-widest">Flux temps réel • {items.length} incidents</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIndex(prev => Math.max(0, prev - 1))}
            className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            ←
          </button>
          <button 
            onClick={() => setIndex(prev => prev + 1)}
            className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            →
          </button>
        </div>
      </div>

      <div className="relative h-[400px] w-full perspective-1000">
        <AnimatePresence mode="popLayout">
          {items.slice(index % items.length, (index % items.length) + 3).map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ x: 300, opacity: 0, scale: 0.8 }}
              animate={{ 
                x: i * 40, 
                z: -i * 50, 
                opacity: 1 - i * 0.2, 
                scale: 1 - i * 0.05,
                zIndex: 10 - i 
              }}
              exit={{ x: -300, opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <CmmCard className="w-full max-w-sm h-full pointer-events-auto overflow-hidden group border-white/10 bg-slate-900/40 backdrop-blur-3xl shadow-2xl">
                {/* Background image mockup */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url(https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=800&auto=format&fit=crop)` }}
                />
                
                <div className="relative z-20 h-full flex flex-col justify-end p-6">
                  <div className="mb-4">
                    <span className="px-3 py-1 rounded-full bg-rose-500/80 backdrop-blur-md text-[10px] font-black text-white uppercase tracking-tighter">
                      Action Urgente
                    </span>
                  </div>
                  
                  <h4 className="text-xl font-bold text-white mb-2 line-clamp-2">
                    {item.metadata?.title || "Dépôt sauvage identifié"}
                  </h4>
                  
                  <div className="flex flex-col gap-2 mb-6">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin size={14} className="text-emerald-400" />
                      <span className="text-xs font-medium">Secteur {item.id.slice(0, 4)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Trash2 size={14} className="text-rose-400" />
                      <span className="text-xs font-medium">{item.impact?.score || 0}kg de déchets</span>
                    </div>
                  </div>

                  <button className="w-full py-3 rounded-2xl bg-white text-slate-950 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-400 hover:text-white transition-all">
                    Détails de l'intervention <ArrowRight size={14} />
                  </button>
                </div>
              </CmmCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
