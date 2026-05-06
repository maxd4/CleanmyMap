"use client";

import { ArrowRight, Home, Leaf, MapPin, Users } from "lucide-react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import {
  COMPOST_GUIDE_CARDS,
  COMPOST_POINTS,
  COMPOST_RULE_CARDS,
  COMPOST_TERRITORY_LINKS,
  type CompostPoint,
} from "@/lib/learning/compost-guide-data";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CompostMapCanvas } from "./compost-map-canvas";

const iconMap = {
  home: Home,
  users: Users,
  map: MapPin,
} as const;

const selectedPoints = [
  COMPOST_POINTS[0],
  COMPOST_POINTS[2],
  COMPOST_POINTS[6],
  COMPOST_POINTS[10],
].filter((point): point is CompostPoint => Boolean(point));

export function CompostSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  return (
    <SectionShell
      title={{ fr: "Guide compost", en: "Compost guide" }}
      subtitle={{
        fr: "Composter à la maison, rejoindre un point local et récupérer le compost près de Paris.",
        en: "Compost at home, join a local site and recover compost around Paris.",
      }}
      summary={
        fr
          ? "Guide simple pour les familles: quoi mettre dans le bac, où déposer les biodéchets et quelles cartes consulter autour de Paris et de la grande couronne."
          : "A simple guide for families: what goes in the bin, where to drop bio-waste and which maps to consult around Paris and the wider ring."
      }
      links={[
        {
          href: "/sections/recycling",
          label: { fr: "Assistant tri", en: "Sorting assistant" },
        },
        {
          href: "/learn/ressources",
          label: { fr: "Ressources", en: "Resources" },
        },
      ]}
      traceNote={
        fr
          ? "Sources officielles: Ville de Paris, Paris Est Marne & Bois, Est Ensemble et Versailles Grand Parc. Les points affichés sont des repères sélectionnés, pas une cartographie exhaustive."
          : "Official sources: City of Paris, Paris Est Marne & Bois, Est Ensemble and Versailles Grand Parc. The points shown are selected references, not an exhaustive map."
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <article className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
              <Leaf size={14} />
              {fr ? "Le réflexe compost" : "Compost reflex"}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {COMPOST_GUIDE_CARDS.map((card) => {
                const Icon = iconMap[card.icon];
                return (
                  <div
                    key={card.title.fr}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <Icon size={18} />
                      </div>
                      <p className="text-sm font-black cmm-text-primary">
                        {card.title[locale]}
                      </p>
                    </div>
                    <p className="mt-3 text-sm cmm-text-secondary">
                      {card.description[locale]}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              <Users size={14} />
              {fr ? "Règles simples" : "Simple rules"}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {COMPOST_RULE_CARDS.map((card) => (
                <div
                  key={card.title.fr}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-sm font-black cmm-text-primary">
                    {card.title[locale]}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {card.items.map((item) => (
                      <li key={item.fr} className="flex gap-2 text-sm cmm-text-secondary">
                        <ArrowRight size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                        <span>{item[locale]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              <MapPin size={14} />
              {fr ? "Comment s'y prendre" : "How to use it"}
            </div>
            <ol className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                {
                  title: {
                    fr: "1. Choisir la bonne voie",
                    en: "1. Choose the right route",
                  },
                  body: {
                    fr: "Jardin, immeuble, site associatif ou collecte locale.",
                    en: "Garden, building, association site or local collection.",
                  },
                },
                {
                  title: {
                    fr: "2. Vérifier ce qui est accepté",
                    en: "2. Check what is accepted",
                  },
                  body: {
                    fr: "Chaque site peut ajouter ses propres consignes.",
                    en: "Each site can have its own local rules.",
                  },
                },
                {
                  title: {
                    fr: "3. Déposer proprement",
                    en: "3. Drop it cleanly",
                  },
                  body: {
                    fr: "Biodéchets sans sac plastique classique et sans excès de liquide.",
                    en: "Bio-waste without regular plastic bags and without excess liquid.",
                  },
                },
                {
                  title: {
                    fr: "4. Récupérer le compost",
                    en: "4. Recover the compost",
                  },
                  body: {
                    fr: "Rejoins les permanences ou récupère la matière mûre si le site le permet.",
                    en: "Join the opening hours or recover mature compost if the site allows it.",
                  },
                },
              ].map((step) => (
                <li key={step.title.fr} className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <p className="text-sm font-black cmm-text-primary">{step.title[locale]}</p>
                  <p className="mt-1 text-sm cmm-text-secondary">{step.body[locale]}</p>
                </li>
              ))}
            </ol>
          </article>
        </div>

        <div className="space-y-4">
          <CompostMapCanvas points={COMPOST_POINTS} />

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              <MapPin size={14} />
              {fr ? "Cartes officielles à ouvrir" : "Official maps to open"}
            </div>
            <div className="mt-4 grid gap-3">
              {COMPOST_TERRITORY_LINKS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <p className="text-sm font-black cmm-text-primary">{item.title[locale]}</p>
                  <p className="mt-1 text-sm cmm-text-secondary">{item.description[locale]}</p>
                </a>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              <Leaf size={14} />
              {fr ? "Points repérés autour de Paris" : "Selected points around Paris"}
            </div>
            <div className="mt-4 space-y-3">
              {selectedPoints.map((point) => (
                <div key={point.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black cmm-text-primary">{point.name[locale]}</p>
                      <p className="mt-1 text-sm cmm-text-secondary">{point.address} • {point.city}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                      {point.region === "paris"
                        ? (fr ? "Paris" : "Paris")
                        : point.region === "petite_couronne"
                          ? (fr ? "Petite couronne" : "Inner ring")
                          : (fr ? "Grande couronne" : "Outer ring")}
                    </span>
                  </div>
                  <a
                    href={point.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    {point.sourceLabel[locale]}
                    <ArrowRight size={14} />
                  </a>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </SectionShell>
  );
}
