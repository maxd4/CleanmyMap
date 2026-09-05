"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { PageHeader } from "@/components/ui/page-header";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { ConditionsPanel } from "./weather-section.conditions";
import { PreparationPanel } from "./weather-section.preparation";
import { useKitData } from "./use-kit-data";
import { useWeatherData } from "./use-weather-data";

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export function WeatherSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const pathname = usePathname();
  const pageFamily = resolvePageFamily(pathname);

  const weather = useWeatherData();
  const kit = useKitData(fr);

  const recommendedWindow = weather.windows.recommended[0] ?? null;

  return (
    <SectionShell
      id="weather"
      hideHeader
    >
      <div className="space-y-10 pt-12 text-slate-900">
        <div className="space-y-6">
          <PageHeader
            family={pageFamily}
            align="center"
            title={fr ? "Organiser une action" : "Organize an action"}
            subtitle={
              fr
                ? "Consultez la météo réelle du lieu puis préparez le terrain pour décider du bon créneau d’action."
                : "Check the real weather for the location, then prepare the field to choose the right action slot."
            }
          />

          <div className="max-w-xl text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700/80">
              {fr ? "Lieu sélectionné" : "Selected place"}
            </p>
            <p className="mt-1 text-lg font-black tracking-tight text-slate-900">
              {weather.selectedLocation.label}
            </p>
            <p className="mt-1 text-sm text-slate-500">{weather.selectedLocation.subtitle}</p>
          </div>

        </div>

        <div className="space-y-8">
          <motion.div variants={itemVariants}>
            <ConditionsPanel
              currentRisk={weather.currentRisk}
              weatherStatus={weather.weatherStatus}
              selectedLocation={weather.selectedLocation}
              locationQuery={weather.locationQuery}
              setLocationQuery={weather.setLocationQuery}
              locationSuggestions={weather.locationSuggestions}
              locationSuggestionsError={weather.locationSuggestionsError}
              isLocationSuggestionsLoading={weather.isLocationSuggestionsLoading}
              selectLocation={weather.selectLocation}
              forecastDays={weather.forecastDays}
              selectedForecastDayIndex={weather.selectedForecastDayIndex}
              setSelectedForecastDayIndex={weather.setSelectedForecastDayIndex}
              windows={weather.windows}
              fr={fr}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PreparationPanel
              currentRisk={weather.currentRisk}
              weatherStatus={weather.weatherStatus}
              selectedLocationLabel={weather.selectedLocation.label}
              selectedLocationSubtitle={weather.selectedLocation.subtitle}
              recommendedWindow={recommendedWindow}
              prepProgress={kit.kitProgress}
              packItems={kit.packItems}
              fr={fr}
            />
          </motion.div>
        </div>
      </div>
    </SectionShell>
  );
}
