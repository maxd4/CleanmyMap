"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { getProfileLabel, type AppProfile } from "@/lib/profiles";
import { Info, Microscope, Landmark, ShieldAlert, Users, Layers, Sparkles, type LucideIcon } from "lucide-react";

const PROFILE_CONTEXT_MESSAGES: Record<AppProfile, string> = {
  benevole: "Interface optimisée pour la déclaration terrain et le suivi de proximité.",
  coordinateur: "Vue de pilotage opérationnel pour la gestion des équipes et événements.",
  scientifique: "Console d'analyse avancée axée sur l'intégrité des données et les statistiques.",
  elu: "Portail de gouvernance avec indicateurs de ROI et impact territorial global.",
  admin: "Espace de supervision système et modération critique.",
  max: "Espace IMU avec arbitrage final et traitement des demandes sensibles.",
};

const PROFILE_ICONS: Record<AppProfile, LucideIcon> = {
  benevole: Users,
  coordinateur: Layers,
  scientifique: Microscope,
  elu: Landmark,
  admin: ShieldAlert,
  max: ShieldAlert,
};

type IdentityProfileBannerProps = {
  profile: AppProfile;
};

export function IdentityProfileBanner({ profile }: IdentityProfileBannerProps) {
  const { displayMode, locale } = useSitePreferences();
  const Icon = PROFILE_ICONS[profile] || Info;

  if (displayMode === "minimaliste") return null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/20 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.15)]">
      {/* Layer fond isolé — backdrop-blur UNIQUEMENT ici, jamais sur le wrapper */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-white/12 backdrop-blur-md" />
      {/* Ligne top subtile */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Contenu — toujours net */}
      <div className="relative z-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        {/* Icône */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
          <Icon size={22} strokeWidth={1.5} className="text-white" />
        </div>

        {/* Texte */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={11} className="text-white" />
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white">
              Configuration active
            </p>
          </div>
          <p className="text-sm font-semibold text-white leading-snug">
            {PROFILE_CONTEXT_MESSAGES[profile]}
          </p>
        </div>

        {/* Badge profil */}
        <div className="hidden sm:flex shrink-0 flex-col items-end gap-0.5 pl-5 border-l border-white/15">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white">Accès</p>
          <p className="text-sm font-black text-white uppercase tracking-wide">
            {getProfileLabel(profile, locale)}
          </p>
        </div>
      </div>
    </div>
  );
}
