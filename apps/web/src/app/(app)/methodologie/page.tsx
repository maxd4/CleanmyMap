"use client";

import { IMPACT_PROXY_CONFIG } from "@/lib/gamification/impact-proxy-config";
import { Info, BookOpen, Scaling, Beaker } from "lucide-react";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function MethodologiePage() {
  const { factors, sources, version } = IMPACT_PROXY_CONFIG;
  const { t } = useTranslation("methodologie");

  return (
    <div className="w-full p-6 sm:p-8 xl:px-10 2xl:px-12 space-y-12">
      <header className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase tracking-widest text-xs">
          <Beaker size={14} />
          {t("header_suptitle")}
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
          {t("header_title")}
        </h1>
        <p className="text-lg text-slate-600">
          {t("header_desc")}
        </p>
      </header>

      <section className="grid gap-8 xl:grid-cols-2">
        {/* EAU SAVED */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-blue-600">
            <BookOpen size={24} />
            <h2 className="text-xl font-bold">{t("cards.water.title")}</h2>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl font-mono text-sm border-l-4 border-blue-500">
            {t("cards.water.formula", { val: factors.waterLitersPerCigaretteButt })}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed text-justify">
            {t("cards.water.desc", { val: factors.waterLitersPerCigaretteButt })}
          </p>
          <div className="pt-2 text-xs font-bold text-slate-400">
            {t("cards.water.source", { src: sources.water })}
          </div>
        </div>

        {/* CO2 AVOIDED */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-emerald-600">
            <Scaling size={24} />
            <h2 className="text-xl font-bold">{t("cards.co2.title")}</h2>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl font-mono text-sm border-l-4 border-emerald-500">
            {t("cards.co2.formula", { val: factors.co2KgPerWasteKg })}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed text-justify">
            {t("cards.co2.desc")}
          </p>
          <div className="pt-2 text-xs font-bold text-slate-400">
            {t("cards.co2.source", { src: sources.co2 })}
          </div>
        </div>

        {/* SURFACE CLEANED */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-slate-900">
            <Info size={24} />
            <h2 className="text-xl font-bold">{t("cards.surface.title")}</h2>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl font-mono text-sm border-l-4 border-slate-900">
            {t("cards.surface.formula", { valkg: factors.surfaceM2PerWasteKg, valmin: factors.surfaceM2PerVolunteerMinute })}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed text-justify">
            {t("cards.surface.desc")}
          </p>
          <div className="pt-2 text-xs font-bold text-slate-400">
            {t("cards.surface.source", { src: sources.surface })}
          </div>
        </div>

        {/* MAP POLLUTION SCORE */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-rose-600">
            <Scaling size={24} />
            <h2 className="text-xl font-bold">{t("cards.map.title")}</h2>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl font-mono text-sm border-l-4 border-rose-500">
            {t("cards.map.formula")}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed text-justify">
            {t("cards.map.desc")}
          </p>
          <div className="pt-2 text-xs font-bold text-slate-400">
            {t("cards.map.source")}
          </div>
        </div>

        {/* CITIES ROI */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 text-amber-600">
            <Scaling size={24} />
            <h2 className="text-xl font-bold">{t("cards.roi.title")}</h2>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl font-mono text-sm border-l-4 border-amber-500">
            {t("cards.roi.formula")}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed text-justify">
            {t("cards.roi.desc")}
          </p>
          <div className="pt-2 text-xs font-bold text-slate-400 font-mono italic">
            {t("cards.roi.source")}
          </div>
        </div>
      </section>

      <footer className="pt-12 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 text-slate-400">
        <div className="text-xs space-y-1">
          <p className="font-bold">{t("footer.version", { version })}</p>
          <p>{t("footer.copyright")}</p>
        </div>
        <div className="flex gap-4">
          <div 
            className="h-10 w-32 bg-slate-100 rounded-lg animate-pulse flex items-center justify-center text-[8px] font-bold text-center" 
            dangerouslySetInnerHTML={{ __html: t("footer.partner") }}
          />
        </div>
      </footer>
    </div>
  );
}
