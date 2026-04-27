import type { MethodDefinition } from"@/lib/pilotage/overview";

type KpiMethodBlockProps = {
 title?: string;
 methods: MethodDefinition[];
};

export function KpiMethodBlock({
 title ="Methode KPI",
 methods,
}: KpiMethodBlockProps) {
 return (
 <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
 <h2 className="text-base font-semibold cmm-text-primary">{title}</h2>
 <div className="mt-3 space-y-3">
 {methods.map((method) => (
 <article
 key={method.id}
 className="rounded-lg border border-slate-200 bg-slate-50 p-3"
 >
 <p className="cmm-text-small font-semibold cmm-text-primary">{method.kpi}</p>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 <span className="font-semibold">Formule:</span> {method.formula}
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 <span className="font-semibold">Source:</span> {method.source}
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 <span className="font-semibold">Frequence:</span> {method.recalc}
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-muted">
 Limites: {method.limits}
 </p>
 </article>
 ))}
 </div>
 </section>
 );
}
