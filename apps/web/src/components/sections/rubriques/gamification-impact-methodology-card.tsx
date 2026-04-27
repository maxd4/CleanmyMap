"use client";

type ImpactMethodology = {
 proxyVersion: string;
 qualityRulesVersion: string;
 scope: string;
 pollutionScoreAverage: number;
 formulas: Array<{
 id: string;
 label: string;
 formula: string;
 interpretation: string;
 }>;
 approximations: string[];
 hypotheses: string[];
 errorMargins: {
 waterSavedLitersPct: number;
 co2AvoidedKgPct: number;
 surfaceCleanedM2Pct: number;
 pollutionScoreMeanPoints: number;
 };
 sources?: Record<string, string>;
};

type Props = {
 methodology: ImpactMethodology;
};

export function GamificationImpactMethodologyCard({ methodology }: Props) {
 return (
 <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">Méthodologie</p>
 <p className="mt-1 cmm-text-small cmm-text-secondary">
 Proxy {methodology.proxyVersion} | Qualité {methodology.qualityRulesVersion}
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">{methodology.scope}</p>
 <p className="mt-2 cmm-text-small cmm-text-secondary">
 Score pollution moyen:{""}
 <span className="font-semibold cmm-text-primary">
 {methodology.pollutionScoreAverage.toFixed(1)}/100
 </span>
 </p>

 <div className="mt-3 grid gap-3 md:grid-cols-2">
 <div>
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Formules
 </p>
 <ul className="mt-2 space-y-2 cmm-text-caption cmm-text-secondary">
 {methodology.formulas.map((item) => (
 <li key={item.id} className="rounded border border-slate-200 bg-white p-2">
 <p className="font-semibold cmm-text-primary">{item.label}</p>
 <p className="mt-1 font-mono cmm-text-caption cmm-text-secondary">{item.formula}</p>
 <p className="mt-1 cmm-text-secondary">{item.interpretation}</p>
 </li>
 ))}
 </ul>
 </div>

 <div className="space-y-3">
 <div>
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Approximations
 </p>
 <ul className="mt-2 list-disc space-y-1 pl-4 cmm-text-caption cmm-text-secondary">
 {methodology.approximations.map((item) => (
 <li key={item}>{item}</li>
 ))}
 </ul>
 </div>
 <div>
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Hypotheses
 </p>
 <ul className="mt-2 list-disc space-y-1 pl-4 cmm-text-caption cmm-text-secondary">
 {methodology.hypotheses.map((item) => (
 <li key={item}>{item}</li>
 ))}
 </ul>
 </div>
 <div>
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Marges d&apos;erreur indicatives
 </p>
 <ul className="mt-2 list-disc space-y-1 pl-4 cmm-text-caption cmm-text-secondary">
 <li>Eau sauvée: +/- {methodology.errorMargins.waterSavedLitersPct}%</li>
 <li>CO2 évité: +/- {methodology.errorMargins.co2AvoidedKgPct}%</li>
 <li>Surface nettoyée: +/- {methodology.errorMargins.surfaceCleanedM2Pct}%</li>
 <li>
 Score pollution moyen: +/-{""}
 {methodology.errorMargins.pollutionScoreMeanPoints} points
 </li>
 </ul>
 </div>

 {methodology.sources && (
 <div className="rounded border border-emerald-200 bg-emerald-50 p-2">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide text-emerald-800">
 Sources Scientifiques
 </p>
 <ul className="mt-1 space-y-1 cmm-text-caption text-emerald-900 leading-tight">
 {Object.entries(methodology.sources).map(([key, value]) => (
 <li key={key} className="italic">• {value}</li>
 ))}
 </ul>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
