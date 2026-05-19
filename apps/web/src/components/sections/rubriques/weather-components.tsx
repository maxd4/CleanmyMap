"use client";

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CloudSun, 
  ClipboardCheck, 
  MapPin, 
  Navigation, 
  ShieldAlert, 
  Thermometer, 
  Wind, 
  CloudRain, 
  Timer, 
  CheckCircle2, 
  ArrowRight,
  Package,
  Layers,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Droplets,
  Calendar,
  Sun,
  Cloud
} from "lucide-react";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { OPERATIONAL_ZONES, evaluateWeatherRisk } from "@/lib/weather/ops-weather";
import type { OperationalZone, WeatherRiskAssessment, InterventionWindow } from "@/lib/weather/ops-weather";
import { formatDateTimeShort } from "@/components/sections/rubriques/helpers";
import type { WeatherPoint, WeatherDay, WeatherPeriod, PackType } from "./weather-types";
import { RubriqueCard } from "@/components/ui/rubrique-card";
import { cn } from "@/lib/utils";

// --- Components ---

export const WeatherTabs = memo(function WeatherTabs({
  activeTab,
  setActiveTab,
  kitProgress,
  fr,
}: {
  activeTab: "weather" | "kit";
  setActiveTab: (tab: "weather" | "kit") => void;
  kitProgress: number;
  fr: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-2 bg-slate-950/40 border border-white/10 rounded-[2rem] backdrop-blur-3xl shadow-2xl">
      {[
        { id: "weather", label: fr ? "Météo d'action" : "Action weather", icon: CloudSun },
        { id: "kit", label: fr ? "Kit terrain" : "Field kit", icon: ClipboardCheck },
      ].map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "relative flex items-center gap-3 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-300",
              isActive ? "text-white" : "text-slate-500 hover:text-slate-200"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="weather-tab-active"
                className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl -z-10 shadow-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Icon size={16} className={isActive ? "text-blue-400" : "text-slate-500"} />
            {tab.label}
            {tab.id === 'kit' && (
              <span className={cn(
                "ml-2 px-2 py-0.5 rounded-full text-[9px] font-black",
                isActive ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-white/5 text-slate-500"
              )}>
                {kitProgress}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});

export const WeatherZonePicker = memo(function WeatherZonePicker({
  selectedZone,
  setZoneMode,
  setManualZoneId,
  zoneMode,
  inferredZoneId,
  fr,
}: {
  selectedZone: OperationalZone;
  setZoneMode: (mode: "auto" | "manual") => void;
  setManualZoneId: (id: string) => void;
  zoneMode: "auto" | "manual";
  inferredZoneId: string;
  fr: boolean;
}) {
  return (
    <RubriqueCard 
      themeColor="blue"
      withTopBar={false}
      className="p-8 space-y-8"
    >
      <div className="flex items-center gap-4 relative z-10">
        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <MapPin size={20} className="text-blue-400" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white tracking-tight">{fr ? "Périmètre Géo" : "Geo Perimeter"}</h3>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Configuration Zone</p>
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setZoneMode("auto")}
            className={cn(
              "px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
              zoneMode === "auto" ? "bg-blue-500/20 border-blue-500/50 text-white shadow-xl" : "bg-white/5 border-white/5 text-slate-500"
            )}
          >
            {fr ? "Auto-détection" : "Auto-detect"}
          </button>
          <button
            onClick={() => setZoneMode("manual")}
            className={cn(
              "px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
              zoneMode === "manual" ? "bg-blue-500/20 border-blue-500/50 text-white shadow-xl" : "bg-white/5 border-white/5 text-slate-500"
            )}
          >
            {fr ? "Saisie manuelle" : "Manual entry"}
          </button>
        </div>

        <div className="relative group">
          <select
            value={selectedZone.id}
            onChange={(e) => setManualZoneId(e.target.value)}
            disabled={zoneMode === "auto"}
            className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-6 py-5 text-sm font-black text-white appearance-none outline-none focus:border-blue-500/50 transition-all disabled:opacity-50"
          >
            {OPERATIONAL_ZONES.map((zone) => (
              <option key={zone.id} value={zone.id} className="bg-slate-900">
                {zone.label}
              </option>
            ))}
          </select>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <Navigation size={14} />
          </div>
        </div>
      </div>
    </RubriqueCard>
  );
});

export const WeatherRiskAlert = memo(function WeatherRiskAlert({ currentRisk, fr }: { currentRisk: WeatherRiskAssessment; fr: boolean }) {
  const isDanger = currentRisk.level === "rouge";
  const isWarning = currentRisk.level === "orange";

  return (
    <RubriqueCard
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      themeColor={isDanger ? "rose" : isWarning ? "amber" : "emerald"}
      withTopBar={false}
      className="p-8 space-y-8"
    >
      <div className="flex items-start gap-6 relative z-10">
        <div className={cn(
          "p-4 rounded-2xl border shadow-2xl animate-pulse",
          isDanger ? "bg-rose-500/20 border-rose-500/30 text-rose-500" : isWarning ? "bg-amber-500/20 border-amber-500/30 text-amber-500" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-500"
        )}>
          <ShieldAlert size={32} />
        </div>
        <div className="space-y-1">
          <p className={cn(
            "text-[10px] font-black uppercase tracking-[0.3em]",
            isDanger ? "text-rose-500" : isWarning ? "text-amber-500" : "text-emerald-500"
          )}>
            Niveau de Vigilance
          </p>
          <h3 className="text-2xl font-black text-white tracking-tighter leading-none">
            {currentRisk.reasons[0] ?? (fr ? "Conditions stables" : "Stable conditions")}
          </h3>
        </div>
      </div>

      <div className="grid gap-6 relative z-10">
        <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{fr ? "Matériel conseillé" : "Recommended gear"}</p>
          <div className="flex flex-wrap gap-2">
            {currentRisk.equipment.map((item) => (
              <span key={item} className="px-4 py-1.5 rounded-xl bg-white/10 text-[10px] font-black text-white border border-white/10 uppercase tracking-widest">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{fr ? "Contraintes critiques" : "Critical constraints"}</p>
          <ul className="space-y-3">
            {currentRisk.constraints.map((item) => (
              <li key={item} className="flex items-center gap-3 text-xs font-bold text-slate-400">
                <div className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]", isDanger ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500")} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </RubriqueCard>
  );
});

export const WeatherForecast = memo(function WeatherForecast({
  activePeriod,
  setActivePeriod,
  nowcasting,
  j13,
  isLoading,
  error,
  fr,
}: any) {
  if (isLoading) {
    return (
      <div className="space-y-8">
        <CmmSkeleton className="h-16 w-80 rounded-[1.5rem]" />
        <div className="grid gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <CmmSkeleton key={i} className="h-56 rounded-[2.5rem]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4 bg-slate-950/40 p-2 rounded-[1.5rem] border border-white/5 w-fit">
        {[
          { id: 'now', label: fr ? "Direct" : "Live" },
          { id: '13', label: fr ? "13 Prochains" : "Next 13" }
        ].map(p => (
          <button
            key={p.id}
            onClick={() => setActivePeriod(p.id as any)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              activePeriod === p.id ? "bg-white text-slate-950 shadow-xl" : "text-slate-500 hover:text-white"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {(activePeriod === 'now' ? nowcasting : j13).slice(0, 5).map((point: any, i: number) => (
          <RubriqueCard
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            themeColor={point.temp > 20 ? "amber" : "blue"}
            withTopBar={false}
            className="p-8 text-center space-y-6 group hover:scale-105 transition-all"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-blue-400 transition-colors relative z-10">
              {point.time || point.day}
            </p>
            <div className="flex justify-center text-white/80 group-hover:scale-125 transition-transform duration-500 relative z-10">
              {point.temp > 20 ? <Sun size={32} className="text-amber-400" /> : <Cloud size={32} className="text-blue-400" />}
            </div>
            <div className="space-y-1 relative z-10">
              <p className="text-3xl font-black text-white tracking-tighter">{Math.round(point.temp)}°</p>
              <div className="flex items-center justify-center gap-3 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1"><Droplets size={10} className="text-blue-500" /> {point.pop}%</span>
                <span className="flex items-center gap-1"><Wind size={10} className="text-slate-400" /> {point.wind}kmh</span>
              </div>
            </div>
          </RubriqueCard>
        ))}
      </div>
    </div>
  );
});

export const WeatherActionWindows = memo(function WeatherActionWindows({
  windows,
  fr,
}: {
  windows: { recommended: InterventionWindow[]; avoid: InterventionWindow[] };
  fr: boolean;
}) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
          <Timer size={20} className="text-emerald-400" />
        </div>
        <h3 className="text-xl font-black text-white tracking-tight">{fr ? "Fenêtres d'Action Optimales" : "Optimal Action Windows"}</h3>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
            {fr ? "Recommandées" : "Recommended"}
          </p>
          {windows.recommended.map((w, i) => (
            <motion.div
              key={`recommended-${i}`}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="p-6 rounded-[2rem] border border-white/5 bg-slate-900/20 hover:bg-white/5 transition-all flex items-center justify-between shadow-xl"
            >
              <div className="flex items-center gap-6">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl",
                  w.level === "vert" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                )}>
                  <Sparkles size={24} className={w.level === "vert" ? "animate-pulse" : ""} />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-black text-white tracking-tight">
                    {new Date(w.from).toLocaleDateString(fr ? "fr-FR" : "en-US", { weekday: "long", day: "numeric" })}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {new Date(w.from).getHours()}h - {new Date(w.to).getHours()}h
                    </span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      w.level === "vert" ? "text-emerald-500" : "text-amber-500"
                    )}>
                      {w.reason}
                    </span>
                  </div>
                </div>
              </div>
              <button className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all">
                {fr ? "Planifier" : "Schedule"}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-400">
            {fr ? "À éviter" : "Avoid"}
          </p>
          {windows.avoid.map((w, i) => (
            <motion.div
              key={`avoid-${i}`}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="p-6 rounded-[2rem] border border-white/5 bg-slate-900/20 hover:bg-white/5 transition-all flex items-center justify-between shadow-xl opacity-80"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <AlertCircle size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-black text-white tracking-tight">
                    {new Date(w.from).toLocaleDateString(fr ? "fr-FR" : "en-US", { weekday: "long", day: "numeric" })}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {new Date(w.from).getHours()}h - {new Date(w.to).getHours()}h
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                {w.reason}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
});

export const KitConfiguration = memo(function KitConfiguration({
  packType,
  setPackType,
  packItems,
  fr,
}: {
  packType: PackType;
  setPackType: (t: PackType) => void;
  packItems: string[];
  fr: boolean;
}) {
  return (
    <RubriqueCard 
      themeColor="amber"
      withTopBar={false}
      className="p-10 space-y-10"
    >
      <div className="space-y-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Package size={20} />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tighter">{fr ? "Configuration du kit" : "Kit configuration"}</h3>
        </div>
        <p className="text-slate-400 text-sm font-medium leading-relaxed">
          {fr ? "Préparez votre matériel selon votre format d'action." : "Prepare your gear based on your action format."}
        </p>
      </div>

      <div className="space-y-10 relative z-10">
        <div className="grid grid-cols-3 gap-3">
          {(['solo', 'team', 'school'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setPackType(type)}
              className={cn(
                "flex flex-col items-center gap-3 rounded-2xl border p-6 transition-all duration-300",
                packType === type 
                  ? "border-amber-500/50 bg-amber-500/10 text-white shadow-xl shadow-amber-500/10" 
                  : "border-white/5 bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300"
              )}
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{type}</span>
            </button>
          ))}
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4 text-slate-500 border-b border-white/5 pb-4">
            <Layers size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">{fr ? "Inventaire recommandé" : "Recommended inventory"}</span>
          </div>
          <div className="grid gap-3">
            {packItems.map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-amber-500/20 transition-all"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </RubriqueCard>
  );
});

export const KitChecklist = memo(function KitChecklist({
  packItems,
  toggleItem,
  fr,
  checkedItems = {}
}: any) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
          <CheckCircle2 size={20} className="text-emerald-400" />
        </div>
        <h3 className="text-xl font-black text-white tracking-tight">{fr ? "Checklist de départ" : "Departure Checklist"}</h3>
      </div>

      <div className="grid gap-4">
        {packItems.map((item: string, i: number) => (
          <label 
            key={item}
            className={cn(
              "group flex items-center gap-6 p-6 rounded-[2rem] border transition-all cursor-pointer shadow-xl",
              checkedItems[item] 
                ? "bg-emerald-500/10 border-emerald-500/30" 
                : "bg-slate-900/40 border-white/5 hover:border-white/10"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-xl border flex items-center justify-center transition-all",
              checkedItems[item] ? "bg-emerald-500 border-emerald-500 text-slate-950" : "bg-white/5 border-white/20 text-transparent"
            )}>
              <CheckCircle2 size={18} />
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={!!checkedItems[item]} 
              onChange={() => toggleItem(item)} 
            />
            <div className="flex-1">
              <p className={cn(
                "text-base font-black tracking-tight transition-colors",
                checkedItems[item] ? "text-white" : "text-slate-400 group-hover:text-slate-200"
              )}>
                {item}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-60">Prêt pour action</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
});
