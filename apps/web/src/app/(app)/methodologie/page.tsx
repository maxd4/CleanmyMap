import type { Metadata } from "next";
import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { Info, BookOpen, Scaling, Beaker, Sparkles, Zap, Brain, ShieldCheck, MapPin, Download } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { NationalStatsSection } from "@/components/sections/rubriques/national-stats-section";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { cn } from "@/lib/utils";

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

export default function MethodologiePage() {
  const { factors, sources, version } = IMPACT_PROXY_CONFIG;
  const { t } = useTranslation("methodologie");
  const classes = getBlockClasses("visualize");

  return (
    <div className="w-full max-w-7xl mx-auto space-y-16 pb-20">
      {/* Premium Header */}
      <header className="space-y-6 text-center pt-10">
        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-sky-400/20 bg-sky-400/5 mb-4">
          <Beaker size={14} className="text-sky-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400/60">{t("header_suptitle")}</span>
        </div>
        <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white">
          {t("header_title")}
        </h1>
        <p className="text-xl text-sky-100/40 max-w-3xl mx-auto font-medium leading-relaxed">
          {t("header_desc")}
        </p>
      </header>

      <NationalStatsSection />

      {/* Logic & Transparency Banner */}
      <div className={cn(
        "rounded-[3rem] p-10 md:p-16 relative overflow-hidden border transition-all duration-700",
        classes.surface,
        classes.shadow
      )}>
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <ShieldCheck size={400} className="text-sky-400" />
        </div>
        
        <div className="relative z-10 grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl font-black tracking-tight flex items-center gap-4 text-white">
              <Brain className="text-sky-400" />
              Transparence <br/>Algorithmique
            </h2>
            <p className="text-sky-100/40 text-lg leading-relaxed font-medium max-w-md">
              Chaque donnée terrain est convertie via des coefficients scientifiques rigoureux issus de l&apos;ADEME et du GIEC.
            </p>
            <div className="flex gap-4">
              <div className="px-5 py-2.5 bg-white/5 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-sky-400/60">Version {version}</div>
              <div className="px-5 py-2.5 bg-sky-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-sky-500/20">Audit Scientifique OK</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Données Sources', val: 'ADEME / GIEC', icon: <BookOpen size={16} /> },
              { label: 'Audit', val: 'Semestriel', icon: <Zap size={16} /> },
              { label: 'Marge Erreur', val: '< 2%', icon: <Scaling size={16} /> },
              { label: 'Algorithme', val: 'Linéaire Proxy', icon: <Sparkles size={16} /> },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm p-6 rounded-[2rem] border border-white/5 flex flex-col gap-3 shadow-sm group hover:border-sky-400/30 transition-all">
                <div className="text-sky-400 transition-transform group-hover:scale-110">{item.icon}</div>
                <div className="space-y-1">
                  <div className="text-[9px] font-black uppercase text-white/30 tracking-widest">{item.label}</div>
                  <div className="text-sm font-bold text-sky-100">{item.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Process Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        {[
          { icon: <MapPin className="text-sky-400" />, title: "Collecte Terrain", desc: "Données GPS et volumes saisis via l'App" },
          { icon: <Zap className="text-amber-400" />, title: "Calcul Instantané", desc: "Application des coefficients scientifiques" },
          { icon: <ShieldCheck className="text-emerald-400" />, title: "Impact Certifié", desc: "Visualisation immédiate de l'impact réel" },
        ].map((step, i) => (
          <div key={i} className="group flex flex-col items-center text-center space-y-6 p-10 rounded-[2.5rem] bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-500">
            <div className="w-20 h-20 rounded-[2rem] bg-white/5 shadow-inner flex items-center justify-center transition-transform group-hover:scale-110 duration-700">
              {step.icon}
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs">{step.title}</h3>
              <p className="text-sm text-sky-100/30 font-medium leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="grid gap-10 xl:grid-cols-2">
        {/* EAU SAVED */}
        <MethodologyCard 
          title={t("cards.water.title")}
          formula={t("cards.water.formula", { val: factors.waterLitersPerCigaretteButt })}
          description={t("cards.water.desc", { val: factors.waterLitersPerCigaretteButt })}
          source={t("cards.water.source", { src: sources.water })}
          color="sky"
          icon={<BookOpen size={24} />}
        />

        {/* CO2 AVOIDED */}
        <MethodologyCard 
          title={t("cards.co2.title")}
          formula={t("cards.co2.formula", { val: factors.co2KgPerWasteKg })}
          description={t("cards.co2.desc")}
          source={t("cards.co2.source", { src: sources.co2 })}
          color="emerald"
          icon={<Scaling size={24} />}
        />

        {/* SURFACE CLEANED */}
        <MethodologyCard 
          title={t("cards.surface.title")}
          formula={t("cards.surface.formula", { valkg: factors.surfaceM2PerWasteKg, valmin: factors.surfaceM2PerVolunteerMinute })}
          description={t("cards.surface.desc")}
          source={t("cards.surface.source", { src: sources.surface })}
          color="slate"
          icon={<Info size={24} />}
        />

        {/* MAP POLLUTION SCORE */}
        <MethodologyCard 
          title={t("cards.map.title")}
          formula={t("cards.map.formula")}
          description={t("cards.map.desc")}
          source={t("cards.map.source")}
          color="rose"
          icon={<Scaling size={24} />}
        />
      </section>

      {/* Audit Report Section */}
      <div className="bg-sky-500/10 rounded-[3rem] p-12 border border-sky-400/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <ShieldCheck size={200} className="text-sky-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-4 justify-center md:justify-start">
              <ShieldCheck className="text-sky-400" />
              {t("audit.title")}
            </h2>
            <p className="text-sky-100/60 max-w-xl font-medium leading-relaxed">
              {t("audit.desc")}
            </p>
          </div>
          <a 
            href="/docs/impact_IA_CleanMyMap.pdf" 
            target="_blank"
            className="px-10 py-5 bg-sky-500 hover:bg-sky-400 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center gap-3 transition-all shadow-xl shadow-sky-500/20 group-hover:scale-105"
          >
            <Download size={16} />
            {t("audit.cta")}
          </a>
        </div>
      </div>

      <footer className="pt-20 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-10">
        <div className="space-y-3 text-center sm:text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-sky-400/60">CleanMyMap Engine v{version}</p>
          <p className="text-xs font-bold text-white/30 leading-relaxed max-w-md">Tous les calculs sont open-source et vérifiables par les autorités locales et partenaires scientifiques.</p>
        </div>
        <div 
          className="px-8 py-4 bg-white/5 backdrop-blur-sm border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-sky-100/40 text-center shadow-sm" 
          dangerouslySetInnerHTML={{ __html: t("footer.partner") }}
        />
      </footer>
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
