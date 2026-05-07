"use client";

import { Info } from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

export function DiscussionBadgesPanel() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  return (
    <div className="rounded-[1.75rem] border border-pink-100/40 bg-[rgba(255,248,251,0.96)] p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-200">
          <Info size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-pink-600">
            {fr ? "Info" : "Info"}
          </p>
          <p className="mt-2 text-sm font-semibold cmm-text-primary">
            {fr
              ? "Ici, le ton s’adapte au mode choisi et au profil actif. Inutile d’empiler des badges: l’info utile suffit."
              : "Here, tone adapts to the selected mode and active profile. No need to stack badges: the useful info is enough."}
          </p>
          <p className="mt-2 text-xs cmm-text-secondary">
            {fr
              ? "Utilisez les réglages du profil pour ajuster la coordination, le niveau de détail et la modération."
              : "Use profile settings to adjust coordination, detail level and moderation."}
          </p>
        </div>
      </div>
    </div>
  );
}
