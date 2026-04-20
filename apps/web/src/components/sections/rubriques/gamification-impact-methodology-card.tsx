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
      <p className="text-xs uppercase tracking-wide text-slate-500">Methodologie</p>
      <p className="mt-1 text-sm text-slate-700">
        Proxy {methodology.proxyVersion} | Qualite {methodology.qualityRulesVersion}
      </p>
      <p className="mt-1 text-xs text-slate-600">{methodology.scope}</p>
      <p className="mt-2 text-sm text-slate-700">
        Score pollution moyen:{" "}
        <span className="font-semibold text-slate-900">
          {methodology.pollutionScoreAverage.toFixed(1)}/100
        </span>
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Formules
          </p>
          <ul className="mt-2 space-y-2 text-xs text-slate-700">
            {methodology.formulas.map((item) => (
              <li key={item.id} className="rounded border border-slate-200 bg-white p-2">
                <p className="font-semibold text-slate-800">{item.label}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-700">{item.formula}</p>
                <p className="mt-1 text-slate-600">{item.interpretation}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Approximations
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
              {methodology.approximations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Hypotheses
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
              {methodology.hypotheses.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Marges d&apos;erreur indicatives
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
              <li>Eau sauvee: +/- {methodology.errorMargins.waterSavedLitersPct}%</li>
              <li>CO2 evite: +/- {methodology.errorMargins.co2AvoidedKgPct}%</li>
              <li>Surface nettoyee: +/- {methodology.errorMargins.surfaceCleanedM2Pct}%</li>
              <li>
                Score pollution moyen: +/-{" "}
                {methodology.errorMargins.pollutionScoreMeanPoints} points
              </li>
            </ul>
          </div>

          {methodology.sources && (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                Sources Scientifiques
              </p>
              <ul className="mt-1 space-y-1 text-[10px] text-emerald-900 leading-tight">
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

