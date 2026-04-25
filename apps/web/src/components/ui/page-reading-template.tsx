"use client";

import type { ReactNode } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmCard, CmmPageShell } from "@/components/ui/cmm-card";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";

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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
      {children}
    </p>
  );
}

function ContextLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 [data-display-mode='minimaliste']_&:text-slate-900">
      {children}
    </p>
  );
}

export function PageReadingTemplate(props: PageReadingTemplateProps) {
  const { locale } = useSitePreferences();
  const isFrench = locale === "fr";

  return (
    <CmmPageShell data-rubrique-report-root>
      {/* Header */}
      <CmmCard tone="slate" variant="elevated" size="lg" className="core-feature">
        <div className="[data-display-mode='minimaliste']_&:hidden">
          <SectionLabel>{isFrench ? "Pourquoi je suis ici" : "Why am I here"}</SectionLabel>
        </div>
        <ContextLabel>{props.context}</ContextLabel>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {props.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600 font-medium">{props.objective}</p>
      </CmmCard>

      {/* Summary */}
      <CmmCard tone="slate" className="[data-display-mode='minimaliste']_&:hidden">
        <SectionLabel>{isFrench ? "Résumer" : "Summarize"}</SectionLabel>
        <div className="mt-2">{props.summary}</div>
      </CmmCard>

      {/* Actions */}
      <CmmCard tone="emerald" className="core-feature">
        <div className="[data-display-mode='minimaliste']_&:hidden">
          <SectionLabel>{isFrench ? "Agir" : "Act"}</SectionLabel>
        </div>
        <CmmButtonGroup className="mt-2">
          <CmmButton
            href={props.primaryAction.href}
            tone="primary"
            variant={props.primaryAction.tone === "primary" ? "default" : "default"}
          >
            {props.primaryAction.label}
          </CmmButton>
          {props.secondaryAction ? (
            <CmmButton
              href={props.secondaryAction.href}
              tone="secondary"
            >
              {props.secondaryAction.label}
            </CmmButton>
          ) : null}
        </CmmButtonGroup>
      </CmmCard>

      {/* Analysis */}
      <CmmCard tone="sky">
        <SectionLabel>{isFrench ? "Analyser" : "Analyze"}</SectionLabel>
        <div className="mt-2 space-y-4">{props.analysis}</div>
      </CmmCard>

      {/* Trace */}
      <CmmCard tone="amber">
        <SectionLabel>{isFrench ? "Tracer" : "Trace"}</SectionLabel>
        <div className="mt-2">{props.trace}</div>
      </CmmCard>
    </CmmPageShell>
  );
}
