import { QuickSignalementForm } from "@/components/actions/quick-signalement-form";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { cn } from "@/lib/utils";
import { MapPin, Zap } from "lucide-react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import { getSafeAuthSession } from "@/lib/auth/safe-session";

export default async function SignalementPage() {
  const { userId } = await getSafeAuthSession();

  if (!userId) {
    return (
      <ClerkRequiredGate
        isAuthenticated={false}
        mode="blur"
        title="Signalement de terrain"
        description="Cette fonctionnalité nécessite une connexion Clerk pour certifier votre position."
        lockedPreview={
          <div className={cn("space-y-4 rounded-[3rem] border p-12 bg-white/5 backdrop-blur-2xl border-white/5")}>
            <div className="rounded-[2rem] border border-white/5 bg-emerald-400/5 p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
                Cockpit Terrain
              </p>
              <p className="mt-4 text-lg text-white/20 leading-tight font-medium">
                La géolocalisation haute précision et l&apos;envoi certifié se déverrouillent après connexion.
              </p>
            </div>
          </div>
        }
      >
        <div />
      </ClerkRequiredGate>
    );
  }

  return (
    <SectionShell
      id="signalement"
      title="Signaler Pollution"
      subtitle="Votre signalement déclenche l'analyse et la priorisation immédiate pour les équipes de dépollution citoyenne."
    >
      <div className="space-y-12 pt-8">
        {/* Certification Status */}
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-emerald-400/20 bg-emerald-400/5 backdrop-blur-md">
            <MapPin size={14} className="text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Position Certifiée</span>
          </div>
        </div>

        <FamilyRubriqueCard
          withTopBar={true}
          topBarContent={
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-emerald-400" />
              <span>Analyse Vision IA Active</span>
            </div>
          }
          className="p-1 sm:p-12"
        >
          <QuickSignalementForm />
        </FamilyRubriqueCard>
      </div>
    </SectionShell>
  );
}
