"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ActionMapItem } from "@/lib/actions/types";
import { mapItemWasteKg } from "@/lib/actions/data-contract";

interface ImpactHeatmapProps {
  items: ActionMapItem[];
  height?: string;
}

export function ImpactHeatmap({ items, height = "h-[600px]" }: ImpactHeatmapProps) {
  // Simple simulation of a heatmap using dots with varying sizes and glows
  // In a real app, this would use Mapbox Heatmap layer
  
  return (
    <div className={cn("relative w-full overflow-hidden bg-slate-950 rounded-[2.5rem]", height)}>
      {/* Simulation Background Map (Dark mode) */}
      <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/2.3488,48.8534,12,0/1200x800?access_token=MOCK_TOKEN')] bg-cover opacity-40 mix-blend-luminosity" />
      
      {/* Heatmap overlay simulation */}
      <div className="absolute inset-0 pointer-events-none">
        {items.slice(0, 50).map((item, i) => {
          const kg = mapItemWasteKg(item) || 0;
          const size = Math.min(100, 20 + kg * 2);
          const opacity = Math.min(0.8, 0.2 + kg / 50);
          
          // Random-ish positions based on ID to simulate coordinates in a mock-up
          const left = (parseInt(item.id.slice(0, 8), 16) % 100);
          const top = (parseInt(item.id.slice(8, 16), 16) % 100);

          return (
            <motion.div
              key={item.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity }}
              transition={{ delay: i * 0.05, duration: 1 }}
              className="absolute rounded-full"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                background: `radial-gradient(circle, ${kg > 20 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(16, 185, 129, 0.6)'} 0%, transparent 70%)`,
                filter: "blur(8px)",
                transform: "translate(-50%, -50%)"
              }}
            />
          );
        })}
      </div>

      {/* Floating UI Elements */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
        <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black uppercase tracking-widest shadow-2xl">
          Heatmap d'Impact en direct
        </div>
        <div className="px-4 py-2 rounded-2xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-500/30">
          {items.length} zones traitées
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-10">
        <div className="p-4 rounded-[2rem] bg-slate-900/80 backdrop-blur-xl border border-white/10 text-white shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Légende Thermique</p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold">Faible</span>
            <div className="h-2 w-32 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
            <span className="text-[9px] font-bold">Critique</span>
          </div>
        </div>
      </div>
    </div>
  );
}
