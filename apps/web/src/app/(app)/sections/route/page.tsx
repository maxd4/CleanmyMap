import { Navigation, MapPin, History, FilePlus2 } from "lucide-react";
import { RouteSection } from "@/components/sections/rubriques/route-section";
import { WeatherWarningBar } from "@/components/ui/weather-warning-bar";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";

export default function RoutePage() {
  const classes = getBlockClasses("act");

  return (
    <main
      data-section="agir"
      className={cn(
        "relative overflow-hidden px-4 py-10 text-white sm:px-6 lg:px-8 min-h-screen transition-colors duration-700",
        "bg-gradient-to-b",
        classes.gradientDeep
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent" />
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute right-0 top-12 h-[30rem] w-[30rem] rounded-full bg-emerald-300/5 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10">
        <header className="space-y-6 pt-4">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400/60">
            <Navigation className="h-4 w-4" />
            Bloc Agir
          </p>
          <div className="max-w-4xl space-y-4">
            <h1 className="text-6xl md:text-7xl font-black leading-[1.02] tracking-tighter text-white">
              Itinéraire IA
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-emerald-100/40 font-medium">
              Décidez vite où agir aujourd&apos;hui avec le temps disponible, la
              météo, l&apos;accessibilité et le niveau d&apos;impact prioritaire.
            </p>
          </div>

          <CmmButtonGroup>
            <CmmButton
              href="/actions/new"
              tone="secondary"
              variant="pill"
              size="lg"
              className={cn("px-8 py-5 rounded-[2rem] transition-all duration-300 hover:scale-[1.02]", classes.surface, classes.borderStrong)}
            >
              <FilePlus2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-widest">Déclarer une action</span>
            </CmmButton>
            <CmmButton 
              href="/actions/map" 
              tone="secondary" 
              variant="pill" 
              size="lg"
              className={cn("px-8 py-5 rounded-[2rem] transition-all duration-300 hover:scale-[1.02] bg-white/5 border-white/5")}
            >
              <MapPin className="h-4 w-4 text-emerald-400/60" />
              <span className="text-xs font-black uppercase tracking-widest text-white/60">Carte des actions</span>
            </CmmButton>
            <CmmButton 
              href="/actions/history" 
              tone="secondary" 
              variant="pill" 
              size="lg"
              className={cn("px-8 py-5 rounded-[2rem] transition-all duration-300 hover:scale-[1.02] bg-white/5 border-white/5")}
            >
              <History className="h-4 w-4 text-emerald-400/60" />
              <span className="text-xs font-black uppercase tracking-widest text-white/60">Historique</span>
            </CmmButton>
          </CmmButtonGroup>
        </header>

        <WeatherWarningBar />

        <div className={cn("rounded-[3rem] p-1 border overflow-hidden", classes.surface, classes.shadow)}>
          <RouteSection />
        </div>
      </div>
    </main>
  );
}
