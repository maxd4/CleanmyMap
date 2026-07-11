"use client";

import { useState } from "react";
import { ArrowRight, Compass, Droplets, MapPinned, PartyPopper, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { cn } from "@/lib/utils";
import type { LearnLocale } from "@/lib/learning/learn-rubric-data";

type LocalizedText = {
  fr: string;
  en: string;
};

type ContextItem = {
  id: string;
  title: LocalizedText;
  context: LocalizedText;
  decision: LocalizedText;
  fallback: LocalizedText;
  href: string;
  hrefLabel: LocalizedText;
  icon: LucideIcon;
};

type EdgeCaseItem = {
  title: LocalizedText;
  detail: LocalizedText;
};

const TRI_CONTEXTS: ContextItem[] = [
  {
    id: "terrain",
    title: { fr: "Action terrain", en: "Field action" },
    context: {
      fr: "En collecte ou en nettoyage, il faut trier au fil de l’eau sans ralentir le groupe.",
      en: "During a cleanup, sorting happens on the fly without slowing the group.",
    },
    decision: {
      fr: "Préparer un point de tri clair et garder une consigne courte.",
      en: "Prepare a clear sorting point and keep the rule short.",
    },
    fallback: {
      fr: "Isoler le doute plutôt que de forcer une mauvaise filière.",
      en: "Isolate doubt rather than forcing the wrong stream.",
    },
    href: "/sections/recycling",
    hrefLabel: { fr: "Voir le guide tri", en: "Open sorting guide" },
    icon: MapPinned,
  },
  {
    id: "plage",
    title: { fr: "Plage", en: "Beach" },
    context: {
      fr: "Le sable mélange vite les déchets, les consignes doivent donc rester très lisibles.",
      en: "Sand mixes waste quickly, so the rules must stay highly legible.",
    },
    decision: {
      fr: "Faire une lecture rapide, séparer les objets douteux et garder un sac pour les cas ambigus.",
      en: "Do a quick scan, separate doubtful items and keep a bag for ambiguous cases.",
    },
    fallback: {
      fr: "Quand l’objet est trop dégradé, passer par le signalement local.",
      en: "When the item is too degraded, use local reporting.",
    },
    href: "/sections/trash-spotter",
    hrefLabel: { fr: "Voir le signalement", en: "Open reporting" },
    icon: Droplets,
  },
  {
    id: "ville",
    title: { fr: "Ville", en: "City" },
    context: {
      fr: "En rue ou en pied d’immeuble, on compose avec des consignes visibles et parfois des bacs absents.",
      en: "In the street or around buildings, you deal with visible rules and sometimes missing bins.",
    },
    decision: {
      fr: "Lire d’abord les panneaux puis appliquer la règle locale la plus précise.",
      en: "Read the signs first, then apply the most precise local rule.",
    },
    fallback: {
      fr: "Si rien n’est visible, choisir le flux le moins risqué.",
      en: "If nothing is visible, choose the least risky stream.",
    },
    href: "/sections/recycling",
    hrefLabel: { fr: "Voir le tri urbain", en: "Open urban sorting" },
    icon: Compass,
  },
  {
    id: "evenement",
    title: { fr: "Événement", en: "Event" },
    context: {
      fr: "Un événement impose des messages très courts et un point de tri central.",
      en: "An event needs very short messages and a central sorting point.",
    },
    decision: {
      fr: "Installer un parcours simple et une consigne unique que tout le monde peut répéter.",
      en: "Set up a simple flow and one rule that everyone can repeat.",
    },
    fallback: {
      fr: "Si le matériel manque, simplifier la consigne.",
      en: "If equipment is missing, simplify the rule.",
    },
    href: "/actions/new",
    hrefLabel: { fr: "Voir l’action", en: "Open action" },
    icon: PartyPopper,
  },
  {
    id: "compost",
    title: { fr: "Compost domestique", en: "Home compost" },
    context: {
      fr: "À la maison, le tri dépend de l’équipement disponible et de la capacité réelle à composter.",
      en: "At home, sorting depends on the available equipment and the real ability to compost.",
    },
    decision: {
      fr: "Vérifier ce qui est accepté localement puis séparer ce qui part au compost.",
      en: "Check what is locally accepted, then separate what goes to compost.",
    },
    fallback: {
      fr: "Si le compost n’est pas possible, garder une filière simple.",
      en: "If composting is not possible, keep a simple stream.",
    },
    href: "/sections/compost",
    hrefLabel: { fr: "Voir le compost", en: "Open compost guide" },
    icon: Sprout,
  },
];

const EDGE_CASES: EdgeCaseItem[] = [
  {
    title: { fr: "Déchet souillé", en: "Soiled waste" },
    detail: {
      fr: "Le gras ou la contamination risquent de salir la filière de tri.",
      en: "Grease or contamination risk dirtying the sorting stream.",
    },
  },
  {
    title: { fr: "Objet non identifiable", en: "Unidentified item" },
    detail: {
      fr: "L’objet est trop abîmé ou trop mixte pour être lu vite.",
      en: "The item is too damaged or mixed to read quickly.",
    },
  },
  {
    title: { fr: "Consigne ambiguë", en: "Ambiguous rule" },
    detail: {
      fr: "Deux messages se contredisent ou le panneau ne suffit pas.",
      en: "Two messages conflict or the sign is not enough.",
    },
  },
  {
    title: { fr: "Matériel absent", en: "Missing equipment" },
    detail: {
      fr: "Le bon bac, le sac ou l’étiquette ne sont pas là au bon moment.",
      en: "The right bin, bag or label is missing when needed.",
    },
  },
  {
    title: { fr: "Compost impossible", en: "Composting impossible" },
    detail: {
      fr: "Le lieu ou le volume ne permettent pas un compost fiable.",
      en: "The place or volume does not allow reliable composting.",
    },
  },
];

export function LearnTriContextSection({ locale }: { locale: LearnLocale }) {
  const [selectedContextId, setSelectedContextId] = useState(TRI_CONTEXTS[0].id);
  const selectedContext = TRI_CONTEXTS.find((item) => item.id === selectedContextId) ?? TRI_CONTEXTS[0];
  const Icon = selectedContext.icon;

  return (
    <section className="rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] p-5 shadow-sm md:p-6">
      <div className="max-w-3xl space-y-2">
        <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
          {locale === "fr" ? "Contexte de tri" : "Sorting context"}
        </p>
        <h3 className="text-2xl font-black tracking-tight cmm-text-primary">
          {locale === "fr"
            ? "Un seul contexte affiché à la fois"
            : "Only one context shown at a time"}
        </h3>
        <p className="cmm-text-small leading-relaxed cmm-text-secondary">
          {locale === "fr"
            ? "Le sélecteur remplace les cinq cartes visibles d’un bloc: on choisit un contexte, puis on lit le détail utile."
            : "The selector replaces the five visible cards: choose one context, then read only the useful detail."}
        </p>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-3">
          <label
            htmlFor="learn-tri-context-select"
            className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700"
          >
            {locale === "fr" ? "Sélecteur" : "Selector"}
          </label>
          <select
            id="learn-tri-context-select"
            value={selectedContextId}
            onChange={(event) => setSelectedContextId(event.target.value)}
            className="w-full rounded-[1.2rem] border border-amber-200 bg-white px-4 py-3 cmm-text-small font-semibold cmm-text-primary outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 md:hidden"
          >
            {TRI_CONTEXTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title[locale]}
              </option>
            ))}
          </select>

          <div className="hidden gap-2 md:flex md:flex-wrap">
            {TRI_CONTEXTS.map((item) => {
              const isSelected = item.id === selectedContextId;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedContextId(item.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "inline-flex min-h-10 items-center rounded-full border px-3.5 py-2 cmm-text-caption font-black uppercase tracking-[0.16em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                    isSelected
                      ? "border-amber-300 bg-amber-100 text-amber-900"
                      : "border-amber-200 bg-white text-amber-700 hover:bg-amber-50",
                  )}
                >
                  {item.title[locale]}
                </button>
              );
            })}
          </div>
        </div>

        <CmmCard tone="amber" variant="elevated" className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                {locale === "fr" ? "Situation active" : "Active situation"}
              </p>
              <h4 className="mt-1 text-xl font-black tracking-tight cmm-text-primary">
                {selectedContext.title[locale]}
              </h4>
            </div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-700">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>

          <p className="mt-4 cmm-text-small leading-relaxed cmm-text-secondary">
            {selectedContext.context[locale]}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.2rem] border border-amber-100 bg-white px-4 py-3">
              <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                {locale === "fr" ? "Décision" : "Decision"}
              </p>
              <p className="mt-2 cmm-text-small leading-relaxed cmm-text-primary">
                {selectedContext.decision[locale]}
              </p>
            </div>

            <div className="rounded-[1.2rem] border border-amber-100 bg-white px-4 py-3">
              <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
                {locale === "fr" ? "Quand ça bloque" : "When it blocks"}
              </p>
              <p className="mt-2 cmm-text-small leading-relaxed cmm-text-primary">
                {selectedContext.fallback[locale]}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <CmmButton
              href={selectedContext.href}
              tone="secondary"
              variant="pill"
              className="inline-flex min-h-11 px-4 py-2.5 cmm-text-caption font-black uppercase tracking-[0.18em]"
            >
              {selectedContext.hrefLabel[locale]}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </CmmButton>
          </div>
        </CmmCard>
      </div>

      <details className="group mt-4 rounded-[1.35rem] border border-amber-200 bg-white px-4 py-3 shadow-sm">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
          <div className="space-y-1 pr-4">
            <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-amber-700">
              {locale === "fr" ? "Cas limites" : "Edge cases"}
            </p>
            <p className="cmm-text-small leading-relaxed cmm-text-secondary">
              {locale === "fr"
                ? "Ouvert seulement si un cas flou revient ou si le contexte devient délicat."
                : "Open only if a fuzzy case comes back or the context gets tricky."}
            </p>
          </div>
          <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 transition group-open:rotate-180">
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </summary>

        <ul className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {EDGE_CASES.map((item) => (
            <li key={item.title.fr} className="rounded-2xl border border-amber-100 bg-amber-50/40 px-3 py-2">
              <p className="text-sm font-black tracking-tight cmm-text-primary">{item.title[locale]}</p>
              <p className="mt-1 cmm-text-small leading-relaxed cmm-text-secondary">{item.detail[locale]}</p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
