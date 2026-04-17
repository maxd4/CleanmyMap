import Link from "next/link";

type HeaderAction = {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
};

type DecisionPageHeaderProps = {
  context: string;
  title: string;
  objective: string;
  actions?: HeaderAction[];
};

export function DecisionPageHeader({
  context,
  title,
  objective,
  actions = [],
}: DecisionPageHeaderProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Pourquoi
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
        {context}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{objective}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
          Agir
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
          Analyser
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
          Tracer
        </span>
      </div>

      {actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className={`inline-flex rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                action.tone === "primary"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
