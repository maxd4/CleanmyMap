import Link from "next/link";
import type { OperationalPriority } from "@/lib/pilotage/prioritization";

type OperationalPrioritiesPanelProps = {
  title?: string;
  priorities: OperationalPriority[];
};

function severityClass(severity: OperationalPriority["severity"]): string {
  if (severity === "critical")
    return "border-rose-200 bg-rose-50 text-rose-800";
  if (severity === "high") return "border-amber-200 bg-amber-50 text-amber-800";
  if (severity === "medium")
    return "border-slate-300 bg-slate-50 text-slate-800";
  return "border-slate-200 bg-white text-slate-700";
}

export function OperationalPrioritiesPanel({
  title = "Priorites operationnelles automatiques",
  priorities,
}: OperationalPrioritiesPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3">
        {priorities.map((priority, index) => (
          <article
            key={priority.id}
            className={`rounded-lg border p-3 ${severityClass(priority.severity)}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {index + 1}. {priority.title}
              </p>
              <span className="rounded-full border border-current px-2 py-0.5 text-xs font-semibold uppercase">
                {priority.severity}
              </span>
            </div>
            <p className="mt-1 text-xs">
              Score priorite: {priority.score.toFixed(1)}
            </p>
            <p className="mt-1 text-sm">{priority.reason}</p>
            <p className="mt-1 text-xs">
              <span className="font-semibold">Impact estime:</span>{" "}
              {priority.impactEstimate}
            </p>
            <p className="mt-1 text-xs">
              <span className="font-semibold">Owner suggere:</span>{" "}
              {priority.suggestedOwner}
            </p>
            <ul className="mt-1 list-disc pl-5 text-xs">
              {priority.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link
              href={priority.recommendedAction.href}
              className="mt-2 inline-flex text-xs font-semibold underline"
            >
              {priority.recommendedAction.label}
            </Link>
          </article>
        ))}
        {priorities.length === 0 ? (
          <p className="text-sm text-slate-600">Aucune priorite detectee.</p>
        ) : null}
        {priorities.length > 0 && priorities.length < 3 ? (
          <p className="text-xs text-amber-700">
            Moins de 3 priorites exploitables: donnees insuffisantes sur la
            fenetre.
          </p>
        ) : null}
      </div>
    </section>
  );
}
