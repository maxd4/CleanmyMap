import type { ReactNode } from "react";

type KpiComparisonCardProps = {
  label: ReactNode;
  value: string;
  previousValue?: string;
  deltaAbsolute?: string;
  deltaPercent?: string;
  interpretation?: "positive" | "negative" | "neutral";
  hint?: string;
};

function toneClass(
  interpretation: KpiComparisonCardProps["interpretation"],
): string {
  if (interpretation === "positive") {
    return "text-emerald-700";
  }
  if (interpretation === "negative") {
    return "text-rose-700";
  }
  return "text-slate-600";
}

export function KpiComparisonCard({
  label,
  value,
  previousValue,
  deltaAbsolute,
  deltaPercent,
  interpretation = "neutral",
  hint,
}: KpiComparisonCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      {previousValue ? (
        <p className="mt-1 text-xs text-slate-500">N-1: {previousValue}</p>
      ) : null}
      {deltaAbsolute || deltaPercent ? (
        <p
          className={`mt-1 text-xs font-semibold ${toneClass(interpretation)}`}
        >
          {deltaAbsolute ? `${deltaAbsolute}` : ""}
          {deltaAbsolute && deltaPercent ? " | " : ""}
          {deltaPercent ? `${deltaPercent}` : ""}
        </p>
      ) : null}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </article>
  );
}
