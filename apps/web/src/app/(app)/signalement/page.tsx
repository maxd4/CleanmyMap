import { auth } from "@clerk/nextjs/server";
import { QuickSignalementForm } from "@/components/actions/quick-signalement-form";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { cn } from "@/lib/utils";
import { MapPin, ShieldCheck, Info, Zap } from "lucide-react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { RubriqueCard } from "@/components/ui/rubrique-card";

export default async function SignalementPage() {
  const { userId } = await auth();

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
      icon={MapPin}
      gradient="from-emerald-500/20 via-slate-500/10 to-transparent"
    >
      <div className="space-y-12 pt-8">
        {/* Certification Status */}
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-emerald-400/20 bg-emerald-400/5 backdrop-blur-md">
            <MapPin size={14} className="text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Position Certifiée</span>
          </div>
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-full border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 backdrop-blur-md">
            <ShieldCheck size={12} className="text-emerald-400/60" />
            Protocole Cockpit v2.4
          </div>
        </div>

        <RubriqueCard 
          themeColor="emerald"
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
        </RubriqueCard>

        {/* Technical Footer Info */}
        <div className="flex justify-center pt-8">
          <RubriqueCard themeColor="slate" withTopBar={false} className="px-10 py-6">
            <div className="flex items-center gap-6">
              <div className="p-3 rounded-2xl bg-emerald-400/10 text-emerald-400">
                <Info size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 leading-none">Analyse de données</p>
                <p className="text-xs font-bold text-white/20 tracking-tight">Traitement automatique par vision • Géolocalisation haute précision</p>
              </div>
            </div>
          </RubriqueCard>
        </div>
      </div>
    </SectionShell>
  );
}

