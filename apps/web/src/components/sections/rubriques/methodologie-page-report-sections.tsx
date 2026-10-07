import type { ReactNode } from "react";
import { BookOpen, Heart, Info, MapPin, Scaling, ShieldCheck, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type TFunction = (key: string, values?: Record<string, string | number>) => string;

type MethodologyColor = "red" | "slate";

type Methodology = {
  formulas: Record<string, string>;
};

type Sources = Record<string, string>;

type MethodologyCardProps = {
  title: string;
  formula: string;
  description: string;
  source: string;
  color: MethodologyColor;
  icon: ReactNode;
};

function MethodologyCard({ title, formula, description, source, color, icon }: MethodologyCardProps) {
  const tone = {
    red: { text: "text-red-400", border: "border-red-400/20", surface: "bg-red-400/5", dot: "bg-red-400" },
    slate: { text: "text-slate-400", border: "border-slate-400/20", surface: "bg-slate-400/5", dot: "bg-slate-400" },
  }[color];

  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-rose-100 bg-white p-8 space-y-8 shadow-[0_18px_44px_-32px_rgba(190,24,93,0.28)] transition-all duration-700 hover:border-rose-200 hover:shadow-[0_22px_48px_-30px_rgba(190,24,93,0.34)]">
      <div className={cn("relative z-10 flex items-center gap-5", tone.text)}>
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-transform duration-700 group-hover:scale-110", tone.surface)}>{icon}</div>
        <h2 className="text-3xl font-black tracking-tight text-slate-950">{title}</h2>
      </div>
      <div className={cn("relative z-10 rounded-2xl border-l-4 bg-rose-50/70 p-6 font-mono text-sm shadow-inner", tone.border)}>
        <div className="mb-3 cmm-text-caption font-black uppercase tracking-[0.2em] text-rose-700/70">Formule du proxy</div>
        <div className="text-slate-800 leading-relaxed">{formula}</div>
      </div>
      <p className="cmm-text-body relative z-10 font-medium">{description}</p>
      <div className="relative z-10 flex items-center gap-3 pt-6">
        <div className={cn("h-2 w-2 rounded-full", tone.dot)} />
        <span className="cmm-text-caption font-black uppercase tracking-widest text-slate-500">Source : {source}</span>
      </div>
    </div>
  );
}

type ReportCardsProps = {
  isFrench: boolean;
  methodology: Methodology;
  sources: Sources;
  t: TFunction;
};

export function MethodologieReportCards({ isFrench, methodology, sources, t }: ReportCardsProps) {
  const cards: MethodologyCardProps[] = [
    { title: t("cards.waste.title"), formula: methodology.formulas.wasteKg, description: t("cards.waste.desc"), source: t("cards.waste.source"), color: "red", icon: <Trash2 size={24} /> },
    { title: t("cards.butts.title"), formula: methodology.formulas.butts, description: t("cards.butts.desc"), source: t("cards.butts.source"), color: "red", icon: <BookOpen size={24} /> },
    { title: t("cards.volunteers.title"), formula: methodology.formulas.volunteers, description: t("cards.volunteers.desc"), source: t("cards.volunteers.source"), color: "slate", icon: <Heart size={24} /> },
    { title: t("cards.water.title"), formula: methodology.formulas.water, description: t("cards.water.desc"), source: t("cards.water.source", { src: sources.water }), color: "red", icon: <BookOpen size={24} /> },
    { title: t("cards.co2.title"), formula: methodology.formulas.co2e, description: t("cards.co2.desc"), source: t("cards.co2.source", { src: sources.co2 }), color: "red", icon: <Scaling size={24} /> },
    { title: t("cards.surface.title"), formula: methodology.formulas.surface, description: t("cards.surface.desc"), source: t("cards.surface.source", { src: sources.surface }), color: "slate", icon: <Info size={24} /> },
    { title: t("cards.map.title"), formula: isFrench ? "Indice cartographique = calibration terrain (hors KPI impact canonique)" : "Map index = field calibration (outside canonical impact KPIs)", description: t("cards.map.desc"), source: t("cards.map.source"), color: "red", icon: <Scaling size={24} /> },
    { title: t("cards.roi.title"), formula: methodology.formulas.euro, description: t("cards.roi.desc"), source: t("cards.roi.source", { src: sources.roi }), color: "slate", icon: <Zap size={24} /> },
  ];

  return <section className="grid gap-10 xl:grid-cols-2">{cards.map((card) => <MethodologyCard key={card.title} {...card} />)}</section>;
}

export function MethodologieReportStepsSection({ isFrench }: { isFrench: boolean }) {
  const steps = [
    { icon: <MapPin className="text-red-400" />, title: "Données terrain", desc: "Coordonnées et volumes issus des déclarations" },
    { icon: <Zap className="text-red-400" />, title: "Calcul des proxys", desc: "Application des formules versionnées" },
    { icon: <ShieldCheck className="text-red-400" />, title: isFrench ? "Résultats et limites" : "Results and limits", desc: isFrench ? "Lecture des KPI et de leurs limites" : "Reading KPIs and their limits" },
  ];

  return <div className="grid grid-cols-1 gap-8 md:grid-cols-3">{steps.map((step) => <div key={step.title} className="group flex flex-col items-center space-y-6 rounded-[2rem] border border-rose-100 bg-white p-8 text-center shadow-[0_14px_34px_-28px_rgba(190,24,93,0.25)] transition-all duration-500 hover:border-rose-200"><div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-rose-50 shadow-inner transition-transform duration-700 group-hover:scale-110">{step.icon}</div><div className="space-y-2"><h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-950">{step.title}</h3><p className="cmm-text-small cmm-text-secondary font-medium">{step.desc}</p></div></div>)}</div>;
}

export function MethodologieFieldLimitsSection({ isFrench }: { isFrench: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-rose-100 bg-white p-8 shadow-[0_18px_44px_-32px_rgba(190,24,93,0.25)] md:p-10 space-y-6">
      <div className="flex items-center gap-4 text-red-400"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/5 shadow-inner"><Scaling size={20} /></div><h3 className="text-2xl font-black tracking-tight text-slate-950">{isFrench ? "Limites de la déclaration terrain" : "Limits of field declarations"}</h3></div>
      <div className="cmm-text-body grid gap-6 font-medium md:grid-cols-2">
        <p>{isFrench ? "Les déclarations terrain ne requièrent pas la pesée ni la caractérisation exhaustive de chaque déchet. Les valeurs disponibles dépendent donc des informations saisies dans le contrat de déclaration." : "Field declarations do not require weighing or exhaustively categorizing every item. Available values therefore depend on the information entered in the declaration contract."}</p>
        <p>{isFrench ? "Les indicateurs concernés restent des proxys versionnés : ils donnent un ordre de grandeur reproductible, mais ne constituent ni une mesure instrumentale ni une certification scientifique." : "The affected indicators remain versioned proxies: they provide a reproducible order of magnitude, but are neither instrument measurements nor scientific certification."}</p>
      </div>
    </div>
  );
}
