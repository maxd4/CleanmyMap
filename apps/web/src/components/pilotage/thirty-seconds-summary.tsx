import Link from "next/link";

type SummaryKpi = {
  label: string;
  value: string;
  previousValue: string;
  deltaAbsolute?: string;
  deltaPercent?: string;
  interpretation?: "positive" | "negative" | "neutral";
};

type ThirtySecondsSummaryProps = {
  kpis: readonly [SummaryKpi, SummaryKpi, SummaryKpi];
  alert?: {
    severity: "critical" | "high" | "medium" | "low";
    title: string;
    detail: string;
  };
  recommendedAction: { href: string; label: string };
  recommendedReason?: string;
};

function interpretationTone(value: SummaryKpi["interpretation"]): string {
  if (value === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (value === "negative") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function alertTone(
  value: NonNullable<ThirtySecondsSummaryProps["alert"]>["severity"],
): string {
  if (value === "critical") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  if (value === "high") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (value === "medium") {
    return "border-slate-300 bg-slate-50 text-slate-800";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

export function ThirtySecondsSummary({
  kpis,
  alert,
  recommendedAction,
  recommendedReason,
}: ThirtySecondsSummaryProps) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
        Resume decisionnel
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className="rounded-xl border border-emerald-200 bg-white px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {kpi.label}
              </p>
              <Link 
                href="/methodologie" 
                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 opacity-60 hover:opacity-100 transition"
                title="Consulter la méthodologie scientifique"
              >
                ⓘ INFO
              </Link>
            </div>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              N-1: {kpi.previousValue}
            </p>
            <div
              className={`mt-2 rounded-lg border px-2 py-1 text-xs font-semibold exhaustive-only ${interpretationTone(kpi.interpretation)}`}
            >
              <p>Delta abs: {kpi.deltaAbsolute ?? "n/a"}</p>
              <p>Delta %: {kpi.deltaPercent ?? "n/a"}</p>
            </div>
          </article>
        ))}
      </div>
      {alert ? (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 ${alertTone(alert.severity)}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide">
            Alerte prioritaire
          </p>
          <p className="mt-1 text-sm font-semibold">{alert.title}</p>
          <p className="mt-1 text-xs exhaustive-only">{alert.detail}</p>
        </div>
      ) : null}
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm text-slate-700">Action recommandee</p>
          {recommendedReason ? (
            <p className="text-xs text-slate-500 exhaustive-only">{recommendedReason}</p>
          ) : null}
        </div>
        <Link
          href={recommendedAction.href}
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          {recommendedAction.label}
        </Link>
      </div>
    </section>
  );
}
