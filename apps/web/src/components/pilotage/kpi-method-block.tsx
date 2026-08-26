"use client";

import {
  AlertCircle,
  ChevronDown,
  Database,
  FileText,
  RefreshCw,
} from "lucide-react";
import { useId } from "react";
import type { MethodDefinition } from "@/lib/pilotage/overview.types";

type KpiMethodBlockProps = {
  title?: string;
  methods?: MethodDefinition[];
  method?: MethodDefinition;
};

type MethodDetailProps = {
  icon: typeof Database;
  label: string;
  value: string;
};

function MethodDetail({ icon: Icon, label, value }: MethodDetailProps) {
  return (
    <div className="space-y-1.5">
      <dt className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-red-700">
        <Icon size={14} aria-hidden="true" />
        {label}
      </dt>
      <dd className="text-sm leading-6 text-slate-700">{value}</dd>
    </div>
  );
}

export function KpiMethodBlock({
  title = "Référentiel méthodologique",
  methods: methodsProp,
  method,
}: KpiMethodBlockProps) {
  const methods = methodsProp ?? (method ? [method] : []);
  const titleId = useId();

  return (
    <section className="space-y-5" aria-labelledby={titleId}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-700">
            <FileText size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 id={titleId} className="cmm-text-h3 text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Formule visible; source, recalcul et limites dans chaque détail.
            </p>
          </div>
        </div>
        {methods.length > 0 ? (
          <span className="w-fit rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
            {methods.length} méthode{methods.length > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {methods.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {methods.map((method, index) => (
            <details
              key={method.id}
              className="group rounded-2xl border border-slate-200 bg-white/90 shadow-sm transition-colors hover:border-red-200 open:border-red-200"
            >
              <summary className="flex cursor-pointer list-none items-start gap-3 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 [&::-webkit-details-marker]:hidden">
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 text-xs font-bold tabular-nums text-red-700"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-slate-950">{method.kpi}</span>
                  <span className="mt-1 block font-mono text-xs leading-5 text-slate-600">
                    {method.formula}
                  </span>
                </span>
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-red-700 transition-transform group-open:rotate-180"
                />
              </summary>

              <dl className="grid gap-4 border-t border-slate-100 px-4 pb-4 pt-4 sm:grid-cols-3">
                <MethodDetail icon={Database} label="Source" value={method.source} />
                <MethodDetail icon={RefreshCw} label="Recalcul" value={method.recalc} />
                <MethodDetail icon={AlertCircle} label="Limites" value={method.limits} />
              </dl>
            </details>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600">
          Aucune définition méthodologique n&apos;est disponible pour cette vue.
        </p>
      )}
    </section>
  );
}
