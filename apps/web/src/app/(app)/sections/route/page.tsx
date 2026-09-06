import { Navigation, MapPin, History, FilePlus2 } from "lucide-react";
import { RouteSection } from "@/components/sections/rubriques/route-section";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import { CmmPageLayout, CmmSectionGroup } from "@/components/ui/cmm-section";
import { PageHeader } from "@/components/ui/page-header";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import { getLocalDevAuthState } from "@/lib/auth/local-dev-auth-state.server";
import { EffectiveAuthStateProvider } from "@/lib/auth/use-effective-auth-state";

export default async function RoutePage() {
  const localDevAuth = await getLocalDevAuthState();
  const classes = getBlockClasses("act");

  return (
    <main
      data-section="agir"
      className={cn(
        "relative min-h-screen overflow-hidden text-white transition-colors duration-700"
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent" />
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute right-0 top-12 h-[30rem] w-[30rem] rounded-full bg-emerald-300/5 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/5 blur-[120px]" />
      </div>

      <CmmPageLayout className="relative z-10">
      <CmmSectionGroup>
        <PageHeader
          tone="emerald"
          contrast="inverse"
          title={
            <span className="inline-flex items-center gap-3">
              <Navigation className="h-6 w-6" aria-hidden="true" />
              <span>Où agir</span>
            </span>
          }
          subtitle="Décidez vite où agir aujourd’hui selon la priorité opérationnelle, le déplacement et le nombre d’arrêts."
          action={
            <CmmButtonGroup>
              <CmmButton
                href="/actions/new"
                tone="secondary"
                variant="pill"
                size="lg"
                className={cn(
                  "rounded-[2rem] px-8 py-5 transition-all duration-300 hover:scale-[1.02]",
                  classes.surface,
                  classes.borderStrong,
                )}
              >
                <FilePlus2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-widest">
                  Déclarer une action
                </span>
              </CmmButton>
              <CmmButton
                href="/actions/map"
                tone="secondary"
                variant="pill"
                size="lg"
                className={cn(
                  "rounded-[2rem] px-8 py-5 transition-all duration-300 hover:scale-[1.02] bg-white/5 border-white/5",
                )}
              >
                <MapPin className="h-4 w-4 text-emerald-400/60" />
                <span className="text-xs font-black uppercase tracking-widest text-white/60">
                  Carte des actions
                </span>
              </CmmButton>
              <CmmButton
                href="/actions/history"
                tone="secondary"
                variant="pill"
                size="lg"
                className={cn(
                  "rounded-[2rem] px-8 py-5 transition-all duration-300 hover:scale-[1.02] bg-white/5 border-white/5",
                )}
              >
                <History className="h-4 w-4 text-emerald-400/60" />
                <span className="text-xs font-black uppercase tracking-widest text-white/60">
                  Historique
                </span>
              </CmmButton>
            </CmmButtonGroup>
          }
        />

        <div className={cn("rounded-[3rem] p-1 border overflow-hidden", classes.surface, classes.shadow)}>
          <EffectiveAuthStateProvider localDevAuth={localDevAuth}>
            <RouteSection />
          </EffectiveAuthStateProvider>
        </div>
      </CmmSectionGroup>
      </CmmPageLayout>
    </main>
  );
}
