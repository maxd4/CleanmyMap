"use client";

import type { DisplayMode } from "@/lib/ui/preferences";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type ModeCard = {
  id: DisplayMode;
  title: { fr: string; en: string };
  recommendation: { fr: string; en: string };
  description: { fr: string; en: string };
};

const MODE_CARDS: ModeCard[] = [
  {
    id: "exhaustif",
    title: { fr: "Exhaustif", en: "Exhaustive" },
    recommendation: {
      fr: "Recommandé pour les utilisateurs réguliers",
      en: "Recommended for regular users",
    },
    description: {
      fr: "Navigation complète, analyses détaillées, accès maximal aux rubriques selon votre profil.",
      en: "Full navigation, detailed analytics, broadest section access for your profile.",
    },
  },
  {
    id: "sobre",
    title: { fr: "Sobre", en: "Calm" },
    recommendation: {
      fr: "Recommandé pour les personnes sensibles",
      en: "Recommended for sensitive users",
    },
    description: {
      fr: "Interface apaisée, moins de stimuli, navigation recentrée sur l'essentiel.",
      en: "Calmer interface, reduced stimuli, focused essential navigation.",
    },
  },
  {
    id: "minimaliste",
    title: { fr: "Simplifié", en: "Simplified" },
    recommendation: {
      fr: "Recommandé pour les nouveaux utilisateurs",
      en: "Recommended for new users",
    },
    description: {
      fr: "Parcours guidé, vocabulaire simplifié, accès progressif aux rubriques avancées.",
      en: "Guided flow, minimalisted wording, progressive access to advanced sections.",
    },
  },
];

export function DisplayModeOnboardingGate() {
  const { locale, displayMode, setDisplayMode, isDisplayModeExplicitlySet } =
    useSitePreferences();

  if (isDisplayModeExplicitlySet) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
      <section className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
          {locale === "fr" ? "Configuration initiale" : "Initial setup"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          {locale === "fr"
            ? "Choisissez votre mode d'affichage"
            : "Choose your display mode"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {locale === "fr"
            ? "Ce choix est modifiable à tout moment dans les paramètres."
            : "This choice can be changed at any time in settings."}
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {MODE_CARDS.map((mode) => {
            const active = mode.id === displayMode;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setDisplayMode(mode.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-800 hover:border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                <p className="text-base font-semibold">{mode.title[locale]}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {mode.recommendation[locale]}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {mode.description[locale]}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
