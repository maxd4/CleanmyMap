import Link from "next/link";
import type { ReactNode } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type TemplateAction = {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
};

type PageReadingTemplateProps = {
  context: string;
  title: string;
  objective: string;
  summary: ReactNode;
  primaryAction: TemplateAction;
  secondaryAction?: TemplateAction;
  analysis: ReactNode;
  trace: ReactNode;
};

export function PageReadingTemplate(props: PageReadingTemplateProps) {
  const { locale } = useSitePreferences();
  const isFrench = locale === "fr";

  return (
    <div data-rubrique-report-root className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm core-feature">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 [data-display-mode='simplifie']_&:hidden">
          {isFrench ? "Pourquoi je suis ici" : "Why am I here"}
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 [data-display-mode='simplifie']_&:text-slate-900">
          {props.context}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {props.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600 font-medium">{props.objective}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm [data-display-mode='simplifie']_&:hidden">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {isFrench ? "Résumer" : "Summarize"}
        </p>
        <div className="mt-2">{props.summary}</div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm core-feature">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 [data-display-mode='simplifie']_&:hidden">
          {isFrench ? "Agir" : "Act"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href={props.primaryAction.href}
            className="inline-flex rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            {props.primaryAction.label}
          </Link>
          {props.secondaryAction ? (
            <Link
              href={props.secondaryAction.href}
              className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              {props.secondaryAction.label}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {isFrench ? "Analyser" : "Analyze"}
        </p>
        <div className="mt-2 space-y-4">{props.analysis}</div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {isFrench ? "Tracer" : "Trace"}
        </p>
        <div className="mt-2">{props.trace}</div>
      </section>
    </div>
  );
}
