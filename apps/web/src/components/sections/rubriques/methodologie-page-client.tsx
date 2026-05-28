"use client";

import type { ReactNode } from "react";
import {
  Beaker,
  BookOpen,
  Brain,
  Download,
  ExternalLink,
  Info,
  Layers,
  MapPin,
  Palette,
  Heart,
  Scaling,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { useTranslation } from "@/lib/i18n/use-translation";
import { NationalStatsSection } from "@/components/sections/rubriques/national-stats-section";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type MethodologyColor = "red" | "slate";

type MethodologyCardProps = {
  title: string;
  formula: string;
  description: string;
  source: string;
  color: MethodologyColor;
  icon: ReactNode;
};

function MethodologyCard({
  title,
  formula,
  description,
  source,
  color,
  icon,
}: MethodologyCardProps) {
  const colorClasses: Record<
    MethodologyColor,
    { text: string; border: string; surface: string; dot: string }
  > = {
    red: {
      text: "text-red-400",
      border: "border-red-400/20",
      surface: "bg-red-400/5",
      dot: "bg-red-400",
    },
    slate: {
      text: "text-slate-400",
      border: "border-slate-400/20",
      surface: "bg-slate-400/5",
      dot: "bg-slate-400",
    },
  };

  const tone = colorClasses[color];

  return (
    <div className="group relative overflow-hidden rounded-[3rem] border border-white/5 bg-white/5 p-10 space-y-8 transition-all duration-700 hover:border-white/10 hover:bg-white/[0.07]">
      <div className={cn("relative z-10 flex items-center gap-5", tone.text)}>
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-transform duration-700 group-hover:scale-110",
            tone.surface,
          )}
        >
          {icon}
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white">
          {title}
        </h2>
      </div>

      <div
        className={cn(
          "relative z-10 rounded-[2rem] border-l-4 bg-black/20 p-8 font-mono text-sm shadow-inner",
          tone.border,
        )}
      >
        <div className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
          Équation Scientifique
        </div>
        <div className="text-red-100/80 leading-relaxed">{formula}</div>
      </div>

      <p className="relative z-10 leading-relaxed text-red-100/40 font-medium">
        {description}
      </p>

      <div className="relative z-10 flex items-center gap-3 pt-6">
        <div className={cn("h-2 w-2 rounded-full", tone.dot)} />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
          Source : {source}
        </span>
      </div>
    </div>
  );
}

const OPEN_SOURCE_DOCS = [
  {
    id: "impact",
    title: {
      fr: "Audit d'Impact & Modèle de Calcul",
      en: "Impact Audit & Calculation Model",
    },
    desc: {
      fr: "Transparence complète sur nos équations de calcul, les facteurs d'émission (ADEME, GIEC) et notre algorithme linéaire proxy.",
      en: "Complete transparency on our calculation equations, emission factors (ADEME, IPCC), and our linear proxy algorithm.",
    },
    href: "/docs/impact_IA_CleanMyMap.pdf",
    icon: <Scaling className="h-6 w-6" />,
    isPdf: true,
  },
  {
    id: "master-arch",
    title: {
      fr: "Architecture Système Complète",
      en: "Complete System Architecture",
    },
    desc: {
      fr: "Documentation maîtresse détaillant les flux de données, les services managés et les principes de découpage du monorepo.",
      en: "Master documentation detailing data flows, managed services, and monorepo splitting principles.",
    },
    href: "/docs/master-architecture.md",
    icon: <Layers className="h-6 w-6" />,
    isPdf: false,
  },
  {
    id: "scientific-protocol",
    title: {
      fr: "Protocole Scientifique",
      en: "Scientific Protocol",
    },
    desc: {
      fr: "Règles, hypothèses et formules sous-jacentes pour la création et la révision de nos indicateurs d'impact environnemental.",
      en: "Rules, assumptions, and underlying formulas for creating and reviewing our environmental impact indicators.",
    },
    href: "/docs/SCIENTIFIC_PROTOCOL.md",
    icon: <Beaker className="h-6 w-6" />,
    isPdf: false,
  },
  {
    id: "gamification",
    title: {
      fr: "Gamification Non-Compétitive",
      en: "Non-Competitive Gamification",
    },
    desc: {
      fr: "Analyse de notre approche produit pour engager la communauté sans utiliser de mécaniques toxiques de compétition.",
      en: "Analysis of our product approach to engage the community without using toxic competitive mechanics.",
    },
    href: "/docs/gamification-non-competitive.md",
    icon: <Heart className="h-6 w-6" />,
    isPdf: false,
  },
  {
    id: "design-system",
    title: {
      fr: "Design System & Charte Premium",
      en: "Design System & Premium Charter",
    },
    desc: {
      fr: "Règles visuelles, gestion des couleurs par bloc et principes de hiérarchie UI garantissant l'accessibilité et l'esthétique du projet.",
      en: "Visual rules, color management by block, and UI hierarchy principles ensuring the project's accessibility and aesthetics.",
    },
    href: "/docs/BLOC_COLOR_SYSTEM_PREMIUM.md",
    icon: <Palette className="h-6 w-6" />,
    isPdf: false,
  },
  {
    id: "tech",
    title: {
      fr: "Fiche Technique Complète",
      en: "Full Technical Sheet",
    },
    desc: {
      fr: "Vue d'ensemble de l'architecture technique, choix de stack (Next.js, Supabase), sécurité, et principes de conception.",
      en: "Overview of technical architecture, stack choices (Next.js, Supabase), security, and design principles.",
    },
    href: "/docs/fiche-technique-cleanmymap.md",
    icon: <Brain className="h-6 w-6" />,
    isPdf: false,
  },
  {
    id: "gov",
    title: {
      fr: "Gouvernance des Publications",
      en: "Publication Governance",
    },
    desc: {
      fr: "Règles strictes sur la création, la validation et la publication de contenus sur la plateforme, garantissant la qualité de l'information.",
      en: "Strict rules on the creation, validation, and publication of content on the platform, ensuring information quality.",
    },
    href: "/docs/publication-governance.md",
    icon: <ShieldCheck className="h-6 w-6" />,
    isPdf: false,
  },
];

export function MethodologiePageClient() {
  const { locale } = useSitePreferences();
  const isFrench = locale === "fr";
  const { factors, sources, version } = IMPACT_PROXY_CONFIG;
  const { t } = useTranslation("methodologie");
  const classes = getBlockClasses("impact");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-16 pb-20 pt-10">
      <header className="space-y-6 text-center">
        <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-red-400/20 bg-red-400/5 px-6 py-2">
          <Beaker size={14} className="animate-pulse text-red-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400/60">
            {t("header_suptitle")}
          </span>
        </div>
        <h1 className="text-6xl font-black tracking-tighter text-white md:text-7xl">
          {t("header_title")}
        </h1>
        <p className="mx-auto max-w-3xl text-xl font-medium leading-relaxed text-red-100/40">
          {t("header_desc")}
        </p>
      </header>

      <NationalStatsSection />

      <div
        className={cn(
          "relative overflow-hidden rounded-[3rem] border p-10 transition-all duration-700 md:p-16",
          classes.surface,
          classes.shadow,
        )}
      >
        <div className="pointer-events-none absolute right-0 top-0 p-12 opacity-5">
          <ShieldCheck size={400} className="text-red-400" />
        </div>

        <div className="relative z-10 grid items-center gap-16 md:grid-cols-2">
          <div className="space-y-8">
            <h2 className="flex items-center gap-4 text-4xl font-black tracking-tight text-white">
              <Brain className="text-red-400" />
              Transparence <br /> Algorithmique
            </h2>
            <p className="max-w-md text-lg font-medium leading-relaxed text-red-100/40">
              Chaque donnée terrain est convertie via des coefficients scientifiques rigoureux issus de l&apos;ADEME et du GIEC.
            </p>
            <div className="flex gap-4">
              <div className="rounded-xl bg-white/5 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-400/60">
                Version {version}
              </div>
              <div className="rounded-xl bg-red-500 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-red-500/20">
                Audit Scientifique OK
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Données Sources", val: "ADEME / GIEC", icon: <BookOpen size={16} /> },
              { label: "Audit", val: "Semestriel", icon: <Zap size={16} /> },
              { label: "Marge Erreur", val: "< 2%", icon: <Scaling size={16} /> },
              { label: "Algorithme", val: "Linéaire Proxy", icon: <Sparkles size={16} /> },
            ].map((item, index) => (
              <div
                key={index}
                className="group flex flex-col gap-3 rounded-[2rem] border border-white/5 bg-white/5 p-6 shadow-sm transition-all hover:border-red-400/30"
              >
                <div className="text-red-400 transition-transform group-hover:scale-110">
                  {item.icon}
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/30">
                    {item.label}
                  </div>
                  <div className="text-sm font-bold text-red-100">{item.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 px-4 md:grid-cols-3">
        {[
          { icon: <MapPin className="text-red-400" />, title: "Collecte Terrain", desc: "Données GPS et volumes saisis via l'App" },
          { icon: <Zap className="text-red-400" />, title: "Calcul Instantané", desc: "Application des coefficients scientifiques" },
          { icon: <ShieldCheck className="text-red-400" />, title: "Impact Certifié", desc: "Visualisation immédiate de l'impact réel" },
        ].map((step, index) => (
          <div
            key={index}
            className="group flex flex-col items-center space-y-6 rounded-[2.5rem] border border-white/5 bg-white/5 p-10 text-center transition-all duration-500 hover:border-white/10"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/5 shadow-inner transition-transform duration-700 group-hover:scale-110">
              {step.icon}
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                {step.title}
              </h3>
              <p className="text-sm font-medium leading-relaxed text-red-100/30">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <section className="grid gap-10 xl:grid-cols-2">
        <MethodologyCard
          title={t("cards.water.title")}
          formula={t("cards.water.formula", { val: factors.waterLitersPerCigaretteButt })}
          description={t("cards.water.desc", { val: factors.waterLitersPerCigaretteButt })}
          source={t("cards.water.source", { src: sources.water })}
          color="red"
          icon={<BookOpen size={24} />}
        />

        <MethodologyCard
          title={t("cards.co2.title")}
          formula={t("cards.co2.formula", { val: factors.co2KgPerWasteKg })}
          description={t("cards.co2.desc")}
          source={t("cards.co2.source", { src: sources.co2 })}
          color="red"
          icon={<Scaling size={24} />}
        />

        <MethodologyCard
          title={t("cards.surface.title")}
          formula={t("cards.surface.formula", {
            valkg: factors.surfaceM2PerWasteKg,
            valmin: factors.surfaceM2PerVolunteerMinute,
          })}
          description={t("cards.surface.desc")}
          source={t("cards.surface.source", { src: sources.surface })}
          color="slate"
          icon={<Info size={24} />}
        />

        <MethodologyCard
          title={t("cards.map.title")}
          formula={t("cards.map.formula")}
          description={t("cards.map.desc")}
          source={t("cards.map.source")}
          color="red"
          icon={<Scaling size={24} />}
        />
      </section>

      {/* Compromis Rigueur Scientifique vs Expérience Utilisateur (Formulaire Bénévole) */}
      <div className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-white/5 p-10 md:p-12 space-y-6">
        <div className="flex items-center gap-4 text-red-400">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/5 shadow-inner">
            <Scaling size={20} />
          </div>
          <h3 className="text-2xl font-black tracking-tight text-white">
            {isFrench ? "Compromis Rigueur Scientifique & UX du Formulaire Bénévole" : "Scientific Rigor & UX Compromise on the Volunteer Form"}
          </h3>
        </div>
        <div className="grid gap-6 md:grid-cols-2 text-red-100/50 leading-relaxed font-medium text-sm">
          <p>
            {isFrench
              ? "Afin d'encourager l'action citoyenne et de simplifier le geste de déclaration sur le terrain, notre formulaire bénévole a été conçu pour être le plus fluide possible. Exiger de chaque participant qu'il pèse ou caractérise précisément chaque type de déchet découragerait la majorité des utilisateurs."
              : "To encourage citizen action and simplify reporting on the ground, our volunteer form was designed to be as fluid as possible. Requiring every participant to weigh or categorize each type of waste precisely would discourage most users."}
          </p>
          <p>
            {isFrench
              ? "C'est pourquoi nous utilisons des proxies linéaires (comme estimer la surface d'action d'après le temps passé ou le poids moyen des déchets collectés). Ce compromis pragmatique permet de collecter des données à grande échelle tout en garantissant des ordres de grandeur fiables validés scientifiquement."
              : "This is why we use linear proxies (such as estimating the action area based on time spent or average weight of collected waste). This pragmatic compromise allows large-scale data collection while ensuring reliable, scientifically validated orders of magnitude."}
          </p>
        </div>
      </div>

      {/* Documentation Open Source */}
      <div className="space-y-10 pt-10 border-t border-white/10">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black tracking-tight text-white">
            {isFrench ? "Documentation & Vision Open Source" : "Documentation & Open Source Vision"}
          </h2>
          <p className="max-w-2xl mx-auto text-lg font-medium leading-relaxed text-red-100/50">
            {isFrench 
              ? "Retrouvez tous nos documents de référence, protocoles et fiches techniques en libre accès." 
              : "Find all our reference documents, protocols and technical sheets in open access."}
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {OPEN_SOURCE_DOCS.map((doc) => (
            <div
              key={doc.id}
              className={cn(
                "group relative overflow-hidden rounded-[2.5rem] border p-8 transition-all duration-500 hover:scale-[1.01]",
                classes.surface,
                classes.shadow
              )}
            >
              <div className="flex items-start gap-5 mb-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-red-400 shadow-inner">
                  {doc.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{doc.title[locale]}</h3>
                  <p className="text-xs font-medium leading-relaxed text-red-100/50">{doc.desc[locale]}</p>
                </div>
              </div>
              <a
                href={doc.href}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-red-500 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-red-400"
              >
                {doc.isPdf ? (
                  <>
                    <Download size={14} />
                    {isFrench ? "Télécharger" : "Download"}
                  </>
                ) : (
                  <>
                    <ExternalLink size={14} />
                    {isFrench ? "Consulter" : "View"}
                  </>
                )}
              </a>
            </div>
          ))}
        </div>
      </div>

      <footer className="cmm-ribbon-surface flex flex-col items-center justify-between gap-10 pt-20 sm:flex-row">
        <div className="space-y-3 text-center sm:text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-200/60">
            CleanMyMap Engine v{version}
          </p>
          <p className="max-w-md text-xs font-bold leading-relaxed text-red-100/70">
            Tous les calculs sont open-source et vérifiables par les autorités locales et partenaires scientifiques.
          </p>
        </div>
        <div
          className="rounded-2xl border border-white/10 bg-red-950/35 px-8 py-4 text-center text-[10px] font-black uppercase tracking-widest text-red-100/60 shadow-sm backdrop-blur-sm"
          dangerouslySetInnerHTML={{ __html: t("footer.partner") }}
        />
      </footer>
    </div>
  );
}
