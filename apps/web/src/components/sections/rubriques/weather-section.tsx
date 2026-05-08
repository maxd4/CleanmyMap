"use client";

import { useState } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { useWeatherData } from "./use-weather-data";
import { useKitData } from "./use-kit-data";
import {
  WeatherTabs,
  WeatherZonePicker,
  WeatherRiskAlert,
  WeatherForecast,
  WeatherActionWindows,
  KitConfiguration,
  KitChecklist,
} from "./weather-components";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { motion, AnimatePresence } from "framer-motion";
import { CloudRain, Package, Wind, Thermometer, ShieldCheck, Sparkles, MapPin } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function WeatherSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  const [activeTab, setActiveTab] = useState<"weather" | "kit">("weather");

  const weather = useWeatherData();
  const kit = useKitData(activeTab, fr);

  return (
    <SectionShell 
      id="weather"
      title={fr ? "Météo & Logistique" : "Weather & Logistics"}
      subtitle={fr ? "Anticipez les conditions et préparez votre équipement pour une action sécurisée." : "Anticipate conditions and prepare your gear for a safe action."}
      icon={activeTab === 'weather' ? CloudRain : Package}
      gradient={activeTab === 'weather' ? "from-blue-500/20 via-slate-500/10 to-transparent" : "from-amber-500/20 via-orange-500/10 to-transparent"}
    >
      <div className="space-y-12 pt-8">
        {/* Navigation & Context Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 p-6 rounded-[2.5rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            {activeTab === 'weather' ? <Wind size={80} className="text-blue-400" /> : <ShieldCheck size={80} className="text-amber-400" />}
          </div>

          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${activeTab === 'weather' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                {activeTab === 'weather' ? <CloudRain size={18} /> : <Package size={18} />}
              </div>
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                {activeTab === 'weather' ? (fr ? "Prévisions Terrain" : "Field Forecast") : (fr ? "Configuration Équipement" : "Gear Configuration")}
              </h3>
            </div>
            <div className="flex items-center gap-4 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><MapPin size={12} className="text-slate-400" /> {weather.selectedZone?.name || (fr ? "Zone Auto" : "Auto Zone")}</span>
              <div className="w-1 h-1 rounded-full bg-white/10" />
              <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-slate-400" /> {fr ? "Sync. Live" : "Live Sync"}</span>
            </div>
          </div>

          <div className="relative z-10">
            <WeatherTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              kitProgress={kit.kitProgress}
              fr={fr}
            />
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="min-h-[600px]"
          >
            {activeTab === "weather" ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-4 space-y-8">
                  <motion.div variants={itemVariants}>
                    <WeatherZonePicker
                      selectedZone={weather.selectedZone}
                      setZoneMode={weather.setZoneMode}
                      setManualZoneId={weather.setManualZoneId}
                      zoneMode={weather.zoneMode}
                      inferredZoneId={weather.inferredZoneId}
                      fr={fr}
                    />
                  </motion.div>

                  {!weather.isLoading && !weather.error && (
                    <motion.div variants={itemVariants}>
                      <WeatherRiskAlert currentRisk={weather.currentRisk} fr={fr} />
                    </motion.div>
                  )}
                  
                  <motion.div variants={itemVariants} className="p-8 rounded-[2.5rem] border border-white/5 bg-slate-900/20 text-center space-y-4">
                    <Thermometer className="mx-auto text-slate-500" size={32} />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {fr ? "Données Météo-France & OpenWeather" : "Data from Meteo-France & OpenWeather"}
                    </p>
                  </motion.div>
                </div>

                <div className="lg:col-span-8 space-y-12">
                  <motion.div variants={itemVariants}>
                    <WeatherForecast
                      activePeriod={weather.activePeriod}
                      setActivePeriod={weather.setActivePeriod}
                      nowcasting={weather.nowcasting}
                      j13={weather.j13}
                      j7={weather.j7}
                      isLoading={weather.isLoading}
                      error={weather.error}
                      fr={fr}
                    />
                  </motion.div>

                  {!weather.isLoading && !weather.error && (
                    <motion.div variants={itemVariants}>
                      <WeatherActionWindows windows={weather.windows} fr={fr} />
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-5">
                  <motion.div variants={itemVariants}>
                    <KitConfiguration
                      packType={kit.packType}
                      setPackType={kit.setPackType}
                      packItems={kit.packItems}
                      fr={fr}
                    />
                  </motion.div>
                </div>
                <div className="lg:col-span-7">
                  <motion.div variants={itemVariants}>
                    <KitChecklist
                      packItems={kit.packItems}
                      toggleItem={kit.toggleItem}
                      fr={fr}
                    />
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </SectionShell>
  );
}
