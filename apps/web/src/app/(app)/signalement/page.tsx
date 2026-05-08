import { auth } from "@clerk/nextjs/server";
import { QuickSignalementForm } from "@/components/actions/quick-signalement-form";
import { ClerkRequiredGate } from "@/components/ui/clerk-required-gate";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import { MapPin, ShieldCheck, Info } from "lucide-react";

export default async function SignalementPage() {
  const { userId } = await auth();
  const classes = getBlockClasses("act");

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
    <div className="w-full max-w-[1400px] mx-auto space-y-24 pb-24">
      {/* Premium Act Header */}
      <header className="relative space-y-12 pt-16">
        <div className="absolute -top-24 -left-24 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-emerald-400/20 bg-emerald-400/5 backdrop-blur-md">
            <MapPin size={14} className="text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Terrain / Signalement</span>
          </div>
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-full border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 backdrop-blur-md">
            <ShieldCheck size={12} className="text-emerald-400/60" />
            Position Certifiée
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-7xl md:text-8xl xl:text-9xl font-black text-white tracking-tighter leading-[0.85] uppercase">
            Signaler <br/>Pollution
          </h1>
          <p className="text-2xl text-white/30 max-w-2xl font-medium leading-tight tracking-tight">
            Votre signalement déclenche l&apos;analyse et la priorisation immédiate pour les équipes de dépollution citoyenne.
          </p>
        </div>
      </header>
      
      <div className={cn(
        "rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-3xl p-1 sm:p-12 transition-all duration-700 relative overflow-hidden",
        classes.shadow
      )}>
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10">
          <QuickSignalementForm />
        </div>
      </div>

      <footer className="flex justify-center pt-8">
        <div className="inline-flex items-center gap-6 px-10 py-6 rounded-[2.5rem] border border-white/5 bg-white/5 backdrop-blur-xl">
          <div className="p-3 rounded-2xl bg-emerald-400/10 text-emerald-400">
            <Info size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 leading-none">Protocole Terrain v2.4</p>
            <p className="text-xs font-bold text-white/20 tracking-tight">Analyse automatique par vision • Géolocalisation temps réel</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

