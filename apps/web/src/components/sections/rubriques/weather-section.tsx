"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CloudRain,
  MapPin,
  Package,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Wind,
} from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { RubriqueCard } from "@/components/ui/rubrique-card";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { GuideOperationalPanel } from "./guide-section";
import { useWeatherData } from "./use-weather-data";
import { useKitData } from "./use-kit-data";
import {
  KitChecklist,
  KitConfiguration,
  WeatherActionWindows,
  WeatherForecast,
  WeatherRiskAlert,
  WeatherTabs,
  WeatherZonePicker,
} from "./weather-components";

type WeatherSectionTab = "weather" | "kit" | "guide";

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

function normalizeWeatherTab(value: string | null): WeatherSectionTab {
  if (value === "kit" || value === "guide") {
    return value;
  }

  return "weather";
}

export function WeatherSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<WeatherSectionTab>(() =>
    normalizeWeatherTab(searchParams.get("tab")),
  );

  useEffect(() => {
    const nextTab = normalizeWeatherTab(searchParams.get("tab"));
    setActiveTab((current) => (current === nextTab ? current : nextTab));
  }, [searchParams]);

  const weather = useWeatherData();
  const kit = useKitData(activeTab === "kit" ? "kit" : "weather", fr);

  function handleTabChange(tab: WeatherSectionTab): void {
    setActiveTab(tab);

    const params = new URLSearchParams(searchParams.toString());
    if (tab === "weather") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <SectionShell
      id="weather"
      title={fr ? "Météo et logistique" : "Weather and logistics"}
      subtitle={
        fr
          ? "Anticipez la météo, préparez le kit et consultez le mode opératoire sur une même page."
          : "Anticipate the weather, prepare the kit and consult the operating guide on one page."
      }
      icon={
        activeTab === "guide"
          ? BookOpen
          : activeTab === "weather"
            ? CloudRain
            : Package
      }
      gradient="from-blue-500/20 via-slate-500/10 to-transparent"
    >
      <div className="space-y-12 pt-8">
        <RubriqueCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          themeColor={activeTab === "kit" ? "amber" : "blue"}
          watermarkIcon={
            activeTab === "guide"
              ? BookOpen
              : activeTab === "weather"
                ? Wind
                : ShieldCheck
          }
          watermarkSize={80}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 p-6"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl border ${
                  activeTab === "kit"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    : activeTab === "guide"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                }`}
              >
                {activeTab === "kit" ? (
                  <Package size={18} />
                ) : activeTab === "guide" ? (
                  <BookOpen size={18} />
                ) : (
                  <CloudRain size={18} />
                )}
              </div>
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                {activeTab === "kit"
                  ? fr
                    ? "Configuration Équipement"
                    : "Gear Configuration"
                  : activeTab === "guide"
                    ? fr
                      ? "Mode opératoire"
                      : "Operating guide"
                    : fr
                      ? "Prévisions Terrain"
                      : "Field Forecast"}
              </h3>
            </div>
            <div className="flex items-center gap-4 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-slate-400" />
                {weather.selectedZone?.label || (fr ? "Zone Auto" : "Auto Zone")}
              </span>
              <div className="w-1 h-1 rounded-full bg-white/10" />
              <span className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-slate-400" />
                {fr ? "Sync. Live" : "Live Sync"}
              </span>
            </div>
          </div>

          <div className="relative z-10">
            <WeatherTabs
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              kitProgress={kit.kitProgress}
              fr={fr}
            />
          </div>
        </RubriqueCard>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="min-h-[600px]"
          >
            {activeTab === "guide" ? (
              <motion.div variants={itemVariants}>
                <GuideOperationalPanel />
              </motion.div>
            ) : activeTab === "weather" ? (
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

                  <RubriqueCard
                    variants={itemVariants}
                    themeColor="slate"
                    withTopBar={false}
                    className="p-8 text-center space-y-4"
                  >
                    <Thermometer className="mx-auto text-slate-500 relative z-10" size={32} />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest relative z-10">
                      {fr
                        ? "Données Météo-France & OpenWeather"
                        : "Data from Météo-France & OpenWeather"}
                    </p>
                  </RubriqueCard>
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
