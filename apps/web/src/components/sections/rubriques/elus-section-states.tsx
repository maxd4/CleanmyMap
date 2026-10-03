import { AlertCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { SectionShell } from "@/components/sections/rubriques/shared";

export function ElusSectionErrorState({ showPromotionCta }: { showPromotionCta: boolean }) {
  return (
    <SectionShell id="pilotage" title="Espace Pilotage" subtitle="Dashboard Institutionnel" icon={ShieldCheck}>
      <div className="p-20 rounded-[4rem] bg-rose-500/5 border border-rose-500/20 text-center backdrop-blur-3xl">
        <div className="p-6 w-24 h-24 rounded-[2rem] bg-rose-500/10 text-rose-500 border border-rose-500/20 mx-auto mb-8 shadow-2xl">
          <AlertCircle size={48} className="animate-pulse" />
        </div>
        <h3 className="text-3xl font-black text-white tracking-tighter mb-4">Accès restreint ou indisponible</h3>
        <p className="text-slate-400 font-bold max-w-md mx-auto leading-relaxed">
          {showPromotionCta
            ? "Le niveau Élu doit être obtenu avant d’accéder à cet espace. Vous pouvez découvrir le parcours de demande depuis votre compte."
            : "Le dashboard de pilotage nécessite une authentification institutionnelle de haut niveau ou fait l’objet d’une maintenance technique périodique."}
        </p>
        {showPromotionCta ? (
          <CmmButton
            href="/compte/evolution"
            tone="secondary"
            variant="pill"
            className="mt-10 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl transition-transform"
          >
            Découvrir le niveau Élu
          </CmmButton>
        ) : null}
      </div>
    </SectionShell>
  );
}

export function ElusSectionLoadingState() {
  return (
    <motion.div key="loading" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
      <CmmSkeleton className="h-80 rounded-[4rem]" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <CmmSkeleton className="h-48 rounded-[3rem]" />
        <CmmSkeleton className="h-48 rounded-[3rem]" />
        <CmmSkeleton className="h-48 rounded-[3rem]" />
      </div>
    </motion.div>
  );
}
