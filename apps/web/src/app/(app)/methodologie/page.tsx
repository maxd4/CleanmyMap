import type { Metadata } from "next";
import Link from "next/link";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { Info, BookOpen, Scaling, Beaker, Sparkles, Zap, Brain, ShieldCheck, MapPin, Download } from "lucide-react";
import { getTranslation } from "@/lib/i18n/server-translation";
import { NationalStatsSection } from "@/components/sections/rubriques/national-stats-section";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";
import { getServerLocale } from "@/lib/server-preferences";

export const metadata: Metadata = {
  title: "Méthodologie - Comment nous calculons l'impact | CleanMyMap",
  description:
    "Méthodologie de calcul d'impact environnemental de CleanMyMap. Coefficients CO2, eau, valorisation des déchets. Transparence complète sur les métriques d'action citoyenne.",
  keywords: [
    "méthodologie",
    "calcul impact",
    "CO2 avoided",
    "empreinte carbone",
    "valorisation déchets",
    "impact environnemental",
    "transparence",
    "écologie",
    "développement durable",
  ],
  alternates: {
    canonical: "/methodologie",
  },
};

const METHODLOGY_SECTIONS = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "sources", label: "Sources & gouvernance" },
  { id: "calculation", label: "Chaîne de calcul" },
  { id: "indicators", label: "Méthodes par indicateur" },
  { id: "audit", label: "Audit & export" },
] as const;

export default async function MethodologiePage() {
  const { factors, sources, version } = IMPACT_PROXY_CONFIG;
  const locale = await getServerLocale();
  const { t } = getTranslation("methodologie", locale);
  const classes = getBlockClasses("visualize");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-12 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <header className="space-y-6 text-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-sky-400/20 bg-sky-400/5 px-6 py-2">
          <Beaker size={14} className="text-sky-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400/60">
            {t("header_suptitle")}
          </span>
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-white md:text-7xl">
          {t("header_title")}
        </h1>
        <p className="mx-auto max-w-3xl text-lg font-medium leading-relaxed text-sky-100/40 md:text-xl">
          {t("header_desc")}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {METHODLOGY_SECTIONS.map((section) => (
            <Link
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full border border-sky-400/18 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-sky-100/70 transition hover:border-sky-300/35 hover:bg-sky-400/10 hover:text-white"
            >
              {section.label}
            </Link>
          ))}
        </div>
      </header>

      <section id="overview" className="space-y-6">
        <SectionHeading
          eyebrow="Vue d'ensemble"
          title="Lire le périmètre avant d'entrer dans le détail"
          description="La page commence par les repères globaux qui cadrent la lecture, puis déroule la logique complète de calcul."
        />
        <NationalStatsSection />
      </section>

      <section id="sources" className="space-y-6">
        <SectionHeading
          eyebrow="Sources & gouvernance"
          title="Transparence algorithmique"
          description="Chaque donnée terrain est convertie via des coefficients scientifiques rigoureux issus de l'ADEME et du GIEC."
        />

        <div className={cn(
          "rounded-[3rem] border p-10 md:p-16 relative overflow-hidden transition-all duration-700",
          classes.surface,
          classes.shadow,
        )}>
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <ShieldCheck size={400} className="text-sky-400" />
          </div>

          <div className="relative z-10 grid gap-16 md:grid-cols-2 md:items-center">
            <div className="space-y-8">
              <h3 className="flex items-center gap-4 text-3xl font-black tracking-tight text-white md:text-4xl">
                <Brain className="text-sky-400" />
                Transparence
                <br />
                Algorithmique
              </h3>
              <p className="max-w-md text-lg font-medium leading-relaxed text-sky-100/40">
                Chaque donnée terrain est convertie via des coefficients scientifiques rigoureux issus de l&apos;ADEME et du GIEC.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="rounded-xl border border-white/5 bg-white/5 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-sky-400/60">
                  Version {version}
                </div>
                <div className="rounded-xl bg-sky-500 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-sky-500/20">
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
              ].map((item, i) => (
                <div
                  key={i}
                  className="group flex flex-col gap-3 rounded-[2rem] border border-white/5 bg-white/5 p-6 shadow-sm transition-all hover:border-sky-400/30"
                >
                  <div className="text-sky-400 transition-transform group-hover:scale-110">
                    {item.icon}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30">
                      {item.label}
                    </div>
                    <div className="text-sm font-bold text-sky-100">{item.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="calculation" className="space-y-6">
        <SectionHeading
          eyebrow="Chaîne de calcul"
          title="De la collecte à l'impact certifié"
          description="La logique de traitement reste la même: on saisit, on calcule, puis on certifie la lecture finale."
        />

        <div className="grid grid-cols-1 gap-8 px-4 md:grid-cols-3">
          {[
            { icon: <MapPin className="text-sky-400" />, title: "Collecte Terrain", desc: "Données GPS et volumes saisis via l'App" },
            { icon: <Zap className="text-amber-400" />, title: "Calcul Instantané", desc: "Application des coefficients scientifiques" },
            { icon: <ShieldCheck className="text-emerald-400" />, title: "Impact Certifié", desc: "Visualisation immédiate de l'impact réel" },
          ].map((step, i) => (
            <div
              key={i}
              className="group flex flex-col items-center space-y-6 rounded-[2.5rem] border border-white/5 bg-white/5 p-10 text-center transition-all duration-500 hover:border-white/10"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/5 shadow-inner transition-transform duration-700 group-hover:scale-110">
                {step.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  {step.title}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-sky-100/30">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="method-calculation" className="space-y-6">
        <SectionHeading
          eyebrow="Méthode de calcul"
          title="Deux règles simples pour convertir la collecte"
          description="La page détaille les conversions utilisées dans le formulaire pour transformer les signaux terrain en estimations lisibles."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-[2.5rem] border border-white/5 bg-white/5 p-6 shadow-sm transition-all hover:border-sky-400/25">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-400">
                <Info size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-400/60">Mégots → masse</p>
                <p className="text-sm font-semibold text-white">Conversion opérationnelle</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-sky-100/40">
              0,2 g par mégot sec, avec une correction x1,2 si le mégot est humide et x1,5 s&apos;il est mouillé.
            </p>
          </div>

          <div className="rounded-[2.5rem] border border-white/5 bg-white/5 p-6 shadow-sm transition-all hover:border-emerald-400/25">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400/60">Vision IA</p>
                <p className="text-sm font-semibold text-white">Estimation assistée</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-sky-100/40">
              Analyse des sacs, du remplissage et de la densité. Référence de densité moyenne : 150 kg/m³ pour le tout-venant urbain.
            </p>
          </div>
        </div>
      </section>

      <section id="indicators" className="space-y-6">
        <SectionHeading
          eyebrow="Méthodes par indicateur"
          title="Une logique par KPI"
          description="Chaque carte explique la formule, la lecture et la source derrière l'indicateur."
        />

        <div className="grid gap-10 xl:grid-cols-2">
          <MethodologyCard
            title={t("cards.water.title")}
            formula={t("cards.water.formula", { val: factors.waterLitersPerCigaretteButt })}
            description={t("cards.water.desc", { val: factors.waterLitersPerCigaretteButt })}
            source={t("cards.water.source", { src: sources.water })}
            color="sky"
            icon={<BookOpen size={24} />}
          />
          <MethodologyCard
            title={t("cards.co2.title")}
            formula={t("cards.co2.formula", { val: factors.co2KgPerWasteKg })}
            description={t("cards.co2.desc")}
            source={t("cards.co2.source", { src: sources.co2 })}
            color="emerald"
            icon={<Scaling size={24} />}
          />
          <MethodologyCard
            title={t("cards.surface.title")}
            formula={t("cards.surface.formula", { valkg: factors.surfaceM2PerWasteKg, valmin: factors.surfaceM2PerVolunteerMinute })}
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
            color="rose"
            icon={<Scaling size={24} />}
          />
        </div>
      </section>

      <section id="audit" className="space-y-6">
        <SectionHeading
          eyebrow="Audit & export"
          title={t("audit.title")}
          description="Le bloc final rassemble la preuve, la lecture humaine et l'accès au document de référence."
        />

        <div className="group relative overflow-hidden rounded-[3rem] border border-sky-400/20 bg-sky-500/10 p-12">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <ShieldCheck size={200} className="text-sky-400" />
          </div>
          <div className="relative z-10 flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4 text-center md:text-left">
              <h3 className="flex items-center justify-center gap-4 text-3xl font-black tracking-tight text-white md:justify-start">
                <ShieldCheck className="text-sky-400" />
                {t("audit.title")}
              </h3>
              <p className="max-w-xl font-medium leading-relaxed text-sky-100/60">
                {t("audit.desc")}
              </p>
            </div>
            <a
              href="/docs/impact_IA_CleanMyMap.pdf"
              target="_blank"
              className="inline-flex items-center gap-3 rounded-[2rem] bg-sky-500 px-10 py-5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-sky-500/20 transition-all hover:scale-105 hover:bg-sky-400"
            >
              <Download size={16} />
              {t("audit.cta")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-400/60">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">
        {title}
      </h2>
      <p className="max-w-3xl text-sm leading-relaxed text-sky-100/40 md:text-base">
        {description}
      </p>
    </div>
  );
}

function MethodologyCard({ title, formula, description, source, color, icon }: any) {
  const colorClasses: any = {
    sky: "text-sky-400 border-sky-400/20 bg-sky-400/5",
    emerald: "text-emerald-400 border-emerald-400/20 bg-emerald-400/5",
    slate: "text-slate-400 border-slate-400/20 bg-slate-400/5",
    rose: "text-rose-400 border-rose-400/20 bg-rose-400/5"
  };

  return (
    <div className="group rounded-[3rem] border border-white/5 bg-white/5 p-10 space-y-8 transition-all duration-700 hover:border-white/10 hover:bg-white/[0.07] relative overflow-hidden">
      <div className={cn("flex items-center gap-5 relative z-10", colorClasses[color].split(' ')[0])}>
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 duration-700", colorClasses[color].split(' ')[2])}>
          {icon}
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white">{title}</h2>
      </div>

      <div className={cn("p-8 rounded-[2rem] font-mono text-sm border-l-4 shadow-inner relative z-10", colorClasses[color].split(' ')[1], "bg-black/20")}>
        <div className="text-[9px] font-black uppercase text-white/20 mb-3 tracking-[0.2em]">Équation Scientifique</div>
        <div className="text-sky-100/80 leading-relaxed">{formula}</div>
      </div>

      <p className="text-sky-100/40 font-medium leading-relaxed relative z-10">
        {description}
      </p>

      <div className="pt-6 flex items-center gap-3 relative z-10">
        <div className={cn("w-2 h-2 rounded-full", colorClasses[color].split(' ')[1].replace('border-', 'bg-').split('/')[0])} />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Source : {source}</span>
      </div>
    </div>
  );
}
