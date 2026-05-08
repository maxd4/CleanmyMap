"use client";

import type { ReactNode } from "react";
import { CmmPageShell } from "@/components/ui/cmm-card";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";

type TemplateAction = {
 href: string;
 label: string;
 tone?: "primary" | "secondary";
};

type PageReadingTemplateProps = {
 context?: string;
 title: string;
 objective: string;
 summary?: ReactNode;
 primaryAction: TemplateAction;
 secondaryAction?: TemplateAction;
 analysis: ReactNode;
 trace?: ReactNode;
};

function ContextLabel({ children }: { children: ReactNode }) {
 return (
  <p className="mt-1 cmm-text-caption font-semibold uppercase tracking-[0.14em] text-emerald-700 [data-display-mode='minimaliste']_&:cmm-text-primary">
   {children}
  </p>
 );
}

export function PageReadingTemplate(props: PageReadingTemplateProps) {
 return (
  <CmmPageShell className="space-y-8" data-rubrique-report-root>
   {/* Analysis */}
   <section className="space-y-4">
    <div className="space-y-4">{props.analysis}</div>
   </section>

   {/* Header */}
   <header className="border-t border-[color:var(--border-default)] pt-5">
    {props.context && <ContextLabel>{props.context}</ContextLabel>}
    <h1 className="mt-1 text-2xl font-semibold cmm-text-primary">
     {props.title}
    </h1>
    <p className="mt-2 cmm-text-small cmm-text-secondary">{props.objective}</p>
   </header>

   {/* Actions */}
   <section className="border-t border-[color:var(--border-default)] pt-6">
    <CmmButtonGroup>
     <CmmButton href={props.primaryAction.href} tone="primary" variant="default">
      {props.primaryAction.label}
     </CmmButton>
     {props.secondaryAction ? (
      <CmmButton href={props.secondaryAction.href} tone="secondary">
       {props.secondaryAction.label}
      </CmmButton>
     ) : null}
    </CmmButtonGroup>
   </section>
  </CmmPageShell>
 );
}
