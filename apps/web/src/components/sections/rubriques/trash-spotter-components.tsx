"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { 
  Target, 
  Clock,
  CheckCircle2, 
  Globe, 
  MapPin, 
  Navigation, 
  Plus, 
  Map as MapIcon, 
  ChevronRight,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";

// --- KPI Grid Component ---

export const SpotterKpiGrid = memo(function SpotterKpiGrid({
  fr,
  total,
  approved,
  geoCoverage,
}: {
  fr: boolean;
  total: number;
  approved: number;
  geoCoverage: string;
}) {
  const kpis = [
    { label: fr ? "Signalements validés" : "Approved reports", value: total, icon: Target, tone: "blue" },
    { label: fr ? "Validés" : "Approved", value: approved, icon: CheckCircle2, tone: "emerald" },
    { label: fr ? "Couverture" : "Coverage", value: geoCoverage, icon: Globe, tone: "purple" },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {kpis.map((kpi) => (
        <motion.div
          key={kpi.label}
          whileHover={{ y: -5, scale: 1.02 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8 backdrop-blur-3xl shadow-2xl transition-all group"
        >
          <div className={cn(
            "absolute -right-8 -top-8 w-24 h-24 blur-3xl opacity-10 rounded-full",
            kpi.tone === 'blue' ? 'bg-blue-500' : 
            kpi.tone === 'amber' ? 'bg-amber-500' : 
            kpi.tone === 'emerald' ? 'bg-emerald-500' : 'bg-purple-500'
          )} />
          
          <div className="flex flex-col gap-4">
            <div className={cn(
              "p-3 rounded-2xl w-fit border shadow-xl",
              kpi.tone === 'blue' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 
              kpi.tone === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 
              kpi.tone === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
            )}>
              <kpi.icon size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 group-hover:text-slate-400 transition-colors">
                {kpi.label}
              </p>
              <p className="text-3xl font-black text-white tracking-tighter">{kpi.value}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
});

// --- Form Component ---

export const SpotterForm = memo(function SpotterForm({
  fr,
  spotType, setSpotType,
  spotLabel, setSpotLabel,
  spotLatitude, setSpotLatitude,
  spotLongitude, setSpotLongitude,
  spotNotes, setSpotNotes,
  spotState,
  spotMessage,
  onCreateSpot,
}: any) {
  return (
    <div className="p-10 rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl shadow-2xl relative overflow-hidden space-y-10">
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
        <Plus size={100} className="text-white" />
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-black text-white tracking-tighter">{fr ? "Nouveau Signalement" : "New Report"}</h3>
        <p className="text-slate-400 text-sm font-medium leading-relaxed">
          {fr ? "Renseignez les détails pour l'intervention." : "Provide details for intervention."}
        </p>
      </div>

      <div className="space-y-8">
        {/* Type selection */}
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Nature du dépôt</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'waste', label: fr ? 'Dépôt sauvage' : 'Illegal dump', color: 'rose' },
              { id: 'overflow', label: fr ? 'Bac plein' : 'Full bin', color: 'amber' },
              { id: 'graffiti', label: fr ? 'Tags/Graffitis' : 'Graffiti', color: 'blue' },
              { id: 'other', label: fr ? 'Autre' : 'Other', color: 'slate' },
            ].map((type) => (
              <CmmButton
                key={type.id}
                onClick={() => setSpotType(type.id)}
                tone={spotType === type.id ? "primary" : "tertiary"}
                variant="pill"
                className={cn(
                  "px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all duration-300",
                  spotType === type.id 
                    ? `bg-${type.color}-500/20 border-${type.color}-500/50 text-white shadow-xl`
                    : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300"
                )}
              >
                {type.label}
              </CmmButton>
            ))}
          </div>
        </div>

        {/* Label input */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Description rapide</label>
          <div className="relative">
            <input
              type="text"
              value={spotLabel}
              onChange={(e) => setSpotLabel(e.target.value)}
              placeholder={fr ? "Ex: Sacs devant le 24 rue..." : "Ex: Bags in front of 24 street..."}
              className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>
        </div>

        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Latitude</label>
            <input
              type="number"
              step="any"
              value={spotLatitude}
              onChange={(e) => setSpotLatitude(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Longitude</label>
            <input
              type="number"
              step="any"
              value={spotLongitude}
              onChange={(e) => setSpotLongitude(e.target.value)}
              className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        {/* Action Button */}
        <CmmButton
          onClick={onCreateSpot}
          disabled={spotState === 'loading'}
          tone="primary"
          variant="pill"
          className={cn(
            "w-full py-6 rounded-[2rem] text-sm font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 shadow-2xl",
            spotState === 'success' 
              ? "bg-emerald-500 text-white shadow-emerald-500/40" 
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/40 active:scale-[0.98]"
          )}
        >
          {spotState === 'loading' ? (
            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : spotState === 'success' ? (
            <CheckCircle2 size={20} />
          ) : (
            <Plus size={20} />
          )}
          <span>{spotState === 'success' ? (fr ? "Transmis !" : "Sent !") : (fr ? "Publier le signalement" : "Publish report")}</span>
        </CmmButton>

        {spotMessage && (
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "text-center text-xs font-black uppercase tracking-widest",
              spotState === 'success' ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {spotMessage}
          </motion.p>
        )}
      </div>
    </div>
  );
});

// --- Recent List Component ---

export const SpotterRecentList = memo(function SpotterRecentList({ fr, recent }: { fr: boolean, recent: any[] }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
          <Clock size={20} className="text-slate-400" />
        </div>
        <h3 className="text-xl font-black text-white tracking-tight">{fr ? "Signalements récents" : "Recent Reports"}</h3>
      </div>

      <div className="space-y-4">
        {recent.slice(0, 5).map((spot, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group p-6 rounded-[2rem] border border-white/5 bg-slate-900/20 hover:bg-white/5 hover:border-white/10 transition-all flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-6">
              <div className="p-4 rounded-2xl bg-white/5 text-slate-500 group-hover:text-blue-400 transition-colors">
                <MapPin size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-white tracking-tight">{spot.label || (fr ? "Sans titre" : "No title")}</p>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{spot.type}</span>
                  <div className="w-1 h-1 rounded-full bg-white/10" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">il y a 2h</span>
                </div>
              </div>
            </div>
            <CmmButton tone="tertiary" variant="pill" className="p-3 rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all">
              <ChevronRight size={20} />
            </CmmButton>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

// --- Map Feed Placeholder ---
// Normally this would be a real map, but for the modernization we focus on the container and header

export const ActionsMapFeed = memo(function ActionsMapFeed({ types, days, statusFilter, impactFilter, qualityMin }: any) {
  return (
    <div className="w-full h-[500px] bg-slate-950 relative flex items-center justify-center">
      {/* Background patterns to mimic a map interface */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <div className="relative z-10 text-center space-y-6">
        <div className="w-20 h-20 rounded-[1.5rem] bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-white/20">
          <MapIcon size={40} />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Moteur Cartographique</p>
          <p className="text-slate-400 font-medium">Interface interactive des signalements actifs</p>
        </div>
      </div>

      {/* Decorative overlays */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <div className="p-2 bg-slate-900/80 border border-white/10 rounded-lg text-white/50"><Plus size={16} /></div>
        <div className="p-2 bg-slate-900/80 border border-white/10 rounded-lg text-white/50"><Navigation size={16} /></div>
      </div>
    </div>
  );
});
