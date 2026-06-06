"use client";

import Link from "next/link";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmButton } from "@/components/ui/cmm-button";
import { SectionShell } from "@/components/sections/rubriques/shared";
import {
  ArrowRight,
  Code,
  FileJson,
  GraduationCap,
  Landmark,
  Sparkles,
  ShieldCheck,
  Database,
  Leaf,
  Handshake,
} from "lucide-react";

type Locale = "fr" | "en";

type FeatureCard = {
  icon: typeof FileJson;
  title: { fr: string; en: string };
  items: { fr: string; en: string }[];
  anchor: string;
};

type EconomyCard = {
  icon: typeof Leaf;
  title: { fr: string; en: string };
  description: { fr: string; en: string };
};

const FEATURE_CARDS: FeatureCard[] = [
  {
    icon: FileJson,
    anchor: "formats",
    title: { fr: "Formats d'échange", en: "Exchange formats" },
    items: [
      { fr: "Exports JSON/CSV auditables", en: "Auditable JSON/CSV exports" },
      { fr: "Données géolocalisées", en: "Geolocated data" },
      { fr: "Métadonnées de version", en: "Version metadata" },
    ],
  },
  {
    icon: GraduationCap,
    anchor: "acces-chercheurs",
    title: { fr: "Accès chercheurs", en: "Research access" },
    items: [
      { fr: "API cartographiée en temps réel", en: "Real-time mapping API" },
      { fr: "Indicateurs d'impact", en: "Impact indicators" },
      { fr: "Historique utilisateur", en: "User history trends" },
    ],
  },
  {
    icon: Landmark,
    anchor: "villes-territoires",
    title: { fr: "Villes & territoires", en: "Cities & territories" },
    items: [
      { fr: "Interopérabilité municipale", en: "Municipal interoperability" },
      { fr: "Observatoires locaux", en: "Local observatories" },
      { fr: "Gouvernance de données", en: "Data governance" },
    ],
  },
];

const ECONOMY_CARDS: EconomyCard[] = [
  {
    icon: Leaf,
    title: { fr: "Sponsoring de zones", en: "Zone sponsorship" },
    description: {
      fr: "Soutenez des territoires prioritaires et financez des actions locales mesurables.",
      en: "Support priority territories and fund measurable local actions.",
    },
  },
  {
    icon: Handshake,
    title: { fr: "Mécénat & partenariats", en: "Patronage & partnerships" },
    description: {
      fr: "Accompagnez CleanMyMap dans l'innovation et la préservation des écosystèmes.",
      en: "Support CleanMyMap's innovation and ecosystem preservation.",
    },
  },
  {
    icon: ShieldCheck,
    title: { fr: "Action indépendante", en: "Independent action" },
    description: {
      fr: "Zéro influence sur la modération. Intégrité et impartialité garanties.",
      en: "No influence on moderation. Integrity and impartiality guaranteed.",
    },
  },
  {
    icon: Database,
    title: { fr: "Transparence", en: "Transparency" },
    description: {
      fr: "Gouvernance claire, traçabilité des financements et des usages.",
      en: "Clear governance, traceability of funding and usage.",
    },
  },
];

function localize(locale: Locale, value: { fr: string; en: string }): string {
  return value[locale];
}

function FeatureList({ locale, items }: { locale: Locale; items: FeatureCard["items"] }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item) => (
        <li key={item.fr} className="flex items-start gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500/70" />
          <span className="text-[0.92rem] leading-[1.55] text-slate-600">
            {localize(locale, item)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function OpenDataSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  return (
    <SectionShell
      id="open-data"
      hideHeader
      gradient="from-white via-violet-50/50 to-white"
    >
      <div className="relative overflow-hidden rounded-[2.25rem] border border-violet-100 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(216,180,254,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(252,250,255,0.98)_100%)] p-5 text-slate-950 shadow-[0_30px_100px_-70px_rgba(79,70,229,0.45)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute right-8 top-10 hidden h-36 w-60 rounded-[2rem] opacity-60 lg:block">
          <div className="h-full w-full bg-[radial-gradient(circle,rgba(168,85,247,0.55)_1.6px,transparent_1.6px)] bg-[length:18px_18px] opacity-70" />
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-200/20 blur-3xl" />

        <section className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-700 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-700 text-white shadow-lg shadow-violet-700/20">
                <Database size={18} />
              </div>
              <span className="text-[0.72rem] font-black uppercase tracking-[0.18em]">
                {fr ? "Open Data & API" : "Open Data & API"}
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-[clamp(2.8rem,5vw,5.3rem)] font-black leading-[0.94] tracking-[-0.06em] text-[#2f1a78]">
                {fr ? "Open Data & API" : "Open Data & API"}
              </h1>
              <p className="max-w-2xl text-[1.08rem] leading-[1.65] text-slate-600">
                {fr
                  ? "Accédez aux données opérationnelles et indicateurs d'impact pour la recherche et l'innovation."
                  : "Access operational data and impact indicators for research and innovation."}
              </p>
            </div>
          </div>

          <div className="relative rounded-[2rem] border border-violet-100 bg-white/85 p-6 shadow-[0_24px_72px_-58px_rgba(79,70,229,0.45)]">
            <div className="absolute right-0 top-0 hidden h-full w-32 overflow-hidden rounded-r-[2rem] lg:block">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.12),transparent_68%)]" />
              <div className="absolute inset-y-0 right-4 w-px bg-violet-100/70" />
            </div>
            <div className="absolute right-6 top-6 hidden h-32 w-32 rounded-full border border-violet-100/70 lg:block" />

            <div className="relative z-10 space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-700 to-violet-500 text-white shadow-[0_18px_42px_-28px_rgba(79,70,229,0.8)]">
                <ShieldCheck size={28} />
              </div>
              <h2 className="max-w-lg text-[1.6rem] font-black leading-tight tracking-[-0.04em] text-[#2f1a78]">
                {fr ? "Transparence totale" : "Total transparency"}
              </h2>
              <p className="max-w-xl text-[0.98rem] leading-[1.7] text-slate-600">
                {fr
                  ? "Données ouvertes par défaut. API, export JSON et cadre réutilisable pour chercheurs et collectivités."
                  : "Open data by default. API access, JSON exports and a reusable framework for researchers and cities."}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {FEATURE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title.fr}
                id={card.anchor}
                className="rounded-[1.7rem] border border-violet-100 bg-white p-5 shadow-[0_18px_54px_-42px_rgba(79,70,229,0.4)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 to-violet-500 text-white shadow-[0_14px_30px_-18px_rgba(79,70,229,0.85)]">
                  <Icon size={22} />
                </div>
                <h3 className="mt-5 text-[1.25rem] font-black leading-tight tracking-[-0.03em] text-[#2f1a78]">
                  {localize(locale, card.title)}
                </h3>
                <FeatureList locale={locale} items={card.items} />
                <div className="mt-6">
                  <Link
                    href={`#${card.anchor}`}
                    className="inline-flex items-center gap-2 rounded-full border border-violet-200 px-4 py-2 text-[0.72rem] font-black uppercase tracking-[0.16em] text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
                  >
                    {fr ? "En savoir plus" : "Learn more"}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <section id="api" className="mt-6 grid gap-5 rounded-[1.8rem] border border-violet-100 bg-white/90 p-5 shadow-[0_18px_54px_-42px_rgba(79,70,229,0.4)] lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-700 to-violet-500 text-white shadow-[0_18px_42px_-28px_rgba(79,70,229,0.8)]">
              <Code size={28} />
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500">
                {fr ? "Documentation technique" : "Technical documentation"}
              </div>
              <h3 className="text-[clamp(1.6rem,3vw,2.5rem)] font-black leading-tight tracking-[-0.04em] text-[#2f1a78]">
                {fr ? "Connectez vos outils" : "Connect your tools"}
              </h3>
              <p className="max-w-2xl text-[0.96rem] leading-[1.7] text-slate-600">
                {fr
                  ? "CleanMyMap fournit une documentation Swagger/OpenAPI complète pour faciliter l'intégration de nos données dans vos propres écosystèmes."
                  : "CleanMyMap provides full Swagger/OpenAPI documentation to help integrate our data into your own ecosystems."}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 border-t border-violet-100 pt-5 lg:border-l lg:border-t-0 lg:pt-0 lg:pl-6">
            <CmmButton
              type="button"
              tone="primary"
              variant="pill"
              className="inline-flex h-14 items-center gap-3 rounded-full bg-[#4a2c8f] px-7 text-[0.72rem] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_42px_-26px_rgba(74,44,143,0.8)]"
            >
              {fr ? "Accéder à l'API" : "Access API"}
              <ArrowRight size={16} />
            </CmmButton>
            <p className="text-sm text-slate-500">
              Swagger / OpenAPI
            </p>
          </div>
        </section>

        <section id="economy" className="mt-6 rounded-[2rem] border border-violet-100 bg-[linear-gradient(180deg,rgba(245,240,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] p-5 shadow-[0_18px_54px_-42px_rgba(79,70,229,0.24)] sm:p-6">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 text-violet-500">
              <Sparkles size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                {fr ? "Modèle Économique" : "Economic model"}
              </span>
            </div>
            <h2 className="text-[1.8rem] font-black leading-tight tracking-[-0.04em] text-[#2f1a78]">
              {fr ? "Modèle Économique" : "Economic Model"}
            </h2>
            <p className="max-w-3xl text-[0.96rem] leading-[1.7] text-slate-600">
              {fr
                ? "Transparence, sponsoring de zones et mécénat pour une action environnementale pérenne."
                : "Transparency, zone sponsorship and patronage for sustainable environmental action."}
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ECONOMY_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title.fr}
                  className="rounded-[1.5rem] border border-violet-100 bg-white p-4 shadow-[0_16px_40px_-34px_rgba(79,70,229,0.32)]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-4 text-[1rem] font-black leading-tight text-[#2f1a78]">
                    {localize(locale, card.title)}
                  </h3>
                  <p className="mt-3 text-[0.92rem] leading-[1.65] text-slate-600">
                    {localize(locale, card.description)}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="partenaire" className="mt-6 overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#9f1f81_0%,#7f1d8c_52%,#d61f6b_100%)] p-6 text-white shadow-[0_28px_90px_-54px_rgba(168,85,247,0.55)]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/95 text-fuchsia-600 shadow-2xl">
                <Handshake size={34} />
              </div>
              <div className="max-w-2xl space-y-2">
                <h2 className="text-[1.25rem] font-black leading-tight tracking-[-0.03em] sm:text-[1.45rem]">
                  {fr ? "Devenez partenaire" : "Become a partner"}
                </h2>
                <p className="max-w-xl text-[0.96rem] leading-[1.7] text-white/90">
                  {fr
                    ? "Engagez votre organisation dans une démarche de propreté urbaine et de préservation environnementale mesurable."
                    : "Commit your organization to a measurable urban cleanliness and environmental preservation approach."}
                </p>
              </div>
            </div>

            <CmmButton
              type="button"
              tone="secondary"
              variant="pill"
              className="inline-flex h-14 rounded-full bg-white px-6 text-[0.72rem] font-black uppercase tracking-[0.18em] text-[#8f226f] shadow-2xl"
            >
              {fr ? "Ouvrir le dossier" : "Open the file"}
              <ArrowRight size={16} />
            </CmmButton>
          </div>
        </section>
      </div>
    </SectionShell>
  );
}
