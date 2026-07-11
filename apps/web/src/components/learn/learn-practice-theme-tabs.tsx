"use client";

import { useId } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Droplets,
  Leaf,
  MapPinned,
  Package,
  Recycle,
  ShieldAlert,
  Sprout,
  Target,
  Trash2,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";
import { GESTES_PROPRES_CAMPAIGN } from "@/lib/learning/gestes-propres-campaign";
import { LearnGestesPropresBarometer } from "@/components/learn/learn-gestes-propres-barometer";
import { LearnGestesPropresInsightsSection } from "@/components/learn/learn-gestes-propres-insights-section";

export type LearnPracticeThemeId = "tri" | "compost" | "reduire";

export const LEARN_PRACTICE_THEME_ORDER: LearnPracticeThemeId[] = ["tri", "compost", "reduire"];

const THEME_LABELS: Record<
  LearnPracticeThemeId,
  { label: { fr: string; en: string }; hint: { fr: string; en: string } }
> = {
  tri: {
    label: { fr: "Bien trier", en: "Sort well" },
    hint: {
      fr: "Lire la consigne locale, puis isoler le doute.",
      en: "Read the local rule, then isolate uncertainty.",
    },
  },
  compost: {
    label: { fr: "Composter", en: "Compost" },
    hint: {
      fr: "Garder l’humide, le sec, l’air et la bonne dose d’eau.",
      en: "Keep wet, dry, air and the right amount of water.",
    },
  },
  reduire: {
    label: { fr: "Éviter les déchets abandonnés", en: "Avoid litter" },
    hint: {
      fr: "Prévoir la bonne issue avant d’agir.",
      en: "Plan the right outcome before acting.",
    },
  },
};

type LocalizedText = {
  fr: string;
  en: string;
};

type ThemeGuide = {
  href: string;
  title: LocalizedText;
  detail: LocalizedText;
  cta: LocalizedText;
  icon: LucideIcon;
};

type ThemeAccordion = {
  title: LocalizedText;
  lead: LocalizedText;
  bullets: LocalizedText[];
};

type ThemePanel = {
  summary: LocalizedText;
  rules: LocalizedText[];
  guides: ThemeGuide[];
  shortcuts: ThemeGuide[];
  accordion: ThemeAccordion;
};

const THEME_PANELS: Record<LearnPracticeThemeId, ThemePanel> = {
  tri: {
    summary: {
      fr: "Le tri reste lisible quand le contexte est clair et que le doute est isolé.",
      en: "Sorting stays readable when the context is clear and doubt is isolated.",
    },
    rules: [
      {
        fr: "Lire la consigne locale avant tout geste.",
        en: "Read the local rule before acting.",
      },
      {
        fr: "Séparer les objets douteux au lieu de deviner.",
        en: "Set doubtful items aside instead of guessing.",
      },
      {
        fr: "Choisir le flux le plus sûr si l’information manque.",
        en: "Choose the safest stream when information is missing.",
      },
    ],
    guides: [
      {
        href: "/sections/recycling",
        title: { fr: "Bien trier", en: "Sort well" },
        detail: {
          fr: "Repères de tri et erreurs courantes en une ligne.",
          en: "Sorting cues and common mistakes in one line.",
        },
        cta: { fr: "Ouvrir le guide", en: "Open guide" },
        icon: Recycle,
      },
      {
        href: "/actions/map",
        title: { fr: "Carte d’entraînement", en: "Training map" },
        detail: {
          fr: "Lire la carte pour trouver vite le bon point de tri.",
          en: "Read the map to find the right sorting point quickly.",
        },
        cta: { fr: "Lire la carte", en: "Read map" },
        icon: MapPinned,
      },
    ],
    shortcuts: [
      {
        href: "/sections/trash-spotter",
        title: { fr: "Signaler un déchet", en: "Report waste" },
        detail: {
          fr: "Utiliser le signalement quand le cas reste flou.",
          en: "Use reporting when the case remains unclear.",
        },
        cta: { fr: "Voir le signalement", en: "Open reporting" },
        icon: Trash2,
      },
    ],
    accordion: {
      title: { fr: "À éviter", en: "Avoid" },
      lead: {
        fr: "Le bloc reste fermé par défaut pour ne pas alourdir la lecture.",
        en: "This block stays closed by default to keep the read light.",
      },
      bullets: [
        {
          fr: "Mélanger les flux quand la consigne locale est visible.",
          en: "Mix streams when the local rule is visible.",
        },
        {
          fr: "Forcer un tri incertain dans le mauvais bac.",
          en: "Force uncertain sorting into the wrong bin.",
        },
        {
          fr: "Laisser un doute sans le mettre à part.",
          en: "Leave doubt without setting it aside.",
        },
      ],
    },
  },
  compost: {
    summary: {
      fr: "Le compost tient quand les matières restent équilibrées et aérées.",
      en: "Compost works when materials stay balanced and airy.",
    },
    rules: [
      {
        fr: "Vérifier ce qui est accepté localement.",
        en: "Check what is locally accepted.",
      },
      {
        fr: "Garder des matières humides et sèches en équilibre.",
        en: "Keep wet and dry materials in balance.",
      },
      {
        fr: "Éviter de contaminer le flux avec du trop souillé.",
        en: "Avoid contaminating the stream with overly soiled waste.",
      },
    ],
    guides: [
      {
        href: "/sections/compost",
        title: { fr: "Composter", en: "Compost" },
        detail: {
          fr: "Composter chez soi ou avec une structure locale.",
          en: "Compost at home or with a local group.",
        },
        cta: { fr: "Ouvrir le guide", en: "Open guide" },
        icon: Sprout,
      },
      {
        href: "/actions/new",
        title: { fr: "Réduire à la source", en: "Reduce at source" },
        detail: {
          fr: "Réduire à la source pour alléger le compost.",
          en: "Reduce at source to lighten compost.",
        },
        cta: { fr: "Ouvrir l’action", en: "Open action" },
        icon: Target,
      },
    ],
    shortcuts: [
      {
        href: "/sections/recycling",
        title: { fr: "Bien trier", en: "Sort well" },
        detail: {
          fr: "Revenir au tri si le doute sort du compost.",
          en: "Return to sorting if doubt leaves compost.",
        },
        cta: { fr: "Voir le tri", en: "Open sorting" },
        icon: Recycle,
      },
    ],
    accordion: {
      title: { fr: "Quand ça coince", en: "When it gets stuck" },
      lead: {
        fr: "Le détail utile reste caché tant qu’il ne sert pas.",
        en: "Useful detail stays hidden until it helps.",
      },
      bullets: [
        {
          fr: "Lieu ou volume inadapté à un compost fiable.",
          en: "Place or volume not suited for reliable composting.",
        },
        {
          fr: "Manque d’aération ou excès d’humidité.",
          en: "Lack of air or too much moisture.",
        },
        {
          fr: "Déchets trop souillés pour rester dans le flux compost.",
          en: "Waste too soiled to stay in the compost stream.",
        },
      ],
    },
  },
  reduire: {
    summary: {
      fr: "Éviter les déchets abandonnés commence avant le geste, puis se règle au bon endroit.",
      en: "Avoiding litter starts before the gesture and ends in the right place.",
    },
    rules: [
      {
        fr: "Prévoir l’issue du déchet avant d’agir.",
        en: "Plan the waste's ending before acting.",
      },
      {
        fr: "Choisir la filière ou le point de collecte adapté.",
        en: "Choose the right stream or drop-off point.",
      },
      {
        fr: "Signaler quand aucun bon point n’apparaît.",
        en: "Report it when no clear point is available.",
      },
    ],
    guides: [
      {
        href: "/sections/trash-spotter",
        title: { fr: "Signaler un dépôt", en: "Report litter" },
        detail: {
          fr: "Utiliser le signalement quand un déchet reste bloqué.",
          en: "Use reporting when waste remains stuck.",
        },
        cta: { fr: "Signaler", en: "Report" },
        icon: Trash2,
      },
      {
        href: "/actions/map",
        title: { fr: "Trouver la bonne filière", en: "Find the right stream" },
        detail: {
          fr: "Chercher la solution locale avant d’abandonner le déchet.",
          en: "Find the local solution before leaving waste behind.",
        },
        cta: { fr: "Ouvrir la carte", en: "Open map" },
        icon: MapPinned,
      },
      {
        href: "/actions/new",
        title: { fr: "Réduire à la source", en: "Reduce at source" },
        detail: {
          fr: "Éviter de créer le déchet avant qu’il devienne un problème.",
          en: "Avoid creating waste before it becomes a problem.",
        },
        cta: { fr: "Ouvrir l’action", en: "Open action" },
        icon: Target,
      },
    ],
    shortcuts: [],
    accordion: {
      title: { fr: "À garder en tête", en: "Keep in mind" },
      lead: {
        fr: "La campagne rappelle quatre cas concrets, puis les détails restent repliés.",
        en: "The campaign highlights four concrete cases, then the details stay collapsed.",
      },
      bullets: [
        {
          fr: "Un mégot ne disparaît pas, il se garde jusqu’au bon contenant.",
          en: "A butt does not disappear; it stays with you until the right container.",
        },
        {
          fr: "Une canette ou une bouteille a une filière claire, pas un abandon.",
          en: "A can or bottle has a clear stream, not an abandonment.",
        },
        {
          fr: "Un encombrant va vers une solution locale, jamais dans la rue.",
          en: "A bulky item goes to a local solution, never to the street.",
        },
      ],
    },
  },
};

function ThemeVisualBlock({
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

function GuideCard({
  locale,
  guide,
}: {
  locale: LearnLocale;
  guide: ThemeGuide;
}) {
  const Icon = guide.icon;

  return (
    <CmmCard tone="amber" variant="outlined" className="flex h-full flex-col justify-between p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Guide" : "Guide"}
            </p>
            <h4 className="mt-1 text-lg font-black tracking-tight cmm-text-primary">
              {guide.title[locale]}
            </h4>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <p className="cmm-text-small leading-relaxed cmm-text-secondary">{guide.detail[locale]}</p>
      </div>

      <CmmButton
        href={guide.href}
        tone="secondary"
        variant="pill"
        className="mt-4 w-full justify-between px-4 py-3 cmm-text-caption font-black uppercase tracking-[0.18em]"
      >
        {guide.cta[locale]}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </CmmButton>
    </CmmCard>
  );
}

export function LearnPracticeThemeTabs({
  locale,
  activeTheme,
  onThemeChange,
}: {
  locale: LearnLocale;
  activeTheme: LearnPracticeThemeId;
  onThemeChange: (theme: LearnPracticeThemeId) => void;
}) {
  const baseId = useId();

  return (
    <section className="space-y-4 rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] p-4 shadow-sm md:p-5">
      <div className="space-y-3">
        <p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-amber-700">
          {locale === "fr" ? "Trois thèmes" : "Three themes"}
        </p>
        <div
          role="tablist"
          aria-label={locale === "fr" ? "Thèmes des bonnes pratiques" : "Good practices themes"}
          className="grid gap-2 sm:grid-cols-3"
        >
          {LEARN_PRACTICE_THEME_ORDER.map((theme, index) => {
            const isActive = activeTheme === theme;
            const meta = THEME_LABELS[theme];
            const tabId = `${baseId}-tab-${theme}`;
            const panelId = `${baseId}-panel-${theme}`;

            return (
              <button
                key={theme}
                type="button"
                role="tab"
                id={tabId}
                aria-controls={panelId}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onThemeChange(theme)}
                onKeyDown={(event) => {
                  let nextTheme: LearnPracticeThemeId | null = null;

                  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    nextTheme = LEARN_PRACTICE_THEME_ORDER[(index + 1) % LEARN_PRACTICE_THEME_ORDER.length];
                  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    nextTheme =
                      LEARN_PRACTICE_THEME_ORDER[
                        (index - 1 + LEARN_PRACTICE_THEME_ORDER.length) % LEARN_PRACTICE_THEME_ORDER.length
                      ];
                  } else if (event.key === "Home") {
                    nextTheme = LEARN_PRACTICE_THEME_ORDER[0];
                  } else if (event.key === "End") {
                    nextTheme = LEARN_PRACTICE_THEME_ORDER[LEARN_PRACTICE_THEME_ORDER.length - 1];
                  }

                  if (!nextTheme) {
                    return;
                  }

                  event.preventDefault();
                  onThemeChange(nextTheme);
                  const nextButton = document.getElementById(`${baseId}-tab-${nextTheme}`);
                  if (nextButton instanceof HTMLButtonElement) {
                    nextButton.focus();
                  }
                }}
                className={cn(
                  "flex w-full flex-col rounded-[1.45rem] border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                  isActive
                    ? "border-amber-300 bg-white shadow-[0_10px_24px_-18px_rgba(245,158,11,0.35)]"
                    : "border-amber-200 bg-amber-50/70 hover:border-amber-300 hover:bg-amber-100/60",
                )}
              >
                <span className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-1 text-base font-black tracking-tight cmm-text-primary">
                  {meta.label[locale]}
                </span>
                <span className="mt-1 cmm-text-small leading-relaxed cmm-text-secondary">
                  {meta.hint[locale]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {LEARN_PRACTICE_THEME_ORDER.map((theme) => {
        const panel = THEME_PANELS[theme];
        const meta = THEME_LABELS[theme];
        const isActive = activeTheme === theme;
        const tabId = `${baseId}-tab-${theme}`;
        const panelId = `${baseId}-panel-${theme}`;

        if (!isActive) {
          return null;
        }

        return (
          <section
            key={theme}
            role="tabpanel"
            id={panelId}
            aria-labelledby={tabId}
            className="space-y-4"
          >
            <CmmCard tone="amber" variant="elevated" className="space-y-4 p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-3xl space-y-2">
                  <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                    {meta.label[locale]}
                  </p>
                  <h3 className="text-2xl font-black tracking-tight cmm-text-primary md:text-3xl">
                    {locale === "fr" ? "L’essentiel avant les détails" : "The essentials before details"}
                  </h3>
                  <p className="cmm-text-small leading-relaxed cmm-text-secondary">
                    {panel.summary[locale]}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1.5 cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-900">
                  {locale === "fr" ? "1 thème actif" : "1 active theme"}
                </span>
              </div>

              <ThemeVisualBlock locale={locale} theme={theme} />

              <ol className="grid gap-3 md:grid-cols-3">
                {panel.rules.map((rule, ruleIndex) => (
                  <li
                    key={rule.fr}
                    className="rounded-[1.2rem] border border-amber-200 bg-white p-4 shadow-sm"
                  >
                    <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                      {String(ruleIndex + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-2 cmm-text-small font-semibold leading-relaxed cmm-text-primary">
                      {rule[locale]}
                    </p>
                  </li>
                ))}
              </ol>
            </CmmCard>

            {theme === "reduire" ? (
              <LearnGestesPropresInsightsSection locale={locale} theme={theme} scope="theme" />
            ) : null}

            {theme === "reduire" ? <LearnGestesPropresBarometer locale={locale} /> : null}

            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                    {locale === "fr" ? "Guides essentiels" : "Essential guides"}
                  </p>
                  <h4 className="mt-1 text-xl font-black tracking-tight cmm-text-primary">
                    {locale === "fr" ? "Action d’abord, texte ensuite" : "Action first, text later"}
                  </h4>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {panel.guides.map((guide) => (
                  <GuideCard key={guide.href} locale={locale} guide={guide} />
                ))}
              </div>

              {panel.shortcuts.length > 0 ? (
                <div className="flex flex-wrap gap-2 rounded-[1.4rem] border border-amber-200 bg-white p-4">
                  <p className="mr-2 cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                    {locale === "fr" ? "Accès rapide" : "Quick access"}
                  </p>
                  {panel.shortcuts.map((shortcut) => (
                    <CmmButton
                      key={shortcut.href}
                      href={shortcut.href}
                      tone="tertiary"
                      variant="pill"
                      size="sm"
                      className="px-3 py-2 cmm-text-caption font-black uppercase tracking-[0.16em]"
                    >
                      {shortcut.title[locale]}
                    </CmmButton>
                  ))}
                </div>
              ) : null}
            </div>

            {theme === "tri" ? (
              <LearnGestesPropresInsightsSection locale={locale} theme={theme} scope="theme" />
            ) : null}

            <details className="group rounded-[1.35rem] border border-amber-200 bg-white px-4 py-3 shadow-sm">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 focus-visible:outline-none">
                <div className="space-y-1 pr-4">
                  <p className="text-base font-black tracking-tight cmm-text-primary">
                    {panel.accordion.title[locale]}
                  </p>
                  <p className="cmm-text-small leading-relaxed cmm-text-secondary">
                    {panel.accordion.lead[locale]}
                  </p>
                </div>
                <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 transition group-open:rotate-180">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </summary>

              <ul className="mt-4 space-y-2 border-t border-amber-100 pt-4">
                {panel.accordion.bullets.map((bullet) => (
                  <li
                    key={bullet.fr}
                    className="rounded-2xl border border-amber-100 bg-amber-50/40 px-3 py-2 cmm-text-small leading-relaxed cmm-text-primary"
                  >
                    {bullet[locale]}
                  </li>
                ))}
              </ul>
            </details>
          </section>
        );
      })}
    </section>
  );
}
