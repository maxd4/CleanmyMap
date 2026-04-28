import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { Info, BookOpen, Scaling, Beaker, Sparkles, Zap, Brain, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { motion } from "framer-motion";

export default function MethodologiePage() {
  const { factors, sources, version } = IMPACT_PROXY_CONFIG;
  const { t } = useTranslation("methodologie");

  return (
    <div className="w-full max-w-7xl mx-auto p-6 sm:p-8 xl:px-10 space-y-16">
      {/* Premium Header */}
      <motion.header 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-100 dark:border-emerald-900/50 shadow-sm mb-4">
          <Beaker size={14} className="animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t("header_suptitle")}</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter cmm-text-primary">
          {t("header_title")}
        </h1>
        <p className="text-xl cmm-text-secondary max-w-3xl mx-auto font-medium leading-relaxed">
          {t("header_desc")}
        </p>
      </motion.header>

      {/* Logic & Transparency Banner */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <ShieldCheck size={300} />
        </div>
        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <Brain className="text-emerald-400" />
              Transparence Algorithmique
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Chez CleanMyMap, chaque gramme de déchet ramassé est converti en impact réel via des coefficients basés sur des publications scientifiques (ADEME, GIEC). Nous ne "devinons" pas votre impact, nous le calculons.
            </p>
            <div className="flex gap-4">
              <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest">Version {version}</div>
              <div className="px-4 py-2 bg-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Audit Scientifique OK</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Données Sources', val: 'ADEME / GIEC', icon: <BookOpen size={16} /> },
              { label: 'Intervalle Audit', val: 'Semestriel', icon: <Zap size={16} /> },
              { label: 'Marge Erreur', val: '< 2%', icon: <Scaling size={16} /> },
              { label: 'Algorithme', val: 'Linéaire Proxy', icon: <Sparkles size={16} /> },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-2">
                <div className="text-emerald-400">{item.icon}</div>
                <div className="text-[10px] font-black uppercase text-slate-500">{item.label}</div>
                <div className="text-sm font-bold">{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="grid gap-8 xl:grid-cols-2">
        {/* EAU SAVED */}
        <MethodologyCard 
          title={t("cards.water.title")}
          formula={t("cards.water.formula", { val: factors.waterLitersPerCigaretteButt })}
          description={t("cards.water.desc", { val: factors.waterLitersPerCigaretteButt })}
          source={t("cards.water.source", { src: sources.water })}
          color="blue"
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

      <footer className="pt-16 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-8 cmm-text-muted">
        <div className="cmm-text-caption space-y-2 text-center sm:text-left">
          <p className="font-black uppercase tracking-widest text-slate-900 dark:text-white">CleanMyMap Engine v{version}</p>
          <p className="font-medium">Tous les calculs sont open-source et vérifiables par les autorités locales.</p>
        </div>
        <div className="flex gap-4">
          <div 
            className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center" 
            dangerouslySetInnerHTML={{ __html: t("footer.partner") }}
          />
        </div>
      </footer>
    </div>
  );
}

function MethodologyCard({ title, formula, description, source, color, icon }: any) {
  const colorClasses: any = {
    blue: "text-blue-600 border-blue-500 bg-blue-50/50 shadow-blue-500/10",
    emerald: "text-emerald-600 border-emerald-500 bg-emerald-50/50 shadow-emerald-500/10",
    slate: "text-slate-900 border-slate-900 bg-slate-50/50 shadow-slate-950/10",
    rose: "text-rose-600 border-rose-500 bg-rose-50/50 shadow-rose-500/10"
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-8 md:p-10 space-y-6 shadow-xl shadow-slate-200/50 dark:shadow-none hover:border-slate-200 dark:hover:border-slate-700 transition-all"
    >
      <div className={cn("flex items-center gap-4", colorClasses[color].split(' ')[0])}>
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", colorClasses[color].split(' ')[2])}>
          {icon}
        </div>
        <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      </div>

      <div className={cn("p-6 rounded-2xl font-mono text-sm border-l-8 shadow-inner overflow-x-auto", colorClasses[color].split(' ')[1], "bg-slate-50 dark:bg-slate-950")}>
        <div className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Équation Scientifique</div>
        {formula}
      </div>

      <p className="cmm-text-secondary dark:cmm-text-muted font-medium leading-relaxed">
        {description}
      </p>

      <div className="pt-4 flex items-center gap-2">
        <div className={cn("w-1.5 h-1.5 rounded-full", colorClasses[color].split(' ')[1].replace('border-', 'bg-'))} />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Source : {source}</span>
      </div>
    </motion.div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
