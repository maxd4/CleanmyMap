import {
  ArrowRight,
  Droplets,
  Leaf,
  Package,
  Recycle,
  ShieldAlert,
  Sprout,
  Trash2,
} from "lucide-react";

import { CmmCard } from "@/components/ui/cmm-card";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import { GESTES_PROPRES_CAMPAIGN } from "@/lib/learning/gestes-propres/gestes-propres-campaign";
import type { LearnPracticeThemeId } from "@/lib/learning/practice/themes";

export function ThemeVisualBlock({
  locale,
  theme,
}: {
  locale: LearnLocale;
  theme: LearnPracticeThemeId;
}) {
  if (theme === "tri") {
    return (
      <CmmCard tone="amber" variant="outlined" className="space-y-4 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Lecture visuelle" : "Visual read"}
            </p>
            <h4 className="mt-1 text-xl font-black tracking-tight cmm-text-primary">
              {locale === "fr" ? "Catégories utiles" : "Useful categories"}
            </h4>
          </div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
            <Recycle className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Package, label: { fr: "Emballages", en: "Packaging" } },
            { icon: Droplets, label: { fr: "Humides", en: "Wet" } },
            { icon: Sprout, label: { fr: "Organiques", en: "Organics" } },
            { icon: Trash2, label: { fr: "Résiduels", en: "Residual" } },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label.fr} className="rounded-[1.1rem] border border-amber-200 bg-white p-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-black tracking-tight cmm-text-primary">{item.label[locale]}</p>
                    <p className="cmm-text-caption text-amber-700">
                      {locale === "fr" ? "Pictogramme" : "Pictogram"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-[1.1rem] border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-700">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                {locale === "fr" ? "À éviter" : "Avoid"}
              </p>
              <p className="mt-1 cmm-text-small leading-relaxed cmm-text-secondary">
                {locale === "fr"
                  ? "Deviner, mélanger ou forcer le mauvais bac."
                  : "Guessing, mixing or forcing the wrong bin."}
              </p>
            </div>
          </div>
        </div>
      </CmmCard>
    );
  }

  if (theme === "compost") {
    return (
      <CmmCard tone="amber" variant="outlined" className="space-y-4 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Schéma simple" : "Simple schema"}
            </p>
            <h4 className="mt-1 text-xl font-black tracking-tight cmm-text-primary">
              {locale === "fr" ? "Humide + sec = compost stable" : "Wet + dry = stable compost"}
            </h4>
          </div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
            <Sprout className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="rounded-[1.1rem] border border-amber-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                <Droplets className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black tracking-tight cmm-text-primary">
                  {locale === "fr" ? "Matières humides" : "Wet materials"}
                </p>
                <p className="cmm-text-small cmm-text-secondary">
                  {locale === "fr" ? "Épluchures, restes végétaux, marc." : "Peels, plant leftovers, grounds."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700">
              <ArrowRight className="h-4 w-4 rotate-90 md:rotate-0" aria-hidden="true" />
            </span>
          </div>

          <div className="rounded-[1.1rem] border border-amber-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                <Leaf className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black tracking-tight cmm-text-primary">
                  {locale === "fr" ? "Matières sèches" : "Dry materials"}
                </p>
                <p className="cmm-text-small cmm-text-secondary">
                  {locale === "fr" ? "Feuilles, carton, broyat." : "Leaves, cardboard, chips."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              label: { fr: "Humidité", en: "Moisture" },
              value: locale === "fr" ? "Moyenne" : "Medium",
              detail: locale === "fr" ? "Assez humide pour vivre, pas assez pour coller." : "Enough moisture to live, not enough to stick.",
            },
            {
              label: { fr: "Aération", en: "Airflow" },
              value: locale === "fr" ? "Régulière" : "Regular",
              detail: locale === "fr" ? "L’air circule pour garder le tas vivant." : "Air circulates to keep the pile active.",
            },
          ].map((item) => (
            <div key={item.label.fr} className="rounded-[1.1rem] border border-amber-200 bg-amber-50/60 p-4">
              <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                {item.label[locale]}
              </p>
              <p className="mt-2 text-lg font-black tracking-tight cmm-text-primary">{item.value}</p>
              <p className="mt-1 cmm-text-small leading-relaxed cmm-text-secondary">{item.detail}</p>
            </div>
          ))}
        </div>
      </CmmCard>
    );
  }

  return (
    <CmmCard tone="amber" variant="outlined" className="space-y-4 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
            {locale === "fr" ? "Séquence visuelle" : "Visual sequence"}
          </p>
          <h4 className="mt-1 text-xl font-black tracking-tight cmm-text-primary">
            {locale === "fr"
              ? "Mégot → canette → bouteille → encombrant"
              : "Butt → can → bottle → bulky item"}
          </h4>
          <p className="mt-1 cmm-text-small leading-relaxed cmm-text-secondary">
            {locale === "fr"
              ? "Lire l’issue utile avant de laisser le déchet."
              : "Read the useful outcome before leaving waste behind."}
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {GESTES_PROPRES_CAMPAIGN.situations.map((situation, index) => (
          <div
            key={situation.id}
            className="rounded-[1.1rem] border border-amber-200 bg-white px-3 py-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-black tracking-tight cmm-text-primary">
                {situation.object[locale]}
              </p>
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 cmm-text-caption font-black text-amber-900">
                {String(index + 1)}
              </span>
            </div>
            <p className="mt-2 cmm-text-caption font-black uppercase tracking-[0.16em] text-amber-700">
              {locale === "fr" ? "À orienter" : "To orient"}
            </p>
          </div>
        ))}
      </div>
    </CmmCard>
  );
}
