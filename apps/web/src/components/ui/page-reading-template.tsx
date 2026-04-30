"use client";

import type { ReactNode } from"react";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import { CmmPageShell } from"@/components/ui/cmm-card";
import { CmmButton, CmmButtonGroup } from"@/components/ui/cmm-button";

type TemplateAction = {
 href: string;
 label: string;
 tone?:"primary" |"secondary";
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
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 {children}
 </p>
 );
}

function ContextLabel({ children }: { children: ReactNode }) {
 return (
 <p className="mt-1 cmm-text-caption font-semibold uppercase tracking-[0.14em] text-emerald-700 [data-display-mode='minimaliste']_&:cmm-text-primary">
 {children}
 </p>
 );
}

export function PageReadingTemplate(props: PageReadingTemplateProps) {
 const { locale } = useSitePreferences();
 const isFrench = locale ==="fr";

 return (
 <CmmPageShell className="space-y-8" data-rubrique-report-root>
 {/* Header */}
 <header className="core-feature border-b border-[color:var(--border-default)] pb-6">
 <div className="[data-display-mode='minimaliste']_&:hidden">
 <SectionLabel>{isFrench ?"Pourquoi je suis ici" :"Why am I here"}</SectionLabel>
 </div>
 <ContextLabel>{props.context}</ContextLabel>
 <h1 className="mt-3 text-3xl font-semibold cmm-text-primary">
 {props.title}
 </h1>
 <p className="mt-2 cmm-text-small cmm-text-secondary font-medium">{props.objective}</p>
 </header>

 {/* Summary */}
 <section className="space-y-3 [data-display-mode='minimaliste']_&:hidden">
 <SectionLabel>{isFrench ?"Résumer" :"Summarize"}</SectionLabel>
 <div>{props.summary}</div>
 </section>

 {/* Actions */}
 <section className="core-feature border-b border-[color:var(--border-default)] pb-6">
 <div className="[data-display-mode='minimaliste']_&:hidden">
 <SectionLabel>{isFrench ?"Agir" :"Act"}</SectionLabel>
 </div>
 <CmmButtonGroup className="mt-3">
 <CmmButton
 href={props.primaryAction.href}
 tone="primary"
 variant={props.primaryAction.tone ==="primary" ?"default" :"default"}
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
 </section>

 {/* Analysis */}
 <section className="space-y-3">
 <SectionLabel>{isFrench ?"Analyser" :"Analyze"}</SectionLabel>
 <div className="space-y-4">{props.analysis}</div>
 </section>

 {/* Trace */}
 <section className="space-y-3">
 <SectionLabel>{isFrench ?"Tracer" :"Trace"}</SectionLabel>
 <div>{props.trace}</div>
 </section>
 </CmmPageShell>
 );
}
