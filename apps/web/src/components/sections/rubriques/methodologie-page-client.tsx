"use client";

import { Brain, Download, ExternalLink, Info, Scaling, ShieldCheck } from "lucide-react";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

const OPEN_SOURCE_DOCS = [
  {
    id: "impact",
    title: {
      fr: "Audit d'Impact & Modèle de Calcul",
      en: "Impact Audit & Calculation Model",
    },
    desc: {
      fr: "Transparence complète sur nos équations de calcul, les facteurs d'émission (ADEME, GIEC) et notre algorithme linéaire proxy. Document de référence pour vérifier nos affirmations écologiques.",
      en: "Complete transparency on our calculation equations, emission factors (ADEME, IPCC), and our linear proxy algorithm. Reference document to verify our ecological claims.",
    },
    href: "/docs/impact_IA_CleanMyMap.pdf",
    icon: <Scaling className="h-6 w-6" />,
    isPdf: true,
  },
  {
    id: "tech",
    title: {
      fr: "Fiche Technique & Architecture",
      en: "Technical Sheet & Architecture",
    },
    desc: {
      fr: "Vue d'ensemble de l'architecture technique, choix de stack (Next.js, Supabase), sécurité, et principes de conception logicielle de CleanMyMap.",
      en: "Overview of technical architecture, stack choices (Next.js, Supabase), security, and CleanMyMap software design principles.",
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
      fr: "Règles strictes sur la création, la validation et la publication de contenus sur la plateforme, garantissant la qualité de l'information et l'hygiène du dépôt.",
      en: "Strict rules on the creation, validation, and publication of content on the platform, ensuring information quality and repository hygiene.",
    },
    href: "/docs/publication-governance.md",
    icon: <ShieldCheck className="h-6 w-6" />,
    isPdf: false,
  },
  {
    id: "context",
    title: {
      fr: "Contexte Produit & Ambition",
      en: "Product Context & Ambition",
    },
    desc: {
      fr: "Explication détaillée de l'ambition, des objectifs stratégiques et de la vision globale de la plateforme, pour tout contributeur au projet.",
      en: "Detailed explanation of the ambition, strategic objectives, and overall vision of the platform, for any project contributor.",
    },
    href: "/docs/project_context.md",
    icon: <Info className="h-6 w-6" />,
    isPdf: false,
  },
];

export function MethodologiePageClient() {
  const { locale } = useSitePreferences();
  const isFrench = locale === "fr";
  const classes = getBlockClasses("impact");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-16 pb-20 pt-10">
      <header className="space-y-6 text-center">
        <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-red-400/20 bg-red-400/5 px-6 py-2">
          <ShieldCheck size={14} className="animate-pulse text-red-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400/60">
            {isFrench ? "Vision Open Source" : "Open Source Vision"}
          </span>
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-white md:text-6xl">
          {isFrench ? "Documentation & Méthodologie" : "Documentation & Methodology"}
        </h1>
        <p className="mx-auto max-w-3xl text-lg font-medium leading-relaxed text-red-100/50">
          {isFrench
            ? "CleanMyMap s'engage pour une transparence totale. Retrouvez ici tous nos documents de référence, nos méthodologies de calcul d'impact, et l'architecture de notre solution."
            : "CleanMyMap is committed to full transparency. Find all our reference documents, impact calculation methodologies, and our solution's architecture here."}
        </p>
      </header>

      <div className="grid gap-6">
        {OPEN_SOURCE_DOCS.map((doc) => (
          <div
            key={doc.id}
            className={cn(
              "group relative overflow-hidden rounded-[2.5rem] border p-8 transition-all duration-500 hover:scale-[1.01] sm:p-10",
              classes.surface,
              classes.shadow
            )}
          >
            <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-start gap-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-400/10 text-red-400 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:bg-red-400/20">
                  {doc.icon}
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    {doc.title[locale]}
                  </h2>
                  <p className="max-w-2xl text-sm font-medium leading-relaxed text-red-100/50">
                    {doc.desc[locale]}
                  </p>
                </div>
              </div>

              <div className="shrink-0 md:ml-8">
                <a
                  href={doc.href}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-red-500 px-8 py-4 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-400 md:w-auto"
                >
                  {doc.isPdf ? (
                    <>
                      <Download size={16} />
                      {isFrench ? "Télécharger le PDF" : "Download PDF"}
                    </>
                  ) : (
                    <>
                      <ExternalLink size={16} />
                      {isFrench ? "Consulter le fichier" : "View file"}
                    </>
                  )}
                </a>
              </div>
            </div>
          </div>
        ))}

        {/* Compromis Rigueur Scientifique vs UX */}
        <div
          className={cn(
            "group relative overflow-hidden rounded-[2.5rem] border p-8 transition-all duration-500 hover:scale-[1.01] sm:p-10",
            classes.surface,
            classes.shadow
          )}
        >
          <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-start gap-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-400/10 text-red-400 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:bg-red-400/20">
                <Brain className="h-6 w-6" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-black tracking-tight text-white">
                  {isFrench ? "Compromis Rigueur Scientifique & UX" : "Scientific Rigor & UX Compromise"}
                </h2>
                <p className="max-w-2xl text-sm font-medium leading-relaxed text-red-100/50">
                  {isFrench
                    ? "Explication pédagogique de notre parti pris : utiliser des proxies d'impact linéaires (temps = surface) pour fluidifier le formulaire bénévole, au lieu d'exiger des pesées contraignantes sur le terrain."
                    : "Educational explanation of our approach: using linear impact proxies (time = area) to streamline the volunteer form, instead of requiring burdensome weighing in the field."}
                </p>
              </div>
            </div>

            <div className="shrink-0 md:ml-8">
              <a
                href="/learn/comprendre"
                className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-red-400/30 bg-white/5 px-8 py-4 text-[11px] font-black uppercase tracking-widest text-red-100 transition-all hover:bg-white/10 md:w-auto"
              >
                <ExternalLink size={16} />
                {isFrench ? "Lire la page dédiée" : "Read dedicated page"}
              </a>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-10 border-t border-white/5 pt-10 text-center">
        <a
          href="https://github.com/maxd4/CleanMyMap"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 text-sm font-bold text-red-100/40 transition-colors hover:text-red-400"
        >
          {isFrench ? "Voir tout le code source sur GitHub" : "View all source code on GitHub"}
          <ExternalLink size={14} />
        </a>
      </footer>
    </div>
  );
}
